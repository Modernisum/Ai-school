use async_trait::async_trait;
use serde_json::Value;

use super::{AppError, JsonList};

#[async_trait]
pub trait NotificationRepository: Send + Sync {
    async fn create(
        &self,
        school_id: &str,
        user_id: Option<&str>,
        category: &str,
        severity: &str,
        title: &str,
        message: &str,
        data: Value,
    ) -> Result<Value, AppError>;

    async fn list_for_user(
        &self,
        school_id: &str,
        user_id: &str,
        category: Option<&str>,
        unread_only: bool,
        limit: i64,
        offset: i64,
    ) -> Result<JsonList, AppError>;

    async fn list_for_school(
        &self,
        school_id: &str,
        category: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<JsonList, AppError>;

    async fn get_unread_count(&self, school_id: &str, user_id: &str) -> Result<i64, AppError>;

    async fn get_pending_notifications_count(
        &self,
        school_id: &str,
        since: chrono::DateTime<chrono::Utc>,
    ) -> Result<i64, AppError>;

    async fn mark_read(&self, school_id: &str, notification_id: i64, user_id: &str) -> Result<() , AppError>;

    async fn mark_all_read(&self, school_id: &str, user_id: &str) -> Result<(), AppError>;

    async fn delete_notification(&self, school_id: &str, notification_id: i64) -> Result<(), AppError>;
}
