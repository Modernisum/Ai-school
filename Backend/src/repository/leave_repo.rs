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

        // Support both employee and student leave applications
        let applicant_type = data["applicantType"].as_str().unwrap_or("employee");
        let (employee_id, student_id, applicant_name) = if applicant_type == "student" {
            let student_id = data["studentId"]
                .as_str()
                .ok_or("Student ID is required for student leave")?;
            let student_name = data["studentName"].as_str().unwrap_or("");
            (None, Some(student_id), student_name)
        } else {
            let employee_id = data["employeeId"]
                .as_str()
                .ok_or("Employee ID is required for employee leave")?;
            let employee_name = data["employeeName"].as_str().unwrap_or("");
            (Some(employee_id), None, employee_name)
        };

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
                leave_id, school_id, employee_id, student_id, employee_name, reason, leave_type, from_date, to_date, applicant_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        )
        .bind(&leave_id)
        .bind(school_id)
        .bind(employee_id)
        .bind(student_id)
        .bind(applicant_name)
        .bind(reason)
        .bind(leave_type)
        .bind(from_date)
        .bind(to_date)
        .bind(applicant_type)
        .execute(&mut *conn)
        .await?;

        let mut res = data.clone();
        res["leaveId"] = json!(leave_id);
        Ok(res)
    }

    async fn get_leaves(&self, school_id: &str) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT leave_id, employee_id, student_id, employee_name, reason, leave_type, from_date, to_date, status, applicant_type
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
                    "employeeId": r.get::<Option<String>, _>("employee_id").unwrap_or_default(),
                    "studentId": r.get::<Option<String>, _>("student_id").unwrap_or_default(),
                    "employeeName": r.get::<Option<String>, _>("employee_name").unwrap_or_default(),
                    "reason": r.get::<String, _>("reason"),
                    "leaveType": r.get::<String, _>("leave_type"),
                    "fromDate": r.get::<chrono::NaiveDate, _>("from_date").to_string(),
                    "toDate": r.get::<chrono::NaiveDate, _>("to_date").to_string(),
                    "status": r.get::<String, _>("status"),
                    "applicantType": r.get::<String, _>("applicant_type"),
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

    async fn delete_leave_application(
        &self,
        school_id: &str,
        leave_id: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM leave_applications WHERE school_id = $1 AND leave_id = $2")
            .bind(school_id)
            .bind(leave_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn find_matching_employees(
        &self,
        school_id: &str,
        responsibility_id: &str,
        exclude_employee_id: &str,
        from_date: &str,
        to_date: &str,
    ) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            r#"SELECT
                e.employee_id,
                e.data->>'name' as employee_name,
                e.employee_type,
                CASE WHEN er2.employee_id IS NOT NULL THEN true ELSE false END as already_assigned,
                COALESCE(
                    (SELECT COUNT(*) FROM responsibility_coverage rc2
                     WHERE rc2.covering_employee_id = e.employee_id
                       AND rc2.status IN ('assigned', 'accepted')
                       AND rc2.coverage_period_start <= $5::date
                       AND rc2.coverage_period_end >= $4::date),
                    0
                )::int as active_coverages
            FROM employees e
            LEFT JOIN employee_responsibilities er2
                ON er2.school_id = e.school_id
                AND er2.employee_id = e.employee_id
                AND er2.responsibility_id = $2
            WHERE e.school_id = $1
              AND e.employee_type = (
                  SELECT employee_type FROM responsibilities
                  WHERE school_id = $1 AND responsibility_id = $2
              )
              AND e.employee_id != $3
            ORDER BY already_assigned DESC, active_coverages ASC
            LIMIT 10"#,
        )
        .bind(school_id)
        .bind(responsibility_id)
        .bind(exclude_employee_id)
        .bind(from_date)
        .bind(to_date)
        .fetch_all(&mut *conn)
        .await?;

        Ok(rows.iter().map(|row| {
            let already_assigned: bool = row.get("already_assigned");
            let active_coverages: i32 = row.get("active_coverages");
            let mut match_score = 0i32;
            if already_assigned { match_score += 50; }
            if active_coverages == 0 { match_score += 30; }
            json!({
                "employeeId": row.get::<String, _>("employee_id"),
                "employeeName": row.get::<String, _>("employee_name"),
                "employeeType": row.get::<String, _>("employee_type"),
                "alreadyAssigned": already_assigned,
                "activeCoverages": active_coverages,
                "matchScore": match_score
            })
        }).collect())
    }
}
