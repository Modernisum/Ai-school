use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait AuditRepository: Send + Sync {
    async fn log_action(
        &self,
        school_id: &str,
        admin_id: &str,
        entity_type: &str,
        entity_id: &str,
        action_type: &str,
        changed_data: Value,
    ) -> Result<(), AppError>;

    async fn get_logs(
        &self,
        school_id: &str,
        entity_type: Option<&str>,
        limit: i64,
    ) -> Result<JsonList, AppError>;

    async fn get_log_by_id(
        &self,
        school_id: &str,
        log_id: i32,
    ) -> Result<Option<Value>, AppError>;
}
