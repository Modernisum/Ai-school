use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{Postgres, Pool, Row};
use std::sync::Arc;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::error::{AppResult, AppError};
use crate::logic::EmailService;
use crate::repository::Repositories;
use crate::services::traits::admin_automation::*;

#[derive(Clone)]
pub struct AdminAutomationService {
    repos: Arc<Repositories>,
    email_service: Arc<EmailService>,
}

impl AdminAutomationService {
    pub fn new(repos: Arc<Repositories>, email_service: Arc<EmailService>) -> Self {
        Self { repos, email_service }
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
        let user_id = self.repos.admin_automation.find_user_by_role(school_id, role).await?;
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

    async fn send_workflow_notification(
        repos: &Arc<Repositories>,
        school_id: &str,
        entity_id: &str,
        event: &str,
        status: &str,
    ) {
        let _ = repos
            .audit
            .log_action(
                school_id,
                "system",
                "WORKFLOW_NOTIFICATION",
                entity_id,
                event,
                serde_json::json!({"status": status, "timestamp": chrono::Utc::now().to_rfc3339()}),
            )
            .await;
    }
}

#[async_trait]
impl AdminAutomationServiceTrait for AdminAutomationService {
    async fn create_form_template(
        &self,
        school_id: &str,
        template: &FormTemplateCreate,
    ) -> AppResult<FormTemplate> {
        let result = self.repos.admin_automation.create_form_template(school_id, template).await?;
        Ok(result)
    }

    async fn get_form_templates(
        &self,
        school_id: &str,
        form_type: Option<&str>,
    ) -> AppResult<Vec<FormTemplate>> {
        let templates = self.repos.admin_automation.get_form_templates(school_id, form_type).await?;
        Ok(templates)
    }

    async fn submit_form(
        &self,
        school_id: &str,
        submission: &FormSubmissionCreate,
    ) -> AppResult<FormSubmission> {
        // Validate template exists and is active
        let template_exists = self.repos.admin_automation.check_form_template_exists(school_id, submission.template_id).await?;

        if !template_exists {
            return Err(AppError::NotFound("Form template not found or inactive".to_string()));
        }

        let result = self.repos.admin_automation.submit_form(school_id, submission).await?;

        // Trigger workflow notifications
        Self::send_workflow_notification(&self.repos, school_id, &result.id.to_string(), "form_submitted", &result.status).await;

        // Send email notifications if configured
        if let Some(template) = self.repos.admin_automation.get_form_template_by_id(school_id, submission.template_id).await? {
            if let Some(ref notif_settings) = template.notification_settings {
                if let Some(notif_obj) = notif_settings.as_object() {
                    if let Some(Value::Array(emails)) = notif_obj.get("email_recipients") {
                        for email_val in emails {
                            if let Value::String(email) = email_val {
                                let _ = self.email_service
                                    .send_email(email.as_str(), &format!("New Form Submission: {}", template.name), &format!("A new form submission has been made. Status: {}", result.status))
                                    .await;
                            }
                        }
                    }
                }
            }
        }

        Ok(result)
    }

    async fn get_form_submissions(
        &self,
        school_id: &str,
        status: Option<&str>,
        form_type: Option<&str>,
    ) -> AppResult<Vec<FormSubmission>> {
        let submissions = self.repos.admin_automation.get_form_submissions(school_id, status, form_type).await?;
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
        let submission_uuid = Uuid::parse_str(submission_id)
            .map_err(|_| AppError::Validation("Invalid submission ID".to_string()))?;

        let result = self.repos.admin_automation.update_form_submission_status(
            school_id,
            submission_uuid,
            status,
            reviewer_notes,
            processed_by,
        ).await?;

        // Update workflow history
        let _ = self.repos.admin_automation.insert_form_submission_history(
            submission_uuid,
            status,
            processed_by,
            reviewer_notes,
        ).await;

        Ok(result)
    }

    async fn create_automated_report(
        &self,
        school_id: &str,
        report: &AutomatedReportCreate,
    ) -> AppResult<AutomatedReport> {
        // Calculate next scheduled time based on schedule_type
        let next_scheduled_at = match report.schedule_type.as_str() {
            "daily" => Some(Utc::now() + chrono::Duration::days(1)),
            "weekly" => Some(Utc::now() + chrono::Duration::weeks(1)),
            "monthly" => Some(Utc::now() + chrono::Duration::days(30)),
            "quarterly" => Some(Utc::now() + chrono::Duration::days(90)),
            "yearly" => Some(Utc::now() + chrono::Duration::days(365)),
            _ => None, // on_demand
        };

        let result = self.repos.admin_automation.create_automated_report(
            school_id,
            report,
            next_scheduled_at,
        ).await?;

        Ok(result)
    }

