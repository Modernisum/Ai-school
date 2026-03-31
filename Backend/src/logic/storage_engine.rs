use anyhow::{anyhow, Result};
use std::path::{Path, PathBuf};
use tracing::{error, info};
use sha2::{Sha256, Digest};
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use futures_util::StreamExt;
use axum::extract::multipart::Field;
use image::GenericImageView;
use std::io::Cursor;

/// High-performance StorageEngine using content-addressed, hash-sharded storage.
///
/// File Path Structure:
///   uploads/{hash[0:2]}/{hash[2:4]}/{hash}.webp
///
/// This provides O(1) lookup at any scale:
/// - 256 × 256 = 65,536 filesystem buckets
/// - Even with 100M files, each bucket has ~1,500 files
/// - Hash = filename, so deduplication is implicit
pub struct StorageEngine {
    pub upload_dir: String,
    pub base_url: String,
}

impl StorageEngine {
    pub async fn new() -> Self {
        let upload_dir = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".to_string());
        // Force the base URL to 8080 to override any stale environment variables that might be set system-wide to 3000.
        let base_url = "http://localhost:8080".to_string();
        
        if let Err(e) = std::fs::create_dir_all(&upload_dir) {
            error!("Failed to create upload directory {}: {}", upload_dir, e);
        } else {
            info!("StorageEngine initialized: hash-sharded layout at '{}'", upload_dir);
        }

        Self { upload_dir, base_url }
    }

    /// Generates the O(1) hash-sharded path for a given content hash.
    /// e.g.: hash = "abcdef1234..." → "uploads/ab/cd/abcdef1234....webp"
    fn sharded_path(&self, hash: &str, extension: &str) -> (PathBuf, String) {
        let shard1 = &hash[0..2];
        let shard2 = &hash[2..4];
        let dir = Path::new(&self.upload_dir).join(shard1).join(shard2);
        let filename = format!("{}.{}", hash, extension);
        let full_path = dir.join(&filename);
        let relative_path = format!("uploads/{}/{}/{}", shard1, shard2, filename);
        (full_path, relative_path)
    }

    /// Generates a public URL for a given relative path
    pub fn get_public_url(&self, relative_path: &str) -> String {
        format!("/{}", relative_path.trim_start_matches('/'))
    }

    /// Process a multipart upload field.
    /// - Streams upload to disk, computing SHA-256 hash in flight.
    /// - If it's an image: resizes to ≤1080px and converts to JPEG (quality 80).
    /// - Files are stored at the hash-sharded path: `uploads/ab/cd/{hash}.jpg`
    /// - If the exact file already exists on disk (same hash), skips writing.
    /// - Enforces a strict 50MB upload size limit.
    ///
    /// Returns (file_hash, relative_path, public_url, file_size, content_type)
    pub async fn process_upload(&self, mut field: Field<'_>, _folder: &str) -> Result<(String, String, String, i64, String)> {
        let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
        let is_image = content_type.starts_with("image/") && !content_type.contains("svg");

        // Stream multipart chunks, compute hash, and buffer for potential image processing
        let mut hasher = Sha256::new();
        let mut file_data: Vec<u8> = Vec::new();
        let mut file_size: i64 = 0;
        const MAX_UPLOAD_BYTES: i64 = 50 * 1024 * 1024; // 50MB hard limit

        while let Some(chunk_result) = field.next().await {
            let chunk = chunk_result.map_err(|e| anyhow!("Failed to read multipart chunk: {}", e))?;
            hasher.update(&chunk);
            file_size += chunk.len() as i64;

            // Enforce 50MB limit during streaming
            if file_size > MAX_UPLOAD_BYTES {
                return Err(anyhow!("File size exceeds the 50MB limit. Please upload a smaller file."));
            }

            file_data.extend_from_slice(&chunk);
        }

        let hash = format!("{:x}", hasher.finalize());

        // --- Image path: Resize + Compress to JPEG (WhatsApp-style) ---
        if is_image && !file_data.is_empty() {
            let (sharded_full_path, relative_path) = self.sharded_path(&hash, "jpg");

            // If file already exists on disk (dedup hit), skip writing entirely
            if sharded_full_path.exists() {
                let actual_size = tokio::fs::metadata(&sharded_full_path).await.map(|m| m.len() as i64).unwrap_or(file_size);
                return Ok((hash, relative_path.clone(), self.get_public_url(&relative_path), actual_size, "image/jpeg".to_string()));
            }

            // Create the 2-level shard directory
            if let Some(parent) = sharded_full_path.parent() {
                tokio::fs::create_dir_all(parent).await?;
            }

            let data_for_processing = file_data.clone();
            let final_path = sharded_full_path.clone();

            // Compress on a blocking thread to avoid blocking the async runtime
            let (compressed_data, final_size) = tokio::task::spawn_blocking(move || -> Result<(Vec<u8>, i64)> {
                let img = image::load_from_memory(&data_for_processing)?;

                // Resize to max 1080px (WhatsApp standard)
                let (w, h) = img.dimensions();
                let img = if w > 1080 || h > 1080 {
                    img.resize(1080, 1080, image::imageops::FilterType::Lanczos3)
                } else {
                    img
                };

                // Encode as JPEG with quality 80 (best size/quality tradeoff)
                let mut output = Vec::new();
                let mut cursor = Cursor::new(&mut output);
                let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut cursor, 80);
                img.write_with_encoder(encoder)?;
                let size = output.len() as i64;
                Ok((output, size))
            }).await??;

            // Write compressed JPEG to the sharded path
            let mut file = File::create(&final_path).await?;
            file.write_all(&compressed_data).await?;
            file.flush().await?;

            return Ok((hash, relative_path.clone(), self.get_public_url(&relative_path), final_size, "image/jpeg".to_string()));
        }

        // --- Non-image path: Preserve original format ---
        let extension = match content_type.as_str() {
            "application/pdf" => "pdf",
            "video/mp4" => "mp4",
            "text/csv" => "csv",
            "text/plain" => "txt",
            _ => "bin",
        };

        let (sharded_full_path, relative_path) = self.sharded_path(&hash, extension);

        // Dedup: file already exists on disk
        if sharded_full_path.exists() {
            let actual_size = tokio::fs::metadata(&sharded_full_path).await.map(|m| m.len() as i64).unwrap_or(file_size);
            return Ok((hash, relative_path.clone(), self.get_public_url(&relative_path), actual_size, content_type));
        }

        if let Some(parent) = sharded_full_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        let mut file = File::create(&sharded_full_path).await?;
        file.write_all(&file_data).await?;
        file.flush().await?;

        Ok((hash, relative_path.clone(), self.get_public_url(&relative_path), file_size, content_type))
    }

    /// Deletes a local file by its relative path.
    pub async fn delete_file(&self, relative_path: &str) -> Result<()> {
        let local_path = Path::new(".").join(relative_path);
        if local_path.exists() {
            tokio::fs::remove_file(local_path).await.map_err(|e| anyhow!("Failed to delete: {}", e))?;
        }
        Ok(())
    }
}
