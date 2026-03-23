use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresLeaveRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl LeaveRepository for PostgresLeaveRepository {
    async fn add_leave(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let leave_id = format!("LV{}", chrono::Utc::now().timestamp_millis());
        let employee_id = data["employeeId"]
            .as_str()
            .ok_or("Employee ID is required")?;
        let employee_name = data["employeeName"].as_str().unwrap_or("");
        let reason = data["reason"].as_str().unwrap_or("");
        let leave_type = data["leaveType"].as_str().unwrap_or("casual");
        let from_date =
            chrono::NaiveDate::parse_from_str(data["fromDate"].as_str().unwrap_or(""), "%Y-%m-%d")
                .unwrap_or_default();
        let to_date =
            chrono::NaiveDate::parse_from_str(data["toDate"].as_str().unwrap_or(""), "%Y-%m-%d")
                .unwrap_or_default();

        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "INSERT INTO leave_applications (
                leave_id, school_id, employee_id, employee_name, reason, leave_type, from_date, to_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        )
        .bind(&leave_id)
        .bind(school_id)
        .bind(employee_id)
        .bind(employee_name)
        .bind(reason)
        .bind(leave_type)
        .bind(from_date)
        .bind(to_date)
        .execute(&mut *conn)
        .await?;

        let mut res = data.clone();
        res["leaveId"] = json!(leave_id);
        Ok(res)
    }

    async fn get_leaves(&self, school_id: &str) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT leave_id, employee_id, employee_name, reason, leave_type, from_date, to_date, status
             FROM leave_applications WHERE school_id = $1 ORDER BY created_at DESC",
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| {
                json!({
                    "leaveId": r.get::<String, _>("leave_id"),
                    "employeeId": r.get::<String, _>("employee_id"),
                    "employeeName": r.get::<Option<String>, _>("employee_name").unwrap_or_default(),
                    "reason": r.get::<String, _>("reason"),
                    "leaveType": r.get::<String, _>("leave_type"),
                    "fromDate": r.get::<chrono::NaiveDate, _>("from_date").to_string(),
                    "toDate": r.get::<chrono::NaiveDate, _>("to_date").to_string(),
                    "status": r.get::<String, _>("status"),
                })
            })
            .collect())
    }

    async fn get_leave(&self, school_id: &str, leave_id: &str) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query(
            "SELECT leave_id, employee_id, employee_name, reason, leave_type, from_date, to_date, status
             FROM leave_applications WHERE school_id = $1 AND leave_id = $2",
        )
        .bind(school_id)
        .bind(leave_id)
        .fetch_optional(&mut *conn)
        .await?;

        Ok(row.map(|r| {
            json!({
                "leaveId": r.get::<String, _>("leave_id"),
                "employeeId": r.get::<String, _>("employee_id"),
                "employeeName": r.get::<Option<String>, _>("employee_name").unwrap_or_default(),
                "reason": r.get::<String, _>("reason"),
                "leaveType": r.get::<String, _>("leave_type"),
                "fromDate": r.get::<chrono::NaiveDate, _>("from_date").to_string(),
                "toDate": r.get::<chrono::NaiveDate, _>("to_date").to_string(),
                "status": r.get::<String, _>("status"),
            })
        }))
    }

    async fn update_leave_status(
        &self,
        school_id: &str,
        leave_id: &str,
        status: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "UPDATE leave_applications SET status = $1 WHERE school_id = $2 AND leave_id = $3",
        )
        .bind(status)
        .bind(school_id)
        .bind(leave_id)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    async fn update_leave_duration(
        &self,
        school_id: &str,
        leave_id: &str,
        action: &str,
        days: i32,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let op = if action == "extend" { "+" } else { "-" };
        let q = format!("UPDATE leave_applications SET to_date = to_date {} ($1 || ' days')::interval WHERE school_id = $2 AND leave_id = $3", op);
        sqlx::query(&q)
            .bind(days.to_string())
            .bind(school_id)
            .bind(leave_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn delete_leave_application(&self, school_id: &str, leave_id: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM leave_applications WHERE school_id = $1 AND leave_id = $2")
            .bind(school_id)
            .bind(leave_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }
}
