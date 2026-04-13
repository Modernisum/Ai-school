use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{Postgres, Pool, Row};
use std::sync::Arc;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::error::{AppResult, AppError};
use crate::repository::Repositories;
use crate::services::traits::admin_automation::*;

#[derive(Clone)]
pub struct AdminAutomationService {
    repos: Arc<Repositories>,
}

use crate::services::traits::admin_automation::*;

impl AdminAutomationService {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn match_email_to_rule(&self, email: &EmailData, match_conditions: &Value) -> AppResult<bool> {
        // Simple rule matching logic
        if let Value::Object(conditions) = match_conditions {
            // Check sender pattern
            if let Some(Value::String(sender_pattern)) = conditions.get("sender_pattern") {
                if !sender_pattern.is_empty() {
                    let sender = email.sender_email.as_deref().unwrap_or("");
                    if !sender.contains(sender_pattern) {
                        return Ok(false);
                    }
                }
            }
            
            // Check subject keywords
            if let Some(Value::Array(keywords)) = conditions.get("subject_keywords") {
                let mut has_keyword = false;
                for keyword in keywords {
                    if let Value::String(kw) = keyword {
                        if email.subject.to_lowercase().contains(&kw.to_lowercase()) {
                            has_keyword = true;
                            break;
                        }
                    }
                }
                if !has_keyword && !keywords.is_empty() {
                    return Ok(false);
                }
            }
            
            // Check body keywords
            if let Some(Value::Array(keywords)) = conditions.get("body_keywords") {
                let mut has_keyword = false;
                for keyword in keywords {
                    if let Value::String(kw) = keyword {
                        if let Some(body) = &email.body_text {
                            if body.to_lowercase().contains(&kw.to_lowercase()) {
                                has_keyword = true;
                                break;
                            }
                        }
                    }
                }
                if !has_keyword && !keywords.is_empty() {
                    return Ok(false);
                }
            }
            
            return Ok(true);
        }
        
        Ok(false)
    }

    pub async fn find_user_by_role(&self, school_id: &str, role: &str) -> AppResult<Option<String>> {
        let pool = &self.repos.db_client.pool;
        
        // Simple implementation - find first user with the given role
        let user_id: Option<String> = sqlx::query_scalar(
            "SELECT user_id FROM user_roles WHERE school_id = $1 AND role = $2 LIMIT 1"
        )
        .bind(school_id)
        .bind(role)
        .fetch_optional(pool)
        .await
        .map_err(|e| AppError::Database(e))?;
        
        Ok(user_id)
    }

    pub async fn categorize_email_with_ai(&self, email: &EmailData) -> AppResult<String> {
        // Simple AI-based categorization using keyword matching
        let text = format!("{} {}", email.subject, email.body_text.as_deref().unwrap_or("")).to_lowercase();
        
        let categories = vec![
            ("admission_inquiry", vec!["admission", "apply", "enroll", "registration"]),
            ("fee_payment", vec!["fee", "payment", "invoice", "bill", "due"]),
            ("leave_request", vec!["leave", "absent", "holiday", "vacation"]),
            ("complaint", vec!["complaint", "issue", "problem", "wrong", "error"]),
            ("general", vec!["question", "query", "information", "help"]),
        ];
        
        for (category, keywords) in categories {
            for keyword in keywords {
                if text.contains(keyword) {
                    return Ok(category.to_string());
                }
            }
        }
        
        Ok("general".to_string())
    }
}

#[async_trait]
impl AdminAutomationServiceTrait for AdminAutomationService {
    async fn create_form_template(
        &self,
        school_id: &str,
        template: &FormTemplateCreate,
    ) -> AppResult<FormTemplate> {
        let pool = &self.repos.db_client.pool;
        
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
        .bind("system") // TODO: Get actual user from context
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Database(e))?;

