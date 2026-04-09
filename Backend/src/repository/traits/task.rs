use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait TaskRepository: Send + Sync {
    async fn add_task(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_tasks(&self, school_id: &str, start_date: Option<&str>, end_date: Option<&str>) -> Result<JsonList, AppError>;
    async fn update_task_status(&self, school_id: &str, task_id: &str, status: &str) -> Result<(), AppError>;
}
