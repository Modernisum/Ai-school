use async_trait::async_trait;
use serde_json::Value;
use super::{AppError, JsonList};

#[async_trait]
pub trait SystemLogRepository: Send + Sync {
    async fn get_failed_jobs_count(
        &self,
        school_id: &str,
        since: chrono::DateTime<chrono::Utc>,
    ) -> Result<i64, AppError>;

    async fn get_last_success_time(
        &self,
        school_id: &str,
        log_type: &str,
    ) -> Result<Option<chrono::DateTime<chrono::Utc>>, AppError>;

    async fn get_recent_runs(
        &self,
        school_id: &str,
        since: chrono::DateTime<chrono::Utc>,
        log_types: &[String],
        limit: i64,
    ) -> Result<JsonList, AppError>;

    async fn get_performance_metrics(
        &self,
        school_id: &str,
        since: chrono::DateTime<chrono::Utc>,
    ) -> Result<(Option<f64>, i64), AppError>;

    async fn insert_log(
        &self,
        school_id: &str,
        log_type: &str,
        status: &str,
        details: Value,
        created_at: chrono::DateTime<chrono::Utc>,
    ) -> Result<(), AppError>;
}
