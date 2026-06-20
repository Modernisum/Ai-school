use async_trait::async_trait;
use serde_json::Value;
use crate::repository::traits::AppError;

#[async_trait]
pub trait ConfigRepository: Send + Sync {
    async fn get(&self, school_id: &str, key: &str) -> Result<Option<Value>, AppError>;
    async fn set(&self, school_id: &str, key: &str, value: &Value) -> Result<(), AppError>;
    async fn get_many(&self, school_id: &str, keys: &[&str]) -> Result<std::collections::HashMap<String, Value>, AppError>;

    async fn register_webhook(
        &self,
        school_id: &str,
        url: &str,
        secret: &str,
        event_types: &[String],
    ) -> Result<i32, AppError>;

    async fn list_webhooks(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;

    async fn delete_webhook(
        &self,
        school_id: &str,
        id: i32,
    ) -> Result<(), AppError>;

    async fn get_webhook_logs(
        &self,
        school_id: &str,
        webhook_id: i32,
    ) -> Result<Vec<Value>, AppError>;

    // Global / Super Admin config operations
    async fn get_global_config(&self, key: &str) -> Result<Option<String>, AppError>;
    async fn set_global_config(&self, key: &str, value: &str) -> Result<(), AppError>;
    async fn set_global_notification(&self, notification: Value) -> Result<(), AppError>;
    async fn clear_global_notification(&self) -> Result<(), AppError>;
    async fn get_global_notification(&self) -> Result<Option<Value>, AppError>;
    async fn fetch_table_for_school(&self, table: &str, school_id: &str) -> Result<Vec<Value>, AppError>;
    async fn get_all_school_ids(&self) -> Result<Vec<String>, AppError>;
    async fn import_student_record(&self, school_id: &str, student_id: &str, data: Value) -> Result<(), AppError>;
}

