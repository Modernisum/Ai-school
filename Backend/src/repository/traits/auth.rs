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
    async fn add_user_activity_log(&self, phone: &str, user_type: &str, action: &str, metadata: Value) -> Result<(), AppError>;
    async fn change_password_tx(&self, school_id: &str, hashed_new: &str) -> Result<(), AppError>;
    async fn save_token_and_log(
        &self,
        token_id: &str,
        token_data: Value,
        school_id: &str,
    ) -> Result<(), AppError>;
    async fn logout_transaction(
        &self,
        token_id: &str,
        activity_phone: &str,
        activity_role: &str,
    ) -> Result<(), AppError>;
}
