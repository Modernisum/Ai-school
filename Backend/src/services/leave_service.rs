use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use chrono::{NaiveDate, Utc};
use serde_json::{json, Value};
use std::sync::Arc;

pub struct PostgresLeaveService {
    pub repos: Arc<Repositories>,
    pub timetable: Arc<crate::logic::timetable_engine::TimetableEngine>,
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
        // Map date/teacher to day/period for the engine (simplified logic)
        // In a real scenario, we'd lookup the teacher's schedule for that date.
        let suggestions: Vec<serde_json::Value> = self
            .timetable
            .find_available_substitutes(school_id, 1, 1, None)
            .await?;
        Ok(json!({
            "suggestions": suggestions,
            "meta": { "date": date, "period": period, "subject": subject }
        }))
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
        let coverage_id = format!("COV{}", chrono::Utc::now().timestamp_millis());

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

        let mut result = coverage_data.clone();
        result["coverageId"] = json!(coverage_id);
        result["status"] = json!("assigned");

        Ok(result)
    }

    async fn get_available_coverages(
        &self,
        school_id: &str,
        leave_id: &str,
    ) -> AppResult<Vec<Value>> {
        // Placeholder - return empty list
        Ok(vec![])
    }

    async fn accept_coverage(
        &self,
        school_id: &str,
        employee_id: &str,
        coverage_id: &str,
    ) -> AppResult<()> {
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
                json!({}),
            )
            .await;

        Ok(())
    }

    // Workload assessment methods
    async fn assess_workload(&self, school_id: &str, leave_id: &str) -> AppResult<Value> {
        // Placeholder workload assessment
        Ok(json!({
            "leaveId": leave_id,
            "workloadScore": 75,
            "feasibility": "moderate",
            "recommendations": [
                "Consider partial coverage for critical responsibilities",
                "Schedule make-up sessions for missed classes"
            ],
            "riskLevel": "medium"
        }))
    }

    async fn get_workload_assessment(&self, school_id: &str, leave_id: &str) -> AppResult<Value> {
        // Same as assess_workload for now
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
