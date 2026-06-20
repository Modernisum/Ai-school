use crate::db::DbClient;
use crate::repository::traits::{AppError, SystemLogRepository, JsonList};
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresSystemLogRepository {
    pub client: Arc<DbClient>,
}

impl PostgresSystemLogRepository {
    pub fn new(client: Arc<DbClient>) -> Self {
        Self { client }
    }
}

#[async_trait]
impl SystemLogRepository for PostgresSystemLogRepository {
    async fn get_failed_jobs_count(
        &self,
        school_id: &str,
        since: chrono::DateTime<chrono::Utc>,
    ) -> Result<i64, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM system_logs \
             WHERE school_id = $1 AND log_type = 'background_job_error' AND created_at >= $2"
        )
        .bind(school_id)
        .bind(since)
        .fetch_one(&mut *conn)
        .await
        .unwrap_or(0);
        Ok(count)
    }

    async fn get_last_success_time(
        &self,
        school_id: &str,
        log_type: &str,
    ) -> Result<Option<chrono::DateTime<chrono::Utc>>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let last_success: Option<chrono::DateTime<chrono::Utc>> = sqlx::query_scalar(
            "SELECT MAX(created_at) FROM system_logs WHERE school_id = $1 AND log_type = $2"
        )
        .bind(school_id)
        .bind(log_type)
        .fetch_optional(&mut *conn)
        .await
        .unwrap_or(None);
        Ok(last_success)
    }

    async fn get_recent_runs(
        &self,
        school_id: &str,
        since: chrono::DateTime<chrono::Utc>,
        log_types: &[String],
        limit: i64,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT log_type, status, created_at, details FROM system_logs \
             WHERE school_id = $1 AND log_type = ANY($2) AND created_at >= $3 \
             ORDER BY created_at DESC LIMIT $4"
        )
        .bind(school_id)
        .bind(log_types)
        .bind(since)
        .bind(limit)
        .fetch_all(&mut *conn)
        .await?;

        let runs = rows.iter().map(|r| {
            json!({
                "log_type": r.get::<String, _>("log_type"),
                "status": r.get::<String, _>("status"),
                "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                "details": r.get::<Option<Value>, _>("details").unwrap_or(json!({}))
            })
        }).collect();
        Ok(runs)
    }

    async fn get_performance_metrics(
        &self,
        school_id: &str,
        since: chrono::DateTime<chrono::Utc>,
    ) -> Result<(Option<f64>, i64), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query(
            "SELECT \
                 AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) * 1000 as avg_job_time_ms, \
                 COUNT(*) as total_jobs \
             FROM system_logs \
             WHERE school_id = $1 AND log_type LIKE '%_run' AND created_at >= $2 AND completed_at IS NOT NULL"
        )
        .bind(school_id)
        .bind(since)
        .fetch_one(&mut *conn)
        .await?;

        let avg_job_time_ms: Option<f64> = row.try_get("avg_job_time_ms").ok();
        let total_jobs: i64 = row.try_get::<i64, _>("total_jobs").unwrap_or(0);
        Ok((avg_job_time_ms, total_jobs))
    }

    async fn insert_log(
        &self,
        school_id: &str,
        log_type: &str,
        status: &str,
        details: Value,
        created_at: chrono::DateTime<chrono::Utc>,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "INSERT INTO system_logs (school_id, log_type, status, details, created_at) \
             VALUES ($1, $2, $3, $4, $5)"
        )
        .bind(school_id)
        .bind(log_type)
        .bind(status)
        .bind(details)
        .bind(created_at)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }
}
