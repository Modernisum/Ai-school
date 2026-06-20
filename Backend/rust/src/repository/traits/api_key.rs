use async_trait::async_trait;
use crate::repository::traits::AppError;
use serde_json::Value;

#[async_trait]
pub trait ApiKeyRepository: Send + Sync {
    async fn generate_api_key(
        &self,
        school_id: &str,
        key_id: &str,
        key_hash: &str,
        name: &str,
        scopes: &[String],
    ) -> Result<(), AppError>;

    async fn list_api_keys(&self, school_id: &str) -> Result<Vec<Value>, AppError>;

    async fn revoke_api_key(&self, school_id: &str, key_id: &str) -> Result<(), AppError>;
}
