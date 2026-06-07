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

    async fn assign_responsibility_coverage(
        &self,
        school_id: &str,
        coverage_id: &str,
        leave_id: &str,
        original_employee_id: &str,
        covering_employee_id: &str,
        responsibility_id: &str,
        coverage_period_start: chrono::NaiveDate,
        coverage_period_end: chrono::NaiveDate,
        notes: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        sqlx::query(
            "INSERT INTO responsibility_coverage (
                coverage_id, leave_id, original_employee_id, covering_employee_id,
                responsibility_id, coverage_period_start, coverage_period_end,
                status, notes, school_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        )
        .bind(coverage_id)
        .bind(leave_id)
        .bind(original_employee_id)
        .bind(covering_employee_id)
        .bind(responsibility_id)
        .bind(coverage_period_start)
        .bind(coverage_period_end)
        .bind("assigned")
        .bind(notes)
        .bind(school_id)
        .execute(&mut *conn)
        .await?;

        sqlx::query(
            "UPDATE leave_applications SET coverage_assigned = TRUE WHERE school_id = $1 AND leave_id = $2",
        )
        .bind(school_id)
        .bind(leave_id)
        .execute(&mut *conn)
        .await?;

        Ok(())
    }

    async fn get_available_coverages(
        &self,
        school_id: &str,
        leave_id: &str,
    ) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT \
                coverage_id, leave_id, original_employee_id, covering_employee_id, \
                responsibility_id, coverage_period_start, coverage_period_end, \
                status, notes, created_at, updated_at \
             FROM responsibility_coverage \
             WHERE school_id = $1 AND leave_id = $2 \
             ORDER BY created_at DESC",
        )
        .bind(school_id)
        .bind(leave_id)
        .fetch_all(&mut *conn)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| {
                json!({
                    "coverageId": row.get::<String, _>("coverage_id"),
                    "leaveId": row.get::<String, _>("leave_id"),
                    "originalEmployeeId": row.get::<String, _>("original_employee_id"),
                    "coveringEmployeeId": row.get::<String, _>("covering_employee_id"),
                    "responsibilityId": row.get::<String, _>("responsibility_id"),
                    "coveragePeriodStart": row.get::<chrono::NaiveDate, _>("coverage_period_start").to_string(),
                    "coveragePeriodEnd": row.get::<chrono::NaiveDate, _>("coverage_period_end").to_string(),
                    "status": row.get::<String, _>("status"),
                    "notes": row.get::<Option<String>, _>("notes").unwrap_or_default(),
                    "createdAt": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                    "updatedAt": row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
                })
            })
            .collect())
    }

    async fn accept_responsibility_coverage(
        &self,
        school_id: &str,
        employee_id: &str,
        coverage_id: &str,
    ) -> Result<(), AppError> {
        use sqlx::Connection;
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        // 1. Verify coverage exists and status is 'assigned'
        let row = sqlx::query(
            "SELECT covering_employee_id, status FROM responsibility_coverage \
             WHERE school_id = $1 AND coverage_id = $2"
        )
        .bind(school_id)
        .bind(coverage_id)
        .fetch_optional(&mut *tx)
        .await?;

        match row {
            Some(row) => {
                let covering_employee_id = row.get::<String, _>("covering_employee_id");
                let current_status = row.get::<String, _>("status");
                
                if covering_employee_id != employee_id {
                    return Err(Box::new(crate::error::AppError::Unauthorized("You are not authorized to accept this coverage assignment".to_string())));
                }
                
                if current_status == "accepted" {
                    return Err(Box::new(crate::error::AppError::Validation("Coverage has already been accepted".to_string())));
                }
                
                if current_status != "assigned" {
                    return Err(Box::new(crate::error::AppError::Validation(format!("Cannot accept coverage with status: {}", current_status))));
                }
                
                // 2. Fetch details for delegation
                let delegation_row = sqlx::query(
                    "SELECT leave_id, original_employee_id, responsibility_id FROM responsibility_coverage \
                     WHERE school_id = $1 AND coverage_id = $2"
                )
                .bind(school_id)
                .bind(coverage_id)
                .fetch_optional(&mut *tx)
                .await?;

                // 3. Update coverage status
                sqlx::query(
                    "UPDATE responsibility_coverage \
                     SET status = 'accepted', updated_at = NOW() \
                     WHERE school_id = $1 AND coverage_id = $2"
                )
                .bind(school_id)
                .bind(coverage_id)
                .execute(&mut *tx)
                .await?;

                // 4. Temporarily delegate responsibility to covering employee
                if let Some(dr) = delegation_row {
                    let orig_emp: String = dr.get("original_employee_id");
                    let resp_id: String = dr.get("responsibility_id");
                    let lid: String = dr.get("leave_id");

                    // Get original employee's space_ids for this responsibility
                    let orig_spaces: Option<Value> = sqlx::query_scalar(
                        "SELECT space_ids FROM employee_responsibilities \
                         WHERE school_id = $1 AND employee_id = $2 AND responsibility_id = $3"
                    )
                    .bind(school_id)
                    .bind(&orig_emp)
                    .bind(&resp_id)
                    .fetch_optional(&mut *tx)
                    .await?;

                    let space_ids: Vec<String> = orig_spaces
                        .and_then(|v| v.as_array().map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect()))
                        .unwrap_or_default();

                    // Add covering employee to the responsibility with same spaces
                    sqlx::query(
                        "INSERT INTO employee_responsibilities (school_id, employee_id, responsibility_id, space_ids) \
                         VALUES ($1, $2, $3, $4) \
                         ON CONFLICT (school_id, employee_id, responsibility_id) DO UPDATE SET \
                         space_ids = EXCLUDED.space_ids, updated_at = NOW()"
                    )
                    .bind(school_id)
                    .bind(&covering_employee_id)
                    .bind(&resp_id)
                    .bind(&space_ids)
                    .execute(&mut *tx)
                    .await?;

                    // Log delegation in history
                    sqlx::query(
                        "INSERT INTO responsibility_assignment_history (school_id, responsibility_id, employee_id, \
                         action, previous_space_ids, version, performed_by, reason, performed_at) \
                         VALUES ($1, $2, $3, 'coverage_accepted', $4, 1, $5, $6, NOW())"
                    )
                    .bind(school_id)
                    .bind(&resp_id)
                    .bind(&covering_employee_id)
                    .bind(&space_ids)
                    .bind(employee_id)
                    .bind(format!("Leave coverage for {} (leave {})", orig_emp, lid))
                    .execute(&mut *tx)
                    .await?;
                }
            }
            None => {
                return Err(Box::new(crate::error::AppError::NotFound("Coverage record not found".to_string())));
            }
        }

        tx.commit().await?;
        Ok(())
    }

    async fn save_workload_assessment(
        &self,
        school_id: &str,
        leave_id: &str,
        employee_id: &str,
        assessment_id: &str,
        impact_score: i32,
        workload_category: &str,
        coverage_needed: bool,
        notes: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        sqlx::query(
            "DELETE FROM workload_assessment WHERE leave_id = $1 AND school_id = $2"
        )
        .bind(leave_id)
        .bind(school_id)
        .execute(&mut *conn)
        .await?;

        sqlx::query(
            "INSERT INTO workload_assessment (assessment_id, leave_id, school_id, employee_id, \
             assessment_date, impact_score, workload_category, coverage_needed, notes) \
             VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8)"
        )
        .bind(assessment_id)
        .bind(leave_id)
        .bind(school_id)
        .bind(employee_id)
        .bind(impact_score)
        .bind(workload_category)
        .bind(coverage_needed)
        .bind(notes)
        .execute(&mut *conn)
        .await?;

        Ok(())
    }

    async fn get_workload_assessment(
        &self,
        school_id: &str,
        leave_id: &str,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query(
            "SELECT * FROM workload_assessment WHERE school_id = $1 AND leave_id = $2"
        )
        .bind(school_id)
        .bind(leave_id)
        .fetch_optional(&mut *conn)
        .await?;

        Ok(row.map(|r| {
            let assessment_date = r.try_get::<chrono::DateTime<chrono::Utc>, _>("assessment_date")
                .map(|d| d.to_rfc3339())
                .unwrap_or_else(|_| {
                    r.try_get::<chrono::NaiveDateTime, _>("assessment_date")
                        .map(|d| d.to_string())
                        .unwrap_or_default()
                });
            json!({
                "leaveId": r.get::<String, _>("leave_id"),
                "workloadImpact": r.get::<Option<String>, _>("workload_category").unwrap_or_default(),
                "impactScore": r.get::<Option<i32>, _>("impact_score").unwrap_or(0),
                "coverageNeeded": r.get::<Option<bool>, _>("coverage_needed").unwrap_or(false),
                "assessmentDate": assessment_date,
                "notes": r.get::<Option<String>, _>("notes").unwrap_or_default(),
            })
        }))
    }
}
