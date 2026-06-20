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

// ─── Security: Dangerous file signatures (magic bytes) ──────────────────────
/// These magic bytes indicate executables, scripts, or archive formats
/// that must NEVER be accepted regardless of extension or claimed MIME type.
const DANGEROUS_MAGIC_BYTES: [[u8; 4]; 14] = [
    [0x4d, 0x5a, 0x00, 0x00], // EXE (MZ header)
    [0x7f, 0x45, 0x4c, 0x46], // ELF (Linux executable)
    [0xca, 0xfe, 0xba, 0xbe], // Mach-O / Java class
    [0xbe, 0xba, 0xfe, 0xca], // Mach-O (reversed)
    [0x43, 0x44, 0x30, 0x30], // ISO (CD001)
    [0x50, 0x4b, 0x03, 0x04], // ZIP / DOCX / XLSX
    [0x52, 0x61, 0x72, 0x21], // RAR
    [0x1f, 0x8b, 0x08, 0x00], // GZIP
    [0x42, 0x5a, 0x68, 0x39], // BZIP2
    [0xfd, 0x37, 0x7a, 0x28], // XZ
    [0x04, 0x22, 0x4d, 0x18], // LZ4
    [0x28, 0xb5, 0x2f, 0xfd], // Zstandard
    [0xd0, 0xcf, 0x11, 0xe0], // OLE2 / old Word/Excel (potential macro)
    [0x00, 0x00, 0x00, 0x00], // Mach-O universal (all zeros start)
];