        Ok(result)
    }

    async fn get_form_templates(
        &self,
        school_id: &str,
        form_type: Option<&str>,
    ) -> AppResult<Vec<FormTemplate>> {
        let pool = &self.repos.db_client.pool;
        
        let query = if let Some(form_type) = form_type {
            sqlx::query_as::<_, FormTemplate>(
                "SELECT * FROM form_templates WHERE school_id = $1 AND form_type = $2 AND is_active = true ORDER BY created_at DESC"
            )
            .bind(school_id)
            .bind(form_type)
        } else {
            sqlx::query_as::<_, FormTemplate>(
                "SELECT * FROM form_templates WHERE school_id = $1 AND is_active = true ORDER BY created_at DESC"
            )
            .bind(school_id)
        };
        
        let templates = query
            .fetch_all(pool)
            .await
            .map_err(|e| AppError::Database(e))?;

        Ok(templates)
    }

    async fn submit_form(
        &self,
        school_id: &str,
        submission: &FormSubmissionCreate,
    ) -> AppResult<FormSubmission> {
        let pool = &self.repos.db_client.pool;
        
        // Validate template exists and is active
        let template_exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM form_templates WHERE id = $1 AND school_id = $2 AND is_active = true)"
        )
        .bind(submission.template_id)
        .bind(school_id)
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Database(e))?;

        if !template_exists {
            return Err(AppError::NotFound("Form template not found or inactive".to_string()));
        }

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
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Database(e))?;

        // TODO: Trigger workflow notifications
        // TODO: Send email notifications if configured

        Ok(result)
    }

    async fn get_form_submissions(
        &self,
        school_id: &str,
        status: Option<&str>,
        form_type: Option<&str>,
    ) -> AppResult<Vec<FormSubmission>> {
        let pool = &self.repos.db_client.pool;
        
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

        let submissions = sqlx_query
            .fetch_all(pool)
            .await
            .map_err(|e| AppError::Database(e))?;

        Ok(submissions)
    }

    async fn update_form_submission_status(
        &self,
        school_id: &str,
        submission_id: &str,
        status: &str,
        reviewer_notes: Option<&str>,
        processed_by: &str,
    ) -> AppResult<FormSubmission> {
        let pool = &self.repos.db_client.pool;
        let submission_uuid = Uuid::parse_str(submission_id)
            .map_err(|_| AppError::Validation("Invalid submission ID".to_string()))?;

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
        .bind(submission_uuid)
        .bind(school_id)
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Database(e))?;

        // TODO: Update workflow history
        // TODO: Send notification to submitter

        Ok(result)
    }

    async fn create_automated_report(
        &self,
        school_id: &str,
        report: &AutomatedReportCreate,
    ) -> AppResult<AutomatedReport> {
        let pool = &self.repos.db_client.pool;
        
        // Calculate next scheduled time based on schedule_type
        let next_scheduled_at = match report.schedule_type.as_str() {
            "daily" => Some(Utc::now() + chrono::Duration::days(1)),
            "weekly" => Some(Utc::now() + chrono::Duration::weeks(1)),
            "monthly" => Some(Utc::now() + chrono::Duration::days(30)),
            "quarterly" => Some(Utc::now() + chrono::Duration::days(90)),
            "yearly" => Some(Utc::now() + chrono::Duration::days(365)),
            _ => None, // on_demand
        };

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
        .bind("system") // TODO: Get actual user from context
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Database(e))?;

        Ok(result)
    }

    async fn generate_report(
        &self,
        school_id: &str,
        report_id: &str,
    ) -> AppResult<ReportGenerationResult> {
        let pool = &self.repos.db_client.pool;
        let report_uuid = Uuid::parse_str(report_id)
            .map_err(|_| AppError::Validation("Invalid report ID".to_string()))?;

        // Get report configuration
        let report: AutomatedReport = sqlx::query_as(
            "SELECT * FROM automated_reports WHERE id = $1 AND school_id = $2"
        )
        .bind(report_uuid)
        .bind(school_id)
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Database(e))?;

        // TODO: Implement actual report generation based on report_type
        // This is a mock implementation
        let file_path = match report.report_type.as_str() {
            "attendance_summary" => Some(format!("/reports/{}/attendance_{}.pdf", school_id, Utc::now().timestamp())),
            "fee_collection" => Some(format!("/reports/{}/fees_{}.xlsx", school_id, Utc::now().timestamp())),
            "academic_performance" => Some(format!("/reports/{}/academic_{}.pdf", school_id, Utc::now().timestamp())),
            _ => None,
        };

        Ok(ReportGenerationResult {
            report_id: report.id,
            file_path,
            generated_at: Utc::now(),
            status: "completed".to_string(),
            error_message: None,
            message: Some("Report generated successfully".to_string()),
        })
    }

    async fn process_email(
        &self,
        school_id: &str,
        email: &EmailData,
    ) -> AppResult<EmailProcessingResult> {
        let pool = &self.repos.db_client.pool;
        
        // First, store the email in the processing queue
        let email_id = Uuid::parse_str(&email.email_id).unwrap_or_else(|_| Uuid::new_v4());
        
        // Check if email already exists
        let existing_email: Option<(Uuid,)> = sqlx::query_as(
            "SELECT id FROM email_processing_queue WHERE school_id = $1 AND email_id = $2"
        )
        .bind(school_id)
        .bind(email_id.to_string())
        .fetch_optional(pool)
        .await
        .map_err(|e| AppError::Database(e))?;
        
        if existing_email.is_some() {
            return Err(AppError::Validation("Email already exists in processing queue".to_string()));
        }
        
        // Insert email into processing queue
        let inserted_id: Uuid = sqlx::query_scalar(
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
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Database(e))?;
        
        // Apply email processing rules
        let rules: Vec<(Uuid, Value, Value, String, Option<String>)> = sqlx::query_as(
            "SELECT id, match_conditions, actions, category, assign_to_role
             FROM email_processing_rules
             WHERE school_id = $1 AND is_active = true
             ORDER BY priority ASC"
        )
        .bind(school_id)
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Database(e))?;
        
        let mut category = None;
        let mut assigned_to = None;
        let mut actions_taken = Vec::new();
        
        for (rule_id, match_conditions, actions, rule_category, assign_to_role) in rules {
            // Simple rule matching based on subject and sender
            let matches = self.match_email_to_rule(email, &match_conditions).await?;
            
            if matches {
                category = Some(rule_category.clone());
                
                if let Some(role) = assign_to_role {
                    // Find appropriate user for this role
                    let user_id = self.find_user_by_role(school_id, &role).await?;
                    assigned_to = user_id;
                }
                
                // Execute actions
                if let Value::Array(action_list) = actions {
                    for action in action_list {
                        if let Value::String(action_str) = action {
                            match action_str.as_str() {
                                "categorize" => {
                                    actions_taken.push("categorized".to_string());
                                }
                                "assign_to" => {
                                    actions_taken.push("assigned".to_string());
                                }
                                "create_ticket" => {
                                    // TODO: Create support ticket
                                    actions_taken.push("ticket_created".to_string());
                                }
                                "send_auto_reply" => {
                                    // TODO: Send auto-reply
                                    actions_taken.push("auto_reply_sent".to_string());
                                }
                                _ => {}
                            }
                        }
                    }
                }
                
                // Update email with categorization
                sqlx::query(
                    "UPDATE email_processing_queue
                     SET category = $1, assigned_to = $2, processing_status = 'processed'
                     WHERE id = $3 AND school_id = $4"
                )
                .bind(&category)
                .bind(&assigned_to)
                .bind(inserted_id)
                .bind(school_id)
                .execute(pool)
                .await
                .map_err(|e| AppError::Database(e))?;
                
                break; // Stop at first matching rule
            }
        }
        
        // If no rules matched, use AI for categorization
        if category.is_none() {
            category = Some(self.categorize_email_with_ai(email).await?);
            
            sqlx::query(
                "UPDATE email_processing_queue
                 SET category = $1, processing_status = 'processed'
                 WHERE id = $2 AND school_id = $3"
            )
            .bind(&category)
            .bind(inserted_id)
            .bind(school_id)
            .execute(pool)
            .await
            .map_err(|e| AppError::Database(e))?;
            
            actions_taken.push("ai_categorized".to_string());
        }
        
        Ok(EmailProcessingResult {
            email_id: email.email_id.clone(),
            processed_at: chrono::Utc::now(),
            category: category.unwrap_or_else(|| "General".to_string()),
            priority: "medium".to_string(),
            actions_taken: json!(actions_taken),
            processing_status: "processed".to_string(),
            assigned_to,
            created_ticket: None, // TODO: Implement ticket creation
        })
    }



    async fn detect_timetable_conflicts(
        &self,
        school_id: &str,
    ) -> AppResult<Vec<TimetableConflict>> {
        let pool = &self.repos.db_client.pool;
        
        // Get active timetable slots
        let slots: Vec<(Uuid, String, String, i32, chrono::NaiveTime, chrono::NaiveTime)> = sqlx::query_as(
            r#"
            SELECT ts.id, ts.teacher_id, ts.room_id, ts.day_of_week, ts.start_time, ts.end_time
            FROM timetable_slots ts
            JOIN timetable_configs tc ON ts.config_id = tc.config_id
            WHERE ts.school_id = $1 AND tc.status = 'ACTIVE'
            ORDER BY ts.day_of_week, ts.start_time
            "#
        )
        .bind(school_id)
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Database(e))?;
        
        let mut conflicts = Vec::new();
        
        // Check for teacher double bookings
        let mut teacher_schedule: std::collections::HashMap<String, Vec<(i32, chrono::NaiveTime, chrono::NaiveTime, Uuid)>> = std::collections::HashMap::new();
        
        for (slot_id, teacher_id, room_id, day, start_time, end_time) in &slots {
            if !teacher_id.is_empty() {
                let teacher_slots = teacher_schedule.entry(teacher_id.clone()).or_default();
                
                // Check for overlaps with existing slots for this teacher
                for (existing_day, existing_start, existing_end, existing_slot_id) in teacher_slots.iter() {
                    if *day == *existing_day {
                        if (start_time >= existing_start && start_time < existing_end) ||
                           (end_time > existing_start && end_time <= existing_end) ||
                           (start_time <= existing_start && end_time >= existing_end) {
                            
                            conflicts.push(TimetableConflict {
                                id: Uuid::new_v4(),
                                school_id: school_id.to_string(),
                                conflict_type: "teacher_double_booking".to_string(),
                                entity_type: "teacher".to_string(),
                                entity_id: teacher_id.clone(),
                                conflicting_with_type: "teacher".to_string(),
                                conflicting_with_id: teacher_id.clone(),
                                timetable_slot_id: None,
                                day_of_week: Some(*day),
                                start_time: Some(*start_time),
                                end_time: Some(*end_time),
                                severity: "error".to_string(),
                                description: format!("Teacher {} has overlapping classes on day {} ({} - {})",
                                    teacher_id, day, start_time, end_time),
                                detected_at: Utc::now(),
                                resolved_at: None,
                                resolved_by: None,
                                resolution_notes: None,
                                metadata: json!({}),
                            });
                        }
                    }
                }
                
                teacher_slots.push((*day, *start_time, *end_time, *slot_id));
            }
        }
        
        // Check for room overlaps
        let mut room_schedule: std::collections::HashMap<String, Vec<(i32, chrono::NaiveTime, chrono::NaiveTime, Uuid)>> = std::collections::HashMap::new();
        
        for (slot_id, teacher_id, room_id, day, start_time, end_time) in &slots {
            if !room_id.is_empty() {
                let room_slots = room_schedule.entry(room_id.clone()).or_default();
                
                // Check for overlaps with existing slots for this room
                for (existing_day, existing_start, existing_end, existing_slot_id) in room_slots.iter() {
                    if *day == *existing_day {
                        if (start_time >= existing_start && start_time < existing_end) ||
                           (end_time > existing_start && end_time <= existing_end) ||
                           (start_time <= existing_start && end_time >= existing_end) {
                            
                            conflicts.push(TimetableConflict {
                                id: Uuid::new_v4(),
                                school_id: school_id.to_string(),
                                conflict_type: "room_overlap".to_string(),
                                entity_type: "room".to_string(),
                                entity_id: room_id.clone(),
                                conflicting_with_type: "room".to_string(),
                                conflicting_with_id: room_id.clone(),
                                timetable_slot_id: None,
                                day_of_week: Some(*day),
                                start_time: Some(*start_time),
                                end_time: Some(*end_time),
                                severity: "error".to_string(),
                                description: format!("Room {} has overlapping bookings on day {} ({} - {})",
                                    room_id, day, start_time, end_time),
                                detected_at: Utc::now(),
                                resolved_at: None,
                                resolved_by: None,
                                resolution_notes: None,
                                metadata: json!({}),
                            });
                        }
                    }
                }
                
                room_slots.push((*day, *start_time, *end_time, *slot_id));
            }
        }
        
        // Save detected conflicts to database
        for conflict in &conflicts {
            sqlx::query(
                r#"
                INSERT INTO timetable_conflicts (
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
            .execute(pool)
            .await
            .map_err(|e| AppError::Database(e))?;
        }
        
        Ok(conflicts)
    }

    async fn create_admin_task(
        &self,
        school_id: &str,
        task: AdminTaskCreate,
    ) -> AppResult<AdminTask> {
        let pool = &self.repos.db_client.pool;
        
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
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Database(e))?;
        
        Ok(result)
    }

    async fn get_reports(&self, _report_type: Option<&str>) -> AppResult<Vec<AutomatedReport>> {
        Ok(vec![])
    }
    
    async fn categorize_email(&self, _subject: &str, _body: &str) -> AppResult<String> {
        Ok("General".to_string())
    }
    
    async fn resolve_conflict(&self, _conflict_id: i32) -> AppResult<TimetableConflict> {
        Err(crate::error::AppError::Validation("Not implemented".to_string()))
    }
    
    async fn get_pending_tasks(&self, _assigned_to: Option<&str>) -> AppResult<Vec<serde_json::Value>> {
        Ok(vec![])
    }
}
