use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait SetupService: Send + Sync {
    async fn setup_school(&self, admin_id: &str, data: Value) -> AppResult<Value>;
}