    async fn generate_report(
        &self,
        school_id: &str,
        report_id: &str,
    ) -> AppResult<ReportGenerationResult> {
        let report_uuid = Uuid::parse_str(report_id)
            .map_err(|_| AppError::Validation("Invalid report ID".to_string()))?;

        // Get report configuration
        let report = self.repos.admin_automation.get_automated_report_by_id(school_id, report_uuid).await?;

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
        let email_id = Uuid::parse_str(&email.email_id).unwrap_or_else(|_| Uuid::new_v4());

        // Check if email already exists
        let exists = self.repos.admin_automation.check_email_exists_in_queue(school_id, email_id).await?;
        if exists {
            return Err(AppError::Validation("Email already exists in processing queue".to_string()));
        }

        // Insert email into processing queue
        let inserted_id = self.repos.admin_automation.insert_email_into_queue(school_id, email, email_id).await?;

        // Apply email processing rules
        let rules = self.repos.admin_automation.get_email_processing_rules(school_id).await?;

        let mut category = None;
        let mut assigned_to = None;
        let mut actions_taken = Vec::new();

        for (_rule_id, match_conditions, actions, rule_category, assign_to_role) in rules {
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
                                    // Create support ticket entry
                                    let _ = self.repos.admin_automation.create_support_request(
                                        school_id,
                                        email.body_text.as_deref().unwrap_or(""),
                                        email.sender_email.as_deref().unwrap_or(""),
                                    ).await;
                                    actions_taken.push("ticket_created".to_string());
                                }
                                "send_auto_reply" => {
                                    // Send auto-reply email
                                    if let Some(ref sender) = email.sender_email {
                                        let _ = self.email_service
                                            .send_email(sender, "Re: Your email has been received", &format!(
                                                "Thank you for your email regarding '{}'.\n\nWe have received your message and will get back to you shortly.\n\nBest regards,\nVidhyam Support", email.subject
                                            ))
                                            .await;
                                    }
                                    actions_taken.push("auto_reply_sent".to_string());
                                }
                                _ => {}
                            }
                        }
                    }
                }

                // Update email with categorization
                let _ = self.repos.admin_automation.update_email_queue_status(
                    school_id,
                    inserted_id,
                    category.as_deref(),
                    assigned_to.as_deref(),
                    "processed",
                ).await;

                break; // Stop at first matching rule
            }
        }

        // If no rules matched, use AI for categorization
        if category.is_none() {
            let cat = self.categorize_email_with_ai(email).await?;
            let _ = self.repos.admin_automation.update_email_queue_status(
                school_id,
                inserted_id,
                Some(&cat),
                None,
                "processed",
            ).await;
            category = Some(cat);
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
            created_ticket: Some(true),
        })
    }

    async fn detect_timetable_conflicts(
        &self,
        school_id: &str,
    ) -> AppResult<Vec<TimetableConflict>> {
        // Get active timetable slots
        let slots = self.repos.admin_automation.get_active_timetable_slots(school_id).await?;

        let mut conflicts = Vec::new();

        // Check for teacher double bookings
        let mut teacher_schedule: std::collections::HashMap<String, Vec<(i32, chrono::NaiveTime, chrono::NaiveTime, Uuid)>> = std::collections::HashMap::new();

        for (slot_id, teacher_id, room_id, day, start_time, end_time) in &slots {
            if !teacher_id.is_empty() {
                let teacher_slots = teacher_schedule.entry(teacher_id.clone()).or_default();

                // Check for overlaps with existing slots for this teacher
                for (existing_day, existing_start, existing_end, _existing_slot_id) in teacher_slots.iter() {
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
                for (existing_day, existing_start, existing_end, _existing_slot_id) in room_slots.iter() {
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
            self.repos.admin_automation.insert_timetable_conflict(conflict).await?;
        }

        Ok(conflicts)
    }

    async fn create_admin_task(
        &self,
        school_id: &str,
        task: AdminTaskCreate,
    ) -> AppResult<AdminTask> {
        let result = self.repos.admin_automation.create_admin_task(school_id, &task).await?;
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
