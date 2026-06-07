use async_trait::async_trait;
use crate::repository::traits::AppError;
use chrono::{DateTime, Utc};
use serde_json::Value;

#[async_trait]
pub trait DeveloperAccessRepository: Send + Sync {
    async fn insert_access_request(
        &self,
        developer_id: &str,
        developer_email: &str,
        requested_role: &str,
        justification: &str,
        requested_tables: &[String],
        duration_hours: i32,
    ) -> Result<(i32, DateTime<Utc>), AppError>;

    async fn get_pending_request_by_id(
        &self,
        request_id: i32,
    ) -> Result<Option<(String, String, String, i32)>, AppError>;

    async fn update_request_and_approve(
        &self,
        request_id: i32,
        approver_id: &str,
        approver_email: &str,
        approval_notes: Option<&str>,
        duration_hours: i32,
    ) -> Result<(), AppError>;

    async fn call_grant_developer_access(
        &self,
        developer_id: &str,
        developer_email: &str,
        pg_role: &str,
        duration_hours: i32,
    ) -> Result<i32, AppError>;

    async fn get_active_grant_by_id(&self, grant_id: i32) -> Result<Option<String>, AppError>;

    async fn call_revoke_developer_access(&self, grant_id: i32, reason: &str) -> Result<(), AppError>;

    async fn get_active_grants_for_developer(&self, developer_id: &str) -> Result<Vec<Value>, AppError>;

    async fn get_pending_requests(&self) -> Result<Vec<Value>, AppError>;

    async fn log_developer_activity(
        &self,
        developer_id: &str,
        developer_email: &str,
        action_type: &str,
        target_table: Option<&str>,
        query_text: Option<&str>,
        details: Option<&str>,
    ) -> Result<(), AppError>;

    async fn call_check_expired_access_grants(&self) -> Result<i32, AppError>;

    async fn get_developer_activity(
        &self,
        developer_id: Option<&str>,
        start_date: Option<DateTime<Utc>>,
        end_date: Option<DateTime<Utc>>,
        limit: i64,
    ) -> Result<Vec<Value>, AppError>;
}
