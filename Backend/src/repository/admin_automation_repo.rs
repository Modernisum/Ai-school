use crate::db::DbClient;
use crate::repository::traits::*;
use crate::services::traits::admin_automation::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::{Row, Acquire};
use std::sync::Arc;

pub struct PostgresAdminAutomationRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl AdminAutomationRepository for PostgresAdminAutomationRepository {
    async fn find_user_by_role(&self, school_id: &str, role: &str) -> Result<Option<String>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let user_id: Option<String> = sqlx::query_scalar(
            "SELECT user_id FROM user_roles WHERE school_id = $1 AND role = $2 LIMIT 1"
        )
        .bind(school_id)
        .bind(role)
        .fetch_optional(&mut *conn)
        .await?;
        Ok(user_id)
    }

    async fn create_form_template(&self, school_id: &str, template: &FormTemplateCreate) -> Result<FormTemplate, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let result = sqlx::query_as::<_, FormTemplate>(
            r#"
            INSERT INTO form_templates (
                school_id, name, description, form_type, form_schema,
                validation_rules, workflow_steps, approval_required,
                approval_roles, notification_settings, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            "#,
        )
        .bind(school_id)
        .bind(&template.name)
        .bind(&template.description)
        .bind(&template.form_type)
        .bind(&template.form_schema)
        .bind(template.validation_rules.as_ref().unwrap_or(&json!({})))
        .bind(template.workflow_steps.as_ref().unwrap_or(&json!([])))
        .bind(template.approval_required.unwrap_or(false))
        .bind(template.approval_roles.as_ref().unwrap_or(&json!([])))
        .bind(template.notification_settings.as_ref().unwrap_or(&json!({})))
        .bind(template.created_by.as_deref().unwrap_or("system"))
        .fetch_one(&mut *conn)
        .await?;
        Ok(result)
    }

    async fn get_form_templates(&self, school_id: &str, form_type: Option<&str>) -> Result<Vec<FormTemplate>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let templates = if let Some(form_type) = form_type {
            sqlx::query_as::<_, FormTemplate>(
                "SELECT * FROM form_templates WHERE school_id = $1 AND form_type = $2 AND is_active = true ORDER BY created_at DESC"
            )
            .bind(school_id)
            .bind(form_type)
            .fetch_all(&mut *conn)
            .await?
        } else {
            sqlx::query_as::<_, FormTemplate>(
                "SELECT * FROM form_templates WHERE school_id = $1 AND is_active = true ORDER BY created_at DESC"
            )
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?
        };
        Ok(templates)
    }

    async fn check_form_template_exists(&self, school_id: &str, template_id: i32) -> Result<bool, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM form_templates WHERE id = $1 AND school_id = $2 AND is_active = true)"
        )
        .bind(template_id)
        .bind(school_id)
        .fetch_one(&mut *conn)
        .await?;
        Ok(exists)
    }

    async fn submit_form(&self, school_id: &str, submission: &FormSubmissionCreate) -> Result<FormSubmission, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let result = sqlx::query_as::<_, FormSubmission>(
            r#"
            INSERT INTO form_submissions (
                school_id, template_id, form_type, submitted_by,
                submitted_by_role, form_data, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'pending')
            RETURNING *
            "#,
        )
        .bind(school_id)
        .bind(submission.template_id)
        .bind(&submission.form_type)
        .bind(&submission.submitted_by)
        .bind(&submission.submitted_by_role)
        .bind(&submission.form_data)
        .fetch_one(&mut *conn)
        .await?;
        Ok(result)
    }

    async fn get_form_template_by_id(&self, school_id: &str, template_id: i32) -> Result<Option<FormTemplate>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let template = sqlx::query_as::<_, FormTemplate>(
            "SELECT * FROM form_templates WHERE id = $1 AND school_id = $2"
        )
        .bind(template_id)
        .bind(school_id)
        .fetch_optional(&mut *conn)
        .await?;
        Ok(template)
    }

    async fn get_form_submissions(&self, school_id: &str, status: Option<&str>, form_type: Option<&str>) -> Result<Vec<FormSubmission>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut query = "SELECT * FROM form_submissions WHERE school_id = $1".to_string();
        let mut params: Vec<String> = vec![school_id.to_string()];
        let mut param_count = 2;

        if let Some(status) = status {
            query.push_str(&format!(" AND status = ${}", param_count));
            params.push(status.to_string());
            param_count += 1;
        }

        if let Some(form_type) = form_type {
            query.push_str(&format!(" AND form_type = ${}", param_count));
            params.push(form_type.to_string());
            param_count += 1;
        }

        query.push_str(" ORDER BY created_at DESC");

        let mut sqlx_query = sqlx::query_as::<_, FormSubmission>(&query);
        for param in params {
            sqlx_query = sqlx_query.bind(param);
        }

        let submissions = sqlx_query.fetch_all(&mut *conn).await?;
        Ok(submissions)
    }

    async fn update_form_submission_status(
        &self,
        school_id: &str,
        submission_id: uuid::Uuid,
        status: &str,
        reviewer_notes: Option<&str>,
        processed_by: &str,
    ) -> Result<FormSubmission, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let result = sqlx::query_as::<_, FormSubmission>(
            r#"
            UPDATE form_submissions 
            SET status = $1, 
                reviewer_notes = $2,
                processed_by = $3,
                processed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 AND school_id = $5
            RETURNING *
            "#,
        )
        .bind(status)
        .bind(reviewer_notes)
        .bind(processed_by)
        .bind(submission_id)
        .bind(school_id)
        .fetch_one(&mut *conn)
        .await?;
        Ok(result)
    }

    async fn insert_form_submission_history(
        &self,
        submission_id: uuid::Uuid,
        status: &str,
        changed_by: &str,
        notes: Option<&str>,
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO form_submission_history (submission_id, status, changed_by, notes, created_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)"
        )
        .bind(submission_id)
        .bind(status)
        .bind(changed_by)
        .bind(notes)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }

    async fn create_automated_report(
        &self,
        school_id: &str,
        report: &AutomatedReportCreate,
        next_scheduled_at: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<AutomatedReport, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let result = sqlx::query_as::<_, AutomatedReport>(
            r#"
            INSERT INTO automated_reports (
                school_id, report_type, report_name, description,
                schedule_type, schedule_config, recipient_emails,
                recipient_roles, report_config, template_path,
                next_scheduled_at, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
            "#,
        )
        .bind(school_id)
        .bind(&report.report_type)
        .bind(&report.report_name)
        .bind(&report.description)
        .bind(&report.schedule_type)
        .bind(report.schedule_config.as_ref().unwrap_or(&json!({})))
        .bind(report.recipient_emails.as_ref().unwrap_or(&json!([])))
        .bind(report.recipient_roles.as_ref().unwrap_or(&json!([])))
        .bind(&report.report_config)
        .bind(&report.template_path)
        .bind(next_scheduled_at)
        .bind(report.created_by.as_deref().unwrap_or("system"))
        .fetch_one(&mut *conn)
        .await?;
        Ok(result)
    }

    async fn get_automated_report_by_id(&self, school_id: &str, report_id: uuid::Uuid) -> Result<AutomatedReport, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let report = sqlx::query_as::<_, AutomatedReport>(
            "SELECT * FROM automated_reports WHERE id = $1 AND school_id = $2"
        )
        .bind(report_id)
        .bind(school_id)
        .fetch_one(&mut *conn)
        .await?;
        Ok(report)
    }

    async fn check_email_exists_in_queue(&self, school_id: &str, email_id: uuid::Uuid) -> Result<bool, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let existing: Option<(uuid::Uuid,)> = sqlx::query_as(
            "SELECT id FROM email_processing_queue WHERE school_id = $1 AND email_id = $2"
        )
        .bind(school_id)
        .bind(email_id.to_string())
        .fetch_optional(&mut *conn)
        .await?;
        Ok(existing.is_some())
    }

    async fn insert_email_into_queue(&self, school_id: &str, email: &EmailData, email_uuid: uuid::Uuid) -> Result<uuid::Uuid, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let inserted_id: uuid::Uuid = sqlx::query_scalar(
            r#"
            INSERT INTO email_processing_queue (
                school_id, email_id, sender_email, recipient_email,
                subject, body_text, body_html, attachments,
                processing_status, received_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', CURRENT_TIMESTAMP)
            RETURNING id
            "#
        )
        .bind(school_id)
        .bind(&email.email_id)
        .bind(&email.sender_email)
        .bind(&email.recipient_email)
        .bind(&email.subject)
        .bind(&email.body_text)
        .bind(email.body_html.as_deref())
        .bind(json!(email.attachments))
        .fetch_one(&mut *conn)
        .await?;
        Ok(inserted_id)
    }

    async fn get_email_processing_rules(&self, school_id: &str) -> Result<Vec<(uuid::Uuid, serde_json::Value, serde_json::Value, String, Option<String>)>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rules = sqlx::query_as(
            "SELECT id, match_conditions, actions, category, assign_to_role
             FROM email_processing_rules
             WHERE school_id = $1 AND is_active = true
             ORDER BY priority ASC"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;
        Ok(rules)
    }

    async fn create_support_request(&self, school_id: &str, message: &str, contact_info: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "INSERT INTO support_requests (school_id, message, contact_info, status, created_at)
             VALUES ($1, $2, $3, 'open', CURRENT_TIMESTAMP)"
        )
        .bind(school_id)
        .bind(message)
        .bind(contact_info)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    async fn update_email_queue_status(
        &self,
        school_id: &str,
        queue_id: uuid::Uuid,
        category: Option<&str>,
        assigned_to: Option<&str>,
        status: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "UPDATE email_processing_queue
             SET category = $1, assigned_to = $2, processing_status = $3
             WHERE id = $4 AND school_id = $5"
        )
        .bind(category)
        .bind(assigned_to)
        .bind(status)
        .bind(queue_id)
        .bind(school_id)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    async fn get_active_timetable_slots(&self, school_id: &str) -> Result<Vec<(uuid::Uuid, String, String, i32, chrono::NaiveTime, chrono::NaiveTime)>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let slots = sqlx::query_as(
            r#"
            SELECT ts.id, ts.teacher_id, ts.room_id, ts.day_of_week, ts.start_time, ts.end_time
            FROM timetable_slots ts
            JOIN timetable_configs tc ON ts.config_id = tc.config_id
            WHERE ts.school_id = $1 AND tc.status = 'ACTIVE'
            ORDER BY ts.day_of_week, ts.start_time
            "#
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;
        Ok(slots)
    }

    async fn insert_timetable_conflict(&self, conflict: &TimetableConflict) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO admin_timetable_conflicts (
                id, school_id, conflict_type, entity_type, entity_id,
                conflicting_with_type, conflicting_with_id, timetable_slot_id,
                day_of_week, start_time, end_time, severity, description,
                detected_at, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            "#
        )
        .bind(&conflict.id)
        .bind(&conflict.school_id)
        .bind(&conflict.conflict_type)
        .bind(&conflict.entity_type)
        .bind(&conflict.entity_id)
        .bind(&conflict.conflicting_with_type)
        .bind(&conflict.conflicting_with_id)
        .bind(&conflict.timetable_slot_id)
        .bind(&conflict.day_of_week)
        .bind(&conflict.start_time)
        .bind(&conflict.end_time)
        .bind(&conflict.severity)
        .bind(&conflict.description)
        .bind(&conflict.detected_at)
        .bind(&conflict.metadata)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }

    async fn create_admin_task(&self, school_id: &str, task: &AdminTaskCreate) -> Result<AdminTask, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let result = sqlx::query_as::<_, AdminTask>(
            r#"
            INSERT INTO admin_tasks (
                school_id, task_type, task_name, description,
                payload, priority, status, scheduled_for,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, 'system')
            RETURNING *
            "#
        )
        .bind(school_id)
        .bind(&task.task_type)
        .bind(&task.task_name)
        .bind(&task.description)
        .bind(task.payload.as_ref().unwrap_or(&json!({})))
        .bind(task.priority.as_deref().unwrap_or("5"))
        .bind(&task.scheduled_for)
        .fetch_one(&mut *conn)
        .await?;
        Ok(result)
    }
}
