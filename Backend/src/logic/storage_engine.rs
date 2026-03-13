use google_cloud_storage::client::{Client, ClientConfig};
use google_cloud_storage::http::objects::delete::DeleteObjectRequest;
use google_cloud_storage::http::objects::upload::{Media, UploadObjectRequest, UploadType};
use google_cloud_storage::sign::{SignedURLMethod, SignedURLOptions};
// Note: SignBy variants in 0.22.0 are: PrivateKey, SignByGrantAccount, or None (via Option)
// Do NOT use SignBy::DUMMY as it does not exist.
use anyhow::{anyhow, Result};
use std::time::Duration;
use tracing::{error, info, warn};

pub struct StorageEngine {
    client: Option<Client>,
    bucket_name: String,
}

impl StorageEngine {
    pub async fn new() -> Self {
        let bucket_name =
            std::env::var("GCS_BUCKET_NAME").unwrap_or_else(|_| "vidhyam-files".to_string());

        match ClientConfig::default().with_auth().await {
            Ok(config) => {
                info!(
                    "GCS StorageEngine initialized successfully for bucket: {}",
                    bucket_name
                );
                Self {
                    client: Some(Client::new(config)),
                    bucket_name,
                }
            }
            Err(e) => {
                warn!("[Storage Warning] GCS Authentication failed: {}. Cloud storage features will be unavailable.", e);
                Self {
                    client: None,
                    bucket_name,
                }
            }
        }
    }

    fn check_client(&self) -> Result<&Client> {
        self.client.as_ref().ok_or_else(|| {
            error!("GCS client access attempted but not initialized.");
            anyhow!("GCS client not initialized. Check your credentials.")
        })
    }

    /// Generates a signed URL for uploading a file directly to GCS from the client.
    /// Uses method PUT and expires in 1 hour.
    pub async fn generate_upload_url(
        &self,
        object_name: &str,
        content_type: &str,
    ) -> Result<String> {
        let client = self.check_client()?;
        let options = SignedURLOptions {
            method: SignedURLMethod::PUT,
            expires: Duration::from_secs(3600), // 1 hour
            content_type: Some(content_type.to_string()),
            ..Default::default()
        };

        // We pass None for sign_by to use the default signer from the authenticated client.
        // Valid variants for SignBy (if needed) are: SignBy::PrivateKey(vec![...])
        match client
            .signed_url(&self.bucket_name, object_name, None, None, options)
            .await
        {
            Ok(url) => Ok(url),
            Err(e) => {
                error!(
                    "Failed to generate GCS upload URL for {}: {}",
                    object_name, e
                );
                Err(anyhow!("Failed to generate upload URL: {}", e))
            }
        }
    }

    /// Generates a signed URL for viewing/downloading a private file.
    /// Uses method GET and expires in 1 hour.
    pub async fn generate_download_url(&self, object_name: &str) -> Result<String> {
        let client = self.check_client()?;
        let options = SignedURLOptions {
            method: SignedURLMethod::GET,
            expires: Duration::from_secs(3600), // 1 hour
            ..Default::default()
        };

        match client
            .signed_url(&self.bucket_name, object_name, None, None, options)
            .await
        {
            Ok(url) => Ok(url),
            Err(e) => {
                error!(
                    "Failed to generate GCS download URL for {}: {}",
                    object_name, e
                );
                Err(anyhow!("Failed to generate download URL: {}", e))
            }
        }
    }

    /// Deletes an object from GCS.
    pub async fn delete_file(&self, object_name: &str) -> Result<()> {
        let client = self.check_client()?;
        client
            .delete_object(&DeleteObjectRequest {
                bucket: self.bucket_name.clone(),
                object: object_name.to_string(),
                ..Default::default()
            })
            .await
            .map_err(|e| {
                error!("Failed to delete GCS object {}: {}", object_name, e);
                anyhow!("Failed to delete GCS file: {}", e)
            })?;

        info!("Successfully deleted GCS object: {}", object_name);
        Ok(())
    }

    /// Uploads raw bytes to GCS.
    pub async fn upload_bytes(
        &self,
        object_name: &str,
        content_type: &str,
        data: Vec<u8>,
    ) -> Result<()> {
        let client = self.check_client()?;
        let upload_type = UploadType::Simple(Media {
            name: object_name.to_string().into(),
            content_type: content_type.to_string().into(),
            content_length: Some(data.len() as u64),
        });

        client
            .upload_object(
                &UploadObjectRequest {
                    bucket: self.bucket_name.clone(),
                    ..Default::default()
                },
                data,
                &upload_type,
            )
            .await
            .map_err(|e| {
                error!("Failed to upload bytes to GCS {}: {}", object_name, e);
                anyhow!("Failed to upload bytes to GCS: {}", e)
            })?;

        info!("Successfully uploaded bytes to GCS: {}", object_name);
        Ok(())
    }

    /// Downloads raw bytes from GCS using a temporary signed URL.
    pub async fn download_bytes(&self, object_name: &str) -> Result<Vec<u8>> {
        let url = self.generate_download_url(object_name).await?;
        
        let response = reqwest::get(url).await.map_err(|e| {
            error!("Failed to fetch GCS object via signed URL: {}", e);
            anyhow!("Failed to fetch GCS object: {}", e)
        })?;

        if !response.status().is_success() {
            return Err(anyhow!("GCS download failed with status: {}", response.status()));
        }

        let bytes = response.bytes().await.map_err(|e| {
            error!("Failed to read GCS response bytes: {}", e);
            anyhow!("Failed to read GCS bytes: {}", e)
        })?;

        Ok(bytes.to_vec())
    }
}
