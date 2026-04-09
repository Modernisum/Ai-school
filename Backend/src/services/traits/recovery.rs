use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait RecoveryService: Send + Sync {
    async fn list_student_history(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn undo_student_change(&self, school_id: &str, id: i32) -> AppResult<()>;
    async fn list_audit_logs(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn undo_audit_log(&self, school_id: &str, log_id: i32) -> AppResult<()>;
}
