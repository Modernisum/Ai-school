use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresAnalyticsRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::AnalyticsRepository for PostgresAnalyticsRepository {
    async fn get_school_stats(&self, school_id: &str) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let students_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM students WHERE school_id = $1")
                .bind(school_id)
                .fetch_one(&mut *conn)
                .await?;

        let employees_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM employees WHERE school_id = $1")
                .bind(school_id)
                .fetch_one(&mut *conn)
                .await?;

        let classes_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM classes WHERE school_id = $1")
                .bind(school_id)
                .fetch_one(&mut *conn)
                .await?;

        Ok(json!({
            "totalStudents": students_count,
            "totalEmployees": employees_count,
            "totalClasses": classes_count
        }))
    }

    async fn get_attendance_summary(&self, school_id: &str, date: &str) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let target_date = date.parse::<chrono::NaiveDate>()?;

        let rows = sqlx::query(
            "SELECT status, role, COUNT(*) as count FROM attendance WHERE school_id = $1 AND date = $2 GROUP BY status, role"
        )
        .bind(school_id).bind(target_date).fetch_all(&mut *conn).await?;

        let mut summary = json!({
            "student": {"present": 0, "absent": 0, "leave": 0, "holiday": 0},
            "employee": {"present": 0, "absent": 0, "leave": 0, "holiday": 0}
        });

        for row in rows {
            let status = row.get::<String, _>("status").to_lowercase();
            let role = row.get::<String, _>("role").to_lowercase();
            let count = row.get::<i64, _>("count");

            if let Some(role_map) = summary.get_mut(&role) {
                if let Some(target) = role_map.get_mut(&status) {
                    *target = json!(count);
                }
            }
        }

        Ok(summary)
    }

    async fn get_pending_fees_by_period(
        &self,
        school_id: &str,
        _months_overdue: i32,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT s.name, s.student_id, s.class_name, s.section, sf.pending_amount::FLOAT as pending_amount \
             FROM students s \
             JOIN student_fees sf ON s.student_id = sf.student_id AND s.school_id = sf.school_id \
             WHERE s.school_id = $1 AND sf.pending_amount > 0"
        )
        .bind(school_id).fetch_all(&mut *conn).await?;

        Ok(rows
            .into_iter()
            .map(|r| {
                json!({
                    "studentName": r.get::<String, _>("name"),
                    "studentId": r.get::<String, _>("student_id"),
                    "className": r.get::<String, _>("class_name"),
                    "section": r.get::<Option<String>, _>("section"),
                    "pendingAmount": r.get::<f64, _>("pending_amount")
                })
            })
            .collect())
    }

    async fn get_fee_summary(&self, school_id: &str) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query(
            "SELECT SUM(total_fees)::FLOAT as total, SUM(pending_amount)::FLOAT as pending, SUM(discount)::FLOAT as discount FROM student_fees WHERE school_id = $1"
        )
        .bind(school_id).fetch_one(&mut *conn).await?;

        let total = row.get::<Option<f64>, _>("total").unwrap_or(0.0);
        let pending = row.get::<Option<f64>, _>("pending").unwrap_or(0.0);
        let discount = row.get::<Option<f64>, _>("discount").unwrap_or(0.0);
        let collected = total - pending - discount;

        Ok(json!({
            "totalRevenueExpected": total,
            "totalCollected": collected,
            "totalPending": pending,
            "totalDiscount": discount
        }))
    }

    async fn query_staff_analytics(&self, school_id: &str) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT type as emp_type, status, COUNT(*) as count FROM employees WHERE school_id = $1 GROUP BY type, status"
        )
        .bind(school_id).fetch_all(&mut *conn).await?;

        Ok(json!(rows
            .into_iter()
            .map(|r| json!({
                "type": r.get::<String, _>("emp_type"),
                "status": r.get::<String, _>("status"),
                "count": r.get::<i64, _>("count")
            }))
            .collect::<Vec<Value>>()))
    }
}
