use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait GlobalUserRepository: Send + Sync {
    async fn sync_user(&self, data: Value) -> Result<(), AppError>;
    async fn find_by_identifier(&self, ident: &str) -> Result<Vec<Value>, AppError>;
    async fn delete_user(&self, school_id: &str, user_id: &str, user_type: &str) -> Result<(), AppError>;
}
