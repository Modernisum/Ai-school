use async_trait::async_trait;
use serde_json::Value;

use super::AppError;

#[async_trait]
pub trait AuthRepository: Send + Sync {
    async fn create_school(&self, data: Value) -> Result<(), AppError>;
    async fn get_auth_by_id(&self, id: &str) -> Result<Option<Value>, AppError>;
    async fn update_auth(&self, id: &str, data: Value) -> Result<(), AppError>;
    async fn save_token(&self, token_id: &str, data: Value) -> Result<(), AppError>;
    async fn get_token(&self, token_id: &str) -> Result<Option<Value>, AppError>;
    async fn delete_token(&self, token_id: &str) -> Result<(), AppError>;
    async fn revoke_token(&self, token_id: &str) -> Result<(), AppError>;
    async fn cleanup_expired_tokens(&self) -> Result<usize, AppError>;
    async fn add_auth_log(&self, id: &str, action: &str, details: Value) -> Result<(), AppError>;
    async fn change_school_id(&self, old_id: &str, new_id: &str) -> Result<(), AppError>;
    async fn generate_school_code(&self) -> Result<String, AppError>;
}
