use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use chrono::{NaiveDate, Utc};
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresLeaveService {
    pub repos: Arc<Repositories>,
    pub timetable: Arc<crate::logic::timetable_engine::TimetableEngine>,
}

impl PostgresLeaveService {
    /// Find employees who can cover a specific responsibility during a leave period.
    async fn find_matching_employees_for_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
        exclude_employee_id: &str,
        from_date: &str,
        to_date: &str,
    ) -> AppResult<Vec<Value>> {
        Ok(self.repos.leave.find_matching_employees(
            school_id, responsibility_id, exclude_employee_id, from_date, to_date,
        ).await?)
    }
}

#[async_trait]
impl LeaveService for PostgresLeaveService {
    async fn create_leave(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value> {
        let res = self.repos.leave.add_leave(school_id, data.clone()).await?;

        // System Audit Log
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                admin_id,
                "LEAVE",
                &res["id"]
                    .as_i64()
                    .map(|id| id.to_string())
                    .unwrap_or_else(|| "0".to_string()),
                "CREATE",
                data,
            )
            .await;
        Ok(res)
    }

    async fn list_leaves(&self, school_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.leave.get_leaves(school_id).await?)
    }

    async fn approve_leave(&self, school_id: &str, admin_id: &str, leave_id: i32) -> AppResult<()> {
        let lid = leave_id.to_string();
        self.repos
            .leave
            .update_leave_status(school_id, &lid, "APPROVED")
            .await?;
        let _ = self
            .repos
            .audit
            .log_action(school_id, admin_id, "LEAVE", &lid, "APPROVE", json!({}))
            .await;
        Ok(())
    }

    async fn reject_leave(&self, school_id: &str, admin_id: &str, leave_id: i32) -> AppResult<()> {
        let lid = leave_id.to_string();
        self.repos
            .leave
            .update_leave_status(school_id, &lid, "REJECTED")
            .await?;
        let _ = self
            .repos
            .audit
            .log_action(school_id, admin_id, "LEAVE", &lid, "REJECT", json!({}))
            .await;
        Ok(())
    }

    async fn extend_leave(
        &self,
        school_id: &str,
        admin_id: &str,
        leave_id: i32,
        days: i32,
    ) -> AppResult<()> {
        let lid = leave_id.to_string();
        self.repos
            .leave
            .update_leave_duration(school_id, &lid, "EXTEND", days)
            .await?;
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                admin_id,
                "LEAVE",
                &lid,
                "EXTEND",
                json!({"days": days}),
            )
            .await;
        Ok(())
    }

    async fn reduce_leave(
        &self,
        school_id: &str,
        admin_id: &str,
        leave_id: i32,
        days: i32,
    ) -> AppResult<()> {
        let lid = leave_id.to_string();
        self.repos
            .leave
            .update_leave_duration(school_id, &lid, "REDUCE", days)
            .await?;
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                admin_id,
                "LEAVE",
                &lid,
                "REDUCE",
                json!({"days": days}),
            )
            .await;
        Ok(())
    }

    async fn download_leave_pdf(&self, _school_id: &str, _leave_id: i32) -> AppResult<Vec<u8>> {
        // Placeholder implementation
        Ok(vec![])
    }

    async fn get_proxy_suggestions(
        &self,
        school_id: &str,
        date: &str,
        period: &str,
        subject: Option<&str>,
    ) -> AppResult<Value> {
        let suggestions: Vec<serde_json::Value> = self
            .timetable
            .find_available_substitutes(school_id, 1, 1, subject)
            .await?;
        Ok(json!(suggestions))
    }

    async fn get_leaves(&self, school_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.leave.get_leaves(school_id).await?)
    }

    async fn update_leave_status(
        &self,
        school_id: &str,
        admin_id: &str,
        leave_id: &str,
        status: &str,
    ) -> AppResult<()> {
        self.repos
            .leave
            .update_leave_status(school_id, leave_id, status)
            .await?;
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                admin_id,
                "LEAVE",
                leave_id,
                "STATUS_UPDATE",
                json!({"status": status}),
            )
            .await;
        Ok(())
    }

    async fn update_leave_duration(
        &self,
        school_id: &str,
        admin_id: &str,
        leave_id: &str,
        action: &str,
        days: i32,
    ) -> AppResult<()> {
        self.repos
            .leave
            .update_leave_duration(school_id, leave_id, action, days)
            .await?;
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                admin_id,
                "LEAVE",
                leave_id,
                "DURATION_UPDATE",
                json!({"action": action, "days": days}),
            )
            .await;
        Ok(())
    }

    // Enhanced leave system methods
    async fn get_leave_balance(&self, school_id: &str, employee_id: &str) -> AppResult<Value> {
        // Placeholder implementation - should query leave_quotas table
        Ok(json!({
            "employeeId": employee_id,
            "casual": {"total": 12, "used": 2, "remaining": 10},
            "sick": {"total": 10, "used": 1, "remaining": 9},
            "annual": {"total": 30, "used": 5, "remaining": 25},
            "emergency": {"total": 5, "used": 0, "remaining": 5}
        }))
    }

    async fn get_leave_queue(&self, school_id: &str, filters: Value) -> AppResult<Vec<Value>> {
        // Get all leaves and apply filters
        let leaves = self.repos.leave.get_leaves(school_id).await?;

        // Simple filtering based on status
        let status_filter = filters["status"].as_str();
        let filtered = if let Some(status) = status_filter {
            leaves
                .into_iter()
                .filter(|l| l["status"].as_str() == Some(status))
                .collect()
        } else {
            leaves
        };

        Ok(filtered)
    }

    async fn get_leave_details(&self, school_id: &str, leave_id: &str) -> AppResult<Value> {
        match self.repos.leave.get_leave(school_id, leave_id).await? {
            Some(leave) => Ok(leave),
            None => Err(crate::error::AppError::NotFound(format!(
                "Leave {} not found",
                leave_id
            ))),
        }
    }

    // Conditional approval methods
    async fn apply_conditional_approval(
        &self,
        school_id: &str,
        admin_id: &str,
        leave_id: &str,
        conditions: Value,
    ) -> AppResult<Value> {
        // Update leave status to conditionally_approved
        self.repos
            .leave
            .update_leave_status(school_id, leave_id, "conditionally_approved")
            .await?;

        // Create conditional approval record
        let conditional_id = format!("CA{}", chrono::Utc::now().timestamp_millis());

        // Audit log
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                admin_id,
                "LEAVE_CONDITIONAL",
                leave_id,
                "CREATE",
                conditions.clone(),
            )
            .await;

        Ok(json!({
            "conditionalId": conditional_id,
            "leaveId": leave_id,
            "conditions": conditions,
            "status": "pending_response"
        }))
    }

    async fn respond_to_conditions(
        &self,
        school_id: &str,
        employee_id: &str,
        leave_id: &str,
        response: Value,
    ) -> AppResult<()> {
        // Update conditional approval response
        let accepted = response["accepted"].as_bool().unwrap_or(false);
        let new_status = if accepted { "approved" } else { "rejected" };

        self.repos
            .leave
            .update_leave_status(school_id, leave_id, new_status)
            .await?;

        // Audit log
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                employee_id,
                "LEAVE_CONDITIONAL",
                leave_id,
                "RESPOND",
                response,
            )
            .await;

        Ok(())
    }

    async fn get_conditional_templates(&self, school_id: &str) -> AppResult<Vec<Value>> {
        // Placeholder - return default templates
        Ok(vec![
            json!({
                "id": "template1",
                "name": "Standard Conditions",
                "description": "Default conditions for leave approval",
                "conditions": [
                    {"type": "coverage_required", "value": "Find replacement for classes"},
                    {"type": "documentation_required", "value": "Submit medical certificate"}
                ]
            }),
            json!({
                "id": "template2",
                "name": "Emergency Leave",
                "description": "Conditions for emergency leave",
                "conditions": [
                    {"type": "salary_deduction", "value": "1 day salary deduction"},
                    {"type": "alternative_arrangement", "value": "Make up missed work"}
                ]
            }),
        ])
    }

    async fn create_conditional_template(
        &self,
        school_id: &str,
        admin_id: &str,
        template: Value,
    ) -> AppResult<Value> {
        let template_id = format!("TEMP{}", chrono::Utc::now().timestamp_millis());

        // Audit log
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                admin_id,
                "LEAVE_TEMPLATE",
                &template_id,
                "CREATE",
                template.clone(),
            )
            .await;

        let mut result = template.clone();
        result["id"] = json!(template_id);
        result["schoolId"] = json!(school_id);

        Ok(result)
    }

    // Responsibility coverage methods
    async fn assign_coverage(
        &self,
        school_id: &str,
        admin_id: &str,
        leave_id: &str,
        coverage_data: Value,
    ) -> AppResult<Value> {
        // Extract coverage data
        let original_employee_id = coverage_data["originalEmployeeId"]
            .as_str()
            .ok_or("Original employee ID is required")?;
        let covering_employee_id = coverage_data["coveringEmployeeId"]
            .as_str()
            .ok_or("Covering employee ID is required")?;
        let responsibility_id = coverage_data["responsibilityId"]
            .as_str()
            .ok_or("Responsibility ID is required")?;
        let coverage_period_start = NaiveDate::parse_from_str(
            coverage_data["coveragePeriodStart"]
                .as_str()
                .ok_or("Coverage period start date is required")?,
            "%Y-%m-%d",
        )
        .map_err(|e| format!("Invalid start date format: {}", e))?;
        let coverage_period_end = NaiveDate::parse_from_str(
            coverage_data["coveragePeriodEnd"]
                .as_str()
                .ok_or("Coverage period end date is required")?,
            "%Y-%m-%d",
        )
        .map_err(|e| format!("Invalid end date format: {}", e))?;
        let notes = coverage_data["notes"].as_str().unwrap_or("");

        // Generate coverage ID
        let coverage_id = format!("COV{}", chrono::Utc::now().timestamp_millis());

        // Insert into responsibility_coverage table
        let mut conn = self
            .repos
            .db_client
            .acquire_tenant_connection(school_id)
            .await
            .map_err(|e| format!("Failed to acquire database connection: {}", e))?;

        sqlx::query(
            "INSERT INTO responsibility_coverage (
                coverage_id, leave_id, original_employee_id, covering_employee_id,
                responsibility_id, coverage_period_start, coverage_period_end,
                status, notes, school_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        )
        .bind(&coverage_id)
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
        .await
        .map_err(|e| format!("Failed to insert coverage record: {}", e))?;

        // Update leave application to mark coverage as assigned
        sqlx::query(
            "UPDATE leave_applications SET coverage_assigned = TRUE WHERE school_id = $1 AND leave_id = $2",
        )
        .bind(school_id)
        .bind(leave_id)
        .execute(&mut *conn)
        .await
        .map_err(|e| format!("Failed to update leave application: {}", e))?;

        // Audit log
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                admin_id,
                "LEAVE_COVERAGE",
                leave_id,
                "ASSIGN",
                coverage_data.clone(),
            )
            .await;

        // Build response
        let mut result = coverage_data.clone();
        result["coverageId"] = json!(coverage_id);
        result["status"] = json!("assigned");
        result["createdAt"] = json!(Utc::now().to_rfc3339());

        Ok(result)
    }

    async fn get_available_coverages(
        &self,
        school_id: &str,
        leave_id: &str,
    ) -> AppResult<Vec<Value>> {
        // Query responsibility_coverage table for this leave
        let mut conn = self
            .repos
            .db_client
            .acquire_tenant_connection(school_id)
            .await?;

        let rows = sqlx::query(
            "SELECT
                coverage_id, leave_id, original_employee_id, covering_employee_id,
                responsibility_id, coverage_period_start, coverage_period_end,
                status, notes, created_at, updated_at
             FROM responsibility_coverage
             WHERE school_id = $1 AND leave_id = $2
             ORDER BY created_at DESC",
        )
        .bind(school_id)
        .bind(leave_id)
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to query coverage records: {}", e)))?;

        let coverages: Vec<Value> = rows
            .into_iter()
            .map(|row| {
                json!({
                    "coverageId": row.get::<String, _>("coverage_id"),
                    "leaveId": row.get::<String, _>("leave_id"),
                    "originalEmployeeId": row.get::<String, _>("original_employee_id"),
                    "coveringEmployeeId": row.get::<String, _>("covering_employee_id"),
                    "responsibilityId": row.get::<String, _>("responsibility_id"),
                    "coveragePeriodStart": row.get::<NaiveDate, _>("coverage_period_start").to_string(),
                    "coveragePeriodEnd": row.get::<NaiveDate, _>("coverage_period_end").to_string(),
                    "status": row.get::<String, _>("status"),
                    "notes": row.get::<Option<String>, _>("notes").unwrap_or_default(),
                    "createdAt": row.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
                    "updatedAt": row.get::<chrono::DateTime<Utc>, _>("updated_at").to_rfc3339(),
                })
            })
            .collect();

        Ok(coverages)
    }

    async fn accept_coverage(
        &self,
        school_id: &str,
        employee_id: &str,
        coverage_id: &str,
    ) -> AppResult<()> {
        // Update coverage status to 'accepted' in database
        let mut conn = self
            .repos
            .db_client
            .acquire_tenant_connection(school_id)
            .await?;

        // First, verify the coverage exists and is assigned to this employee
        let row = sqlx::query(
            "SELECT covering_employee_id, status FROM responsibility_coverage
             WHERE school_id = $1 AND coverage_id = $2"
        )
        .bind(school_id)
        .bind(coverage_id)
        .fetch_optional(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to query coverage: {}", e)))?;

        match row {
            Some(row) => {
                let covering_employee_id = row.get::<String, _>("covering_employee_id");
                let current_status = row.get::<String, _>("status");
                
                // Check if the employee is the covering employee
                if covering_employee_id != employee_id {
                    return Err("You are not authorized to accept this coverage assignment".into());
                }
                
                // Check if coverage is already accepted
                if current_status == "accepted" {
                    return Err("Coverage has already been accepted".into());
                }
                
                // Check if coverage is in a valid state to accept
                if current_status != "assigned" {
                    return Err(format!("Cannot accept coverage with status: {}", current_status).into());
                }
                
                // Also fetch leave_id, original_employee_id, responsibility_id for delegation
                let delegation_row = sqlx::query(
                    "SELECT leave_id, original_employee_id, responsibility_id FROM responsibility_coverage
                     WHERE school_id = $1 AND coverage_id = $2"
                )
                .bind(school_id)
                .bind(coverage_id)
                .fetch_optional(&mut *conn)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to query coverage details: {}", e)))?;

                // Update the coverage status
                sqlx::query(
                    "UPDATE responsibility_coverage
                     SET status = 'accepted', updated_at = NOW()
                     WHERE school_id = $1 AND coverage_id = $2"
                )
                .bind(school_id)
                .bind(coverage_id)
                .execute(&mut *conn)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to update coverage status: {}", e)))?;

                // Temporarily delegate responsibility to covering employee
                if let Some(dr) = delegation_row {
                    let orig_emp: String = dr.get("original_employee_id");
                    let resp_id: String = dr.get("responsibility_id");
                    let lid: String = dr.get("leave_id");

                    // Get original employee's space_ids for this responsibility
                    let orig_spaces: Option<Value> = sqlx::query_scalar(
                        "SELECT space_ids FROM employee_responsibilities
                         WHERE school_id = $1 AND employee_id = $2 AND responsibility_id = $3"
                    )
                    .bind(school_id)
                    .bind(&orig_emp)
                    .bind(&resp_id)
                    .fetch_optional(&mut *conn)
                    .await?;

                    let space_ids: Vec<String> = orig_spaces
                        .and_then(|v| v.as_array().map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect()))
                        .unwrap_or_default();

                    // Add covering employee to the responsibility with same spaces
                    sqlx::query(
                        "INSERT INTO employee_responsibilities (school_id, employee_id, responsibility_id, space_ids)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT (school_id, employee_id, responsibility_id) DO UPDATE SET
                         space_ids = EXCLUDED.space_ids, updated_at = NOW()"
                    )
                    .bind(school_id)
                    .bind(&covering_employee_id)
                    .bind(&resp_id)
                    .bind(&space_ids)
                    .execute(&mut *conn)
                    .await
                    .map_err(|e| AppError::Internal(format!("Failed to delegate responsibility: {}", e)))?;

                    // Log delegation in history
                    let _ = sqlx::query(
                        "INSERT INTO responsibility_assignment_history (school_id, responsibility_id, employee_id,
                         action, previous_space_ids, version, performed_by, reason, performed_at)
                         VALUES ($1, $2, $3, 'coverage_accepted', $4, 1, $5, $6, NOW())"
                    )
                    .bind(school_id)
                    .bind(&resp_id)
                    .bind(&covering_employee_id)
                    .bind(&space_ids)
                    .bind(employee_id)
                    .bind(format!("Leave coverage for {} (leave {})", orig_emp, lid))
                    .execute(&mut *conn)
                    .await;
                }
            }
            None => {
                return Err("Coverage record not found".into());
            }
        }

        // Audit log
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                employee_id,
                "LEAVE_COVERAGE",
                coverage_id,
                "ACCEPT",
                json!({"responsibilityDelegated": true}),
            )
            .await;

        Ok(())
    }

    // Workload assessment methods
    async fn assess_workload(&self, school_id: &str, leave_id: &str) -> AppResult<Value> {
        // 1. Get the leave details to find the employee and dates
        let leave = self.repos.leave.get_leave(school_id, leave_id).await?
            .ok_or_else(|| AppError::NotFound("Leave not found".to_string()))?;

        let employee_id = leave["employeeId"].as_str().unwrap_or("");
        let from_date = leave["fromDate"].as_str().unwrap_or("");
        let to_date = leave["toDate"].as_str().unwrap_or("");

        if employee_id.is_empty() {
            return Ok(json!({"leaveId": leave_id, "workloadImpact": "none", "affectedCount": 0, "recommendations": []}));
        }

        // 2. Get employee's responsibilities
        let responsibilities = self
            .repos
            .responsibility
            .get_employee_responsibilities(school_id, employee_id)
            .await
            .unwrap_or_default();

        if responsibilities.is_empty() {
            return Ok(json!({
                "leaveId": leave_id,
                "employeeId": employee_id,
                "workloadImpact": "low",
                "impactScore": 10,
                "affectedResponsibilities": [],
                "recommendations": ["No responsibilities to cover"]
            }));
        }

        // 3. For each responsibility, find potential covering employees
        let mut affected = Vec::new();
        let mut total_sessions = 0i32;

        for resp in &responsibilities {
            let resp_id = resp["responsibilityId"].as_str().unwrap_or("");
            let resp_name = resp["name"].as_str().unwrap_or("Unknown");
            let resp_type = resp["employeeType"].as_str().unwrap_or("");

            // Find employees with same employee_type who can cover
            let matching_employees = self
                .find_matching_employees_for_responsibility(school_id, resp_id, employee_id, from_date, to_date)
                .await
                .unwrap_or_default();

            let sessions = 3i32; // Estimate: ~3 sessions per leave day for teaching
            total_sessions += sessions;

            affected.push(json!({
                "responsibilityId": resp_id,
                "name": resp_name,
                "employeeType": resp_type,
                "sessionsAffected": sessions,
                "coverageRequired": true,
                "matchingCoverageEmployees": matching_employees
            }));
        }

        let impact_score = if total_sessions > 15 { 85 } else if total_sessions > 8 { 60 } else { 35 };
        let workload_impact = if impact_score > 70 { "high" } else if impact_score > 40 { "medium" } else { "low" };
        let risk_level = if impact_score > 70 { "high" } else if impact_score > 40 { "medium" } else { "low" };

        let mut recommendations = Vec::new();
        if total_sessions > 0 {
            recommendations.push("Arrange coverage for affected responsibilities".to_string());
            recommendations.push("Notify covering employees via email".to_string());
        }
        if total_sessions > 10 {
            recommendations.push("Consider rescheduling non-critical sessions".to_string());
        }

        // 4. Store workload assessment in DB
        if let Ok(mut conn) = self.repos.db_client.acquire_tenant_connection(school_id).await {
            // Delete existing assessment for this leave to allow re-assessment
            let _ = sqlx::query(
                "DELETE FROM workload_assessment WHERE leave_id = $1 AND school_id = $2"
            )
            .bind(leave_id)
            .bind(school_id)
            .execute(&mut *conn)
            .await;
            let _ = sqlx::query(
                "INSERT INTO workload_assessment (assessment_id, leave_id, school_id, employee_id,
                 assessment_date, impact_score, workload_category, coverage_needed, notes)
                 VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8)"
            )
            .bind(format!("WA{}", chrono::Utc::now().timestamp_millis()))
            .bind(leave_id)
            .bind(school_id)
            .bind(employee_id)
            .bind(impact_score)
            .bind(workload_impact)
            .bind(total_sessions > 0)
            .bind(serde_json::to_string(&affected).unwrap_or_default())
            .execute(&mut *conn)
            .await;
        }

        Ok(json!({
            "leaveId": leave_id,
            "employeeId": employee_id,
            "workloadImpact": workload_impact,
            "impactScore": impact_score,
            "affectedResponsibilities": affected,
            "totalSessionsAffected": total_sessions,
            "recommendations": recommendations,
            "riskLevel": risk_level
        }))
    }

    async fn get_workload_assessment(&self, school_id: &str, leave_id: &str) -> AppResult<Value> {
        // Try DB first
        if let Ok(mut conn) = self.repos.db_client.acquire_tenant_connection(school_id).await {
            if let Ok(Some(row)) = sqlx::query(
                "SELECT * FROM workload_assessment WHERE school_id = $1 AND leave_id = $2"
            )
            .bind(school_id)
            .bind(leave_id)
            .fetch_optional(&mut *conn)
            .await
            {
                return Ok(json!({
                    "leaveId": row.get::<String, _>("leave_id"),
                    "workloadImpact": row.get::<Option<String>, _>("workload_category").unwrap_or_default(),
                    "impactScore": row.get::<Option<i32>, _>("impact_score").unwrap_or(0),
                    "coverageNeeded": row.get::<Option<bool>, _>("coverage_needed").unwrap_or(false),
                    "assessmentDate": row.get::<Option<String>, _>("assessment_date").unwrap_or_default(),
                    "notes": row.get::<Option<String>, _>("notes").unwrap_or_default()
                }));
            }
        }
        // Fallback: run fresh assessment
        self.assess_workload(school_id, leave_id).await
    }

    // Notification methods
    async fn get_notifications(
        &self,
        school_id: &str,
        recipient_id: &str,
        unread_only: bool,
    ) -> AppResult<Vec<Value>> {
        // Placeholder - return empty notifications
        Ok(vec![
            json!({
                "id": "notif1",
                "type": "leave_submitted",
                "title": "New Leave Request",
                "message": "Employee John Doe submitted a leave request",
                "timestamp": chrono::Utc::now().to_rfc3339(),
                "read": false,
                "data": {"leaveId": "LV123"}
            }),
            json!({
                "id": "notif2",
                "type": "conditional_approval",
                "title": "Conditional Approval Required",
                "message": "Please respond to conditions for your leave request",
                "timestamp": chrono::Utc::now().to_rfc3339(),
                "read": true,
                "data": {"leaveId": "LV456"}
            }),
        ])
    }

    async fn mark_notification_read(
        &self,
        school_id: &str,
        notification_id: &str,
    ) -> AppResult<()> {
        // Placeholder - just log
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                "system",
                "NOTIFICATION",
                notification_id,
                "MARK_READ",
                json!({}),
            )
            .await;
        Ok(())
    }

    // Feature flag methods
    async fn get_feature_flags(&self, school_id: &str) -> AppResult<Value> {
        Ok(json!({
            "enhanced_leave_system": true,
            "conditional_approvals": true,
            "real_time_notifications": true,
            "mobile_leave_submission": true,
            "workload_assessment": true,
            "responsibility_coverage": true
        }))
    }

    async fn update_feature_flags(
        &self,
        school_id: &str,
        admin_id: &str,
        flags: Value,
    ) -> AppResult<()> {
        // Audit log
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                admin_id,
                "FEATURE_FLAGS",
                school_id,
                "UPDATE",
                flags.clone(),
            )
            .await;
        Ok(())
    }
}
