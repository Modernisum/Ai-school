use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresDeveloperAccessRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl DeveloperAccessRepository for PostgresDeveloperAccessRepository {
    async fn insert_access_request(
        &self,
        developer_id: &str,
        developer_email: &str,
        requested_role: &str,
        justification: &str,
        requested_tables: &[String],
        duration_hours: i32,
    ) -> Result<(i32, DateTime<Utc>), AppError> {
        let request = sqlx::query(
            "INSERT INTO developer_access_requests \
            (developer_id, developer_email, requested_role, justification, requested_tables, duration_hours, status) \
            VALUES ($1, $2, $3, $4, $5, $6, $7) \
            RETURNING id, created_at"
        )
        .bind(developer_id)
        .bind(developer_email)
        .bind(requested_role)
        .bind(justification)
        .bind(requested_tables)
        .bind(duration_hours)
        .bind("pending")
        .fetch_one(&self.client.pool)
        .await?;

        let request_id: i32 = request.get("id");
        let created_at: DateTime<Utc> = request.get("created_at");
        Ok((request_id, created_at))
    }

    async fn get_pending_request_by_id(
        &self,
        request_id: i32,
    ) -> Result<Option<(String, String, String, i32)>, AppError> {
        let row = sqlx::query(
            "SELECT developer_id, developer_email, requested_role, duration_hours \
            FROM developer_access_requests WHERE id = $1 AND status = 'pending'"
        )
        .bind(request_id)
        .fetch_optional(&self.client.pool)
        .await?;

        if let Some(r) = row {
            let dev_id: String = r.get("developer_id");
            let dev_email: String = r.get("developer_email");
            let requested_role: String = r.get("requested_role");
            let duration_hours: i32 = r.get("duration_hours");
            Ok(Some((dev_id, dev_email, requested_role, duration_hours)))
        } else {
            Ok(None)
        }
    }

    async fn update_request_and_approve(
        &self,
        request_id: i32,
        approver_id: &str,
        approver_email: &str,
        approval_notes: Option<&str>,
        duration_hours: i32,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE developer_access_requests \
            SET status = 'approved', approver_id = $2, approver_email = $3, \
                approval_notes = $4, approved_at = NOW(), expires_at = NOW() + ($5 || ' hours')::INTERVAL \
            WHERE id = $1"
        )
        .bind(request_id)
        .bind(approver_id)
        .bind(approver_email)
        .bind(approval_notes)
        .bind(duration_hours)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }

    async fn call_grant_developer_access(
        &self,
        developer_id: &str,
        developer_email: &str,
        pg_role: &str,
        duration_hours: i32,
    ) -> Result<i32, AppError> {
        let row = sqlx::query(
            "SELECT grant_developer_access($1, $2, $3, $4) as grant_id"
        )
        .bind(developer_id)
        .bind(developer_email)
        .bind(pg_role)
        .bind(duration_hours)
        .fetch_one(&self.client.pool)
        .await?;

        let grant_id: i32 = row.get("grant_id");
        Ok(grant_id)
    }

    async fn get_active_grant_by_id(&self, grant_id: i32) -> Result<Option<String>, AppError> {
        let row = sqlx::query(
            "SELECT developer_id FROM developer_access_grants WHERE id = $1 AND is_active = TRUE"
        )
        .bind(grant_id)
        .fetch_optional(&self.client.pool)
        .await?;
        Ok(row.map(|r| r.get("developer_id")))
    }

    async fn call_revoke_developer_access(&self, grant_id: i32, reason: &str) -> Result<(), AppError> {
        sqlx::query(
            "SELECT revoke_developer_access($1, $2)"
        )
        .bind(grant_id)
        .bind(reason)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }

    async fn get_active_grants_for_developer(&self, developer_id: &str) -> Result<Vec<Value>, AppError> {
        let grants = sqlx::query(
            "SELECT * FROM developer_access_grants \
            WHERE developer_id = $1 AND is_active = TRUE AND end_time > NOW() \
            ORDER BY start_time DESC"
        )
        .bind(developer_id)
        .fetch_all(&self.client.pool)
        .await?;

        let mut result = Vec::new();
        for grant in grants {
            result.push(json!({
                "id": grant.get::<i32, _>("id"),
                "granted_role": grant.get::<String, _>("granted_role"),
                "start_time": grant.get::<DateTime<Utc>, _>("start_time").to_rfc3339(),
                "end_time": grant.get::<DateTime<Utc>, _>("end_time").to_rfc3339(),
                "pg_role_name": grant.get::<String, _>("pg_role_name"),
            }));
        }
        Ok(result)
    }

    async fn get_pending_requests(&self) -> Result<Vec<Value>, AppError> {
        let requests = sqlx::query(
            "SELECT * FROM developer_access_requests \
            WHERE status = 'pending' \
            ORDER BY created_at DESC"
        )
        .fetch_all(&self.client.pool)
        .await?;

        let mut result = Vec::new();
        for request in requests {
            result.push(json!({
                "id": request.get::<i32, _>("id"),
                "developer_id": request.get::<String, _>("developer_id"),
                "developer_email": request.get::<String, _>("developer_email"),
                "requested_role": request.get::<String, _>("requested_role"),
                "justification": request.get::<String, _>("justification"),
                "duration_hours": request.get::<i32, _>("duration_hours"),
                "created_at": request.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
                "requested_tables": request.get::<Vec<String>, _>("requested_tables"),
            }));
        }
        Ok(result)
    }

    async fn log_developer_activity(
        &self,
        developer_id: &str,
        developer_email: &str,
        action_type: &str,
        target_table: Option<&str>,
        query_text: Option<&str>,
        details: Option<&str>,
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO developer_activity_audit \
            (developer_id, developer_email, action_type, target_table, query_text, details) \
            VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(developer_id)
        .bind(developer_email)
        .bind(action_type)
        .bind(target_table)
        .bind(query_text)
        .bind(details)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }

    async fn call_check_expired_access_grants(&self) -> Result<i32, AppError> {
        let row = sqlx::query(
            "SELECT check_expired_access_grants() as revoked_count"
        )
        .fetch_one(&self.client.pool)
        .await?;
        let count: i32 = row.get("revoked_count");
        Ok(count)
    }

    async fn get_developer_activity(
        &self,
        developer_id: Option<&str>,
        start_date: Option<DateTime<Utc>>,
        end_date: Option<DateTime<Utc>>,
        limit: i64,
    ) -> Result<Vec<Value>, AppError> {
        let mut query = "SELECT * FROM developer_activity_audit WHERE 1=1".to_string();
        let mut params: Vec<String> = Vec::new();
        let mut param_count = 0;

        if let Some(dev_id) = developer_id {
            param_count += 1;
            query.push_str(&format!(" AND developer_id = ${}", param_count));
            params.push(dev_id.to_string());
        }

        if let Some(start) = start_date {
            param_count += 1;
            query.push_str(&format!(" AND created_at >= ${}", param_count));
            params.push(start.to_rfc3339());
        }

        if let Some(end) = end_date {
            param_count += 1;
            query.push_str(&format!(" AND created_at <= ${}", param_count));
            params.push(end.to_rfc3339());
        }

        query.push_str(&format!(" ORDER BY created_at DESC LIMIT {}", limit));

        let mut sqlx_query = sqlx::query(&query);
        for param in params {
            sqlx_query = sqlx_query.bind(param);
        }

        let activities = sqlx_query
            .fetch_all(&self.client.pool)
            .await?;

        let mut result = Vec::new();
        for activity in activities {
            result.push(json!({
                "id": activity.get::<i32, _>("id"),
                "developer_id": activity.get::<String, _>("developer_id"),
                "developer_email": activity.get::<String, _>("developer_email"),
                "action_type": activity.get::<String, _>("action_type"),
                "target_table": activity.get::<Option<String>, _>("target_table"),
                "query_text": activity.get::<Option<String>, _>("query_text"),
                "details": activity.get::<Option<String>, _>("details"),
                "created_at": activity.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
            }));
        }
        Ok(result)
    }
}
