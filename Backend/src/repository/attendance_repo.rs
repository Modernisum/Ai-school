use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;
use chrono::{Datelike};

pub struct PostgresAttendanceRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::AttendanceRepository for PostgresAttendanceRepository {
    async fn mark_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO attendance (school_id, role, user_id, date, status, in_time, out_time, total_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (school_id, user_id, date) DO UPDATE SET status = EXCLUDED.status, in_time = EXCLUDED.in_time, out_time = EXCLUDED.out_time, total_time = EXCLUDED.total_time")
            .bind(school_id)
            .bind(role)
            .bind(user_id)
            .bind(date.parse::<chrono::NaiveDate>()?)
            .bind(data["status"].as_str())
            .bind(data["inTime"].as_str().map(|t| chrono::DateTime::parse_from_rfc3339(t).unwrap().with_timezone(&chrono::Utc)))
            .bind(data["outTime"].as_str().map(|t| chrono::DateTime::parse_from_rfc3339(t).unwrap().with_timezone(&chrono::Utc)))
            .bind(data["totalTime"].as_str())
            .execute(&mut *conn).await?;
        Ok(())
    }

    async fn get_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT * FROM attendance WHERE school_id = $1 AND role = $2 AND user_id = $3",
        )
        .bind(school_id)
        .bind(role)
        .bind(user_id)
        .fetch_all(&mut *conn)
        .await?;
        Ok(rows
            .into_iter()
            .map(|r| {
                let date = r.get::<chrono::NaiveDate, _>("date");
                json!({
                    "date": date.to_string(),
                    "status": r.get::<String, _>("status"),
                    "month": date.month(),
                    "year": date.year(),
                    "inTime": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("in_time"),
                    "outTime": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("out_time"),
                    "totalTime": r.get::<Option<String>, _>("total_time")
                })
            })
            .collect())
    }

    async fn delete_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "DELETE FROM attendance WHERE school_id = $1 AND role = $2 AND user_id = $3 AND date = $4",
        )
        .bind(school_id)
        .bind(role)
        .bind(user_id)
        .bind(date.parse::<chrono::NaiveDate>()?)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    async fn add_attendance_history(
        &self,
        school_id: &str,
        _role: &str,
        user_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO audit_logs (school_id, target_type, target_id, action, data) VALUES ($1, 'attendance', $2, $3, $4)")
            .bind(school_id)
            .bind(user_id)
            .bind(action)
            .bind(data)
            .execute(&mut *conn).await?;
        Ok(())
    }
}