// ─── Security: Allowed content-type → extension mapping ─────────────────────
const ALLOWED_TYPES: [(&str, &str); 12] = [
    ("image/jpeg",                  "jpg"),
    ("image/png",                   "png"),
    ("image/webp",                  "webp"),
    ("image/gif",                   "gif"),
    ("image/svg+xml",               "svg"),
    ("image/bmp",                   "bmp"),
    ("image/tiff",                  "tiff"),
    ("image/x-icon",                "ico"),
    ("application/pdf",             "pdf"),
    ("video/mp4",                   "mp4"),
    ("text/csv",                    "csv"),
    ("text/plain",                  "txt"),
];

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

    /// Sanitizes a filename to prevent path traversal, null bytes, and special character attacks.
    fn sanitize_filename(original: &str) -> String {
        // Remove any path components (prevent ../../../etc/passwd style attacks)
        let filename = Path::new(original)
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or("unnamed_file");

        // Remove null bytes and other control characters
        let filename = filename.chars()
            .filter(|c| !c.is_control())
            .collect::<String>();

        // Remove potentially dangerous characters but keep unicode letters, numbers, dash, underscore, dot
        let filename = filename.chars()
            .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' || c == ' ' {
                c
            } else {
                '_'
            })
            .collect::<String>();

        // Prevent hidden files
        let filename = filename.trim_start_matches('.').to_string();

        // Prevent empty filename or just dots
        if filename.is_empty() || filename.chars().all(|c| c == '.') {
            return "unnamed_file".to_string();
        }

        // Maximum filename length to prevent filesystem issues
        if filename.len() > 200 {
            return filename.chars().take(200).collect();
        }

        filename
    }

    /// Validates that the file's magic bytes match an allowed image/media type.
    /// This prevents extension spoofing (e.g., renaming malware.exe to cute_cat.jpg).
    fn validate_by_magic_bytes(file_data: &[u8], claimed_content_type: &str) -> Result<()> {
        // Check for dangerous binary signatures first (hard block regardless of extension)
        let len = file_data.len();
        if len >= 4 {
            let prefix_4 = &file_data[0..4];
            let prefix_8 = if len >= 8 { &file_data[0..8] } else { &file_data[0..std::cmp::min(8, len)] };

            // Check against known dangerous magic bytes
            for dangerous in DANGEROUS_MAGIC_BYTES.iter() {
                if prefix_4.starts_with(dangerous) {
                    return Err(anyhow!(
                        "SECURITY_ERR: File has a dangerous binary signature (executable/archive detected). Upload denied."
                    ));
                }
            }

            // ZIP-based formats (DOCX, XLSX, PPTX, APK) — block unless explicitly allowed
            if prefix_4 == [0x50, 0x4b, 0x03, 0x04] {
                return Err(anyhow!(
                    "SECURITY_ERR: ZIP archives and Office documents with macros are not allowed. Only image files accepted."
                ));
            }

            // OLE2 (old Office documents with potential macros)
            if prefix_8 == [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] {
                return Err(anyhow!(
                    "SECURITY_ERR: OLE2 compound documents are not allowed."
                ));
            }
        }

        // Additional check: if it's an SVG, verify it doesn't contain embedded scripts
        if claimed_content_type == "image/svg+xml" || (len >= 5 && &file_data[0..5] == b"<?xml" || &file_data[0..4] == b"<svg") {
            let as_str = String::from_utf8_lossy(file_data);
            let dangerous_patterns = [
                "<script", "javascript:", "onerror=", "onload=", "onclick=",
                "onmouseover=", "onfocus=", "onblur=", "onchange=",
                "<iframe", "<object", "<embed", "<form", "eval(",
                "expression(", "alert(", "document.cookie", "window.location",
                "external.", "ActiveXObject", "VBArray",
            ];
            for pattern in dangerous_patterns.iter() {
                if as_str.to_lowercase().contains(&pattern.to_lowercase()) {
                    return Err(anyhow!(
                        "SECURITY_ERR: SVG contains potentially dangerous embedded content ({}). Upload denied.",
                        pattern
                    ));
                }
            }
        }

        // Verify image files are actually images by checking magic bytes
        if claimed_content_type.starts_with("image/") {
            match claimed_content_type {
                "image/jpeg" => {
                    if !(len >= 3 && file_data[0] == 0xFF && file_data[1] == 0xD8 && file_data[2] == 0xFF) {
                        return Err(anyhow!(
                            "SECURITY_ERR: File is not a valid JPEG image. Magic byte mismatch."
                        ));
                    }
                }
                "image/png" => {
                    if !(len >= 8 && &file_data[0..8] == [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
                        return Err(anyhow!(
                            "SECURITY_ERR: File is not a valid PNG image. Magic byte mismatch."
                        ));
                    }
                }
                "image/gif" => {
                    if !(len >= 6 && (&file_data[0..3] == b"GIF87a" || &file_data[0..3] == b"GIF89a")) {
                        return Err(anyhow!(
                            "SECURITY_ERR: File is not a valid GIF image. Magic byte mismatch."
                        ));
                    }
                }
                "image/webp" => {
                    // WebP: RIFF header + WEBP
                    if !(len >= 12 && &file_data[0..4] == b"RIFF" && &file_data[8..12] == b"WEBP") {
                        return Err(anyhow!(
                            "SECURITY_ERR: File is not a valid WebP image. Magic byte mismatch."
                        ));
                    }
                }
                "image/bmp" => {
                    if !(len >= 2 && &file_data[0..2] == b"BM") {
                        return Err(anyhow!(
                            "SECURITY_ERR: File is not a valid BMP image. Magic byte mismatch."
                        ));
                    }
                }
                "image/svg+xml" => {
                    // SVG is text-based, already checked for XSS above
                }
                "image/tiff" => {
                    if len >= 4 {
                        let is_tiff = (&file_data[0..4] == [0x49, 0x49, 0x2A, 0x00]) || // Little-endian
                                      (&file_data[0..4] == [0x4D, 0x4D, 0x00, 0x2A]);   // Big-endian
                        if !is_tiff {
                            return Err(anyhow!(
                                "SECURITY_ERR: File is not a valid TIFF image. Magic byte mismatch."
                            ));
                        }
                    }
                }
                _ => {}
            }
        }

        Ok(())
    }

    /// Generates the O(1) hash-sharded path for a given content hash.
    /// e.g.: hash = "abcdef1234..." → "uploads/ab/cd/{hash}.jpg"
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
    /// - If the exact file already exists on disk (same hash), skips writing entirely.
    /// - Enforces a strict 50MB upload size limit.
    /// - SECURITY: Validates magic bytes, blocks executables/archives, sanitizes filenames.
    ///
    /// Returns (file_hash, relative_path, public_url, file_size, content_type)
    pub async fn process_upload(&self, mut field: Field<'_>, _folder: &str) -> Result<(String, String, String, i64, String)> {
        let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();

        // ─── Security: Validate content type against allowed list ──────────
        let allowed_ext = ALLOWED_TYPES.iter()
            .find(|(ct, _)| *ct == content_type)
            .map(|(_, ext)| *ext);

        // Let image types through for now (they'll get magic-validated below)
        let is_image = content_type.starts_with("image/") && !content_type.contains("svg");
        let is_allowed_type = allowed_ext.is_some();

        if !is_image && !is_allowed_type {
            return Err(anyhow!(
                "File type '{}' is not allowed. Only images (JPG, PNG, WebP, GIF, SVG), PDF, MP4, CSV, and TXT are permitted.",
                content_type
            ));
        }

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

        // ─── Security: Magic byte validation ───────────────────────────────
        if let Err(e) = StorageEngine::validate_by_magic_bytes(&file_data, &content_type) {
            return Err(e);
        }

        // ─── Image path: Resize + Compress to JPEG (WhatsApp-style) ─────────
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

        // ─── Non-image path: Preserve original format ──────────────────────
        let extension = match content_type.as_str() {
            "application/pdf" => "pdf",
            "video/mp4" => "mp4",
            "text/csv" => "csv",
            "text/plain" => "txt",
            _ => "bin",  // Should never reach here due to allowlist above, but safety fallback
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

