use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait StorageRepository: Send + Sync {
    async fn save_file_metadata(&self, data: Value) -> Result<Value, AppError>;
    async fn get_file_metadata(&self, id: i32) -> Result<Option<Value>, AppError>;
    async fn get_file_by_hash(&self, file_hash: &str) -> Result<Option<Value>, AppError>;
    async fn delete_file_metadata(&self, id: i32) -> Result<(), AppError>;
    async fn delete_file_by_url(&self, url: &str, school_id: &str) -> Result<(), AppError>;
    async fn list_files(&self, school_id: Option<&str>, user_id: Option<&str>) -> Result<JsonList, AppError>;
    async fn get_orphaned_files(&self, older_than_hours: i32) -> Result<JsonList, AppError>;
    async fn get_orphaned_files_minutes(&self, older_than_minutes: i32) -> Result<JsonList, AppError>;
    async fn check_storage_status(&self, school_id: &str) -> Result<(), AppError>;
}
