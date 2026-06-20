use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait NotificationService: Send + Sync {
    async fn create_notification(
        &self,
        school_id: &str,
        user_id: Option<&str>,
        category: &str,
        severity: &str,
        title: &str,
        message: &str,
        data: Value,
    ) -> AppResult<Value>;

    async fn list_notifications(
        &self,
        school_id: &str,
        user_id: Option<&str>,
        category: Option<&str>,
        unread_only: bool,
        limit: i64,
        offset: i64,
    ) -> AppResult<Vec<Value>>;

    async fn get_unread_count(&self, school_id: &str, user_id: &str) -> AppResult<i64>;

    async fn mark_read(&self, school_id: &str, notification_id: i64, user_id: &str) -> AppResult<()>;

    async fn mark_all_read(&self, school_id: &str, user_id: &str) -> AppResult<()>;

    async fn delete_notification(&self, school_id: &str, notification_id: i64) -> AppResult<()>;
}
