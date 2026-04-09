use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait TaskService: Send + Sync {
    async fn add_task(&self, school_id: &str, data: Value) -> AppResult<Value>;
    async fn list_tasks(
        &self,
        school_id: &str,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Vec<Value>>;
    async fn update_task_status(
        &self,
        school_id: &str,
        task_id: &str,
        status: &str,
    ) -> AppResult<()>;
}
