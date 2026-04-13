use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::AppResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormTemplateCreate {
    pub name: String,
    pub description: Option<String>,
    pub form_type: Option<String>,
    pub form_schema: serde_json::Value,
    pub validation_rules: Option<serde_json::Value>,
    pub workflow_steps: Option<serde_json::Value>,
    pub approval_required: Option<bool>,
    pub approval_roles: Option<serde_json::Value>,
    pub notification_settings: Option<serde_json::Value>,
    pub is_active: bool,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FormTemplate {
    pub id: i32,
    pub name: String,
    pub description: Option<String>,
    pub form_type: Option<String>,
    pub form_schema: serde_json::Value,
    pub validation_rules: Option<serde_json::Value>,
    pub workflow_steps: Option<serde_json::Value>,
    pub approval_required: Option<bool>,
    pub approval_roles: Option<serde_json::Value>,
    pub notification_settings: Option<serde_json::Value>,
    pub is_active: bool,
    pub category: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormSubmissionCreate {
    pub template_id: i32,
    pub form_type: String,
    pub submitted_by: String,
    pub submitted_by_role: String,
    pub form_data: serde_json::Value,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FormSubmission {
    pub id: i32,
    pub school_id: String,
    pub template_id: i32,
    pub form_type: String,
    pub submitted_by: String,
    pub submitted_by_role: String,
    pub form_data: serde_json::Value,
    pub status: String,
    pub processed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomatedReportCreate {
    pub report_name: String,
    pub report_type: String,
    pub description: Option<String>,
    pub schedule_type: String,
    pub schedule_config: Option<serde_json::Value>,
    pub parameters: serde_json::Value,
    pub recipient_emails: Option<serde_json::Value>,
    pub recipient_roles: Option<serde_json::Value>,
    pub recipients: Vec<String>,
    pub report_config: Option<serde_json::Value>,
    pub template_path: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AutomatedReport {
    pub id: i32,
    pub report_name: String,
    pub report_type: String,
    pub description: Option<String>,
    pub schedule_type: String,
    pub schedule_config: Option<serde_json::Value>,
    pub parameters: serde_json::Value,
    pub recipient_emails: Option<serde_json::Value>,
    pub recipient_roles: Option<serde_json::Value>,
    pub recipients: Vec<String>,
    pub report_config: Option<serde_json::Value>,
    pub template_path: Option<String>,
    pub is_active: bool,
    pub last_generated_at: Option<chrono::DateTime<chrono::Utc>>,
    pub next_scheduled_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportGenerationResult {
    pub report_id: i32,
    pub generated_at: chrono::DateTime<chrono::Utc>,
    pub status: String,
    pub file_path: Option<String>,
    pub error_message: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailData {
    pub email_id: String,
    pub subject: String,
    pub body: String,
    pub body_text: Option<String>,
    pub body_html: Option<String>,
    pub sender: String,
    pub sender_email: Option<String>,
    pub recipients: Vec<String>,
    pub recipient_email: Option<String>,
    pub attachments: Vec<String>,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailProcessingResult {
    pub email_id: String,
    pub processed_at: chrono::DateTime<chrono::Utc>,
    pub category: String,
    pub priority: String,
    pub actions_taken: serde_json::Value,
    pub processing_status: String,
    pub assigned_to: Option<String>,
    pub created_ticket: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimetableConflict {
    pub id: uuid::Uuid,
    pub school_id: String,
    pub conflict_type: String,
    pub entity_type: String,
    pub entity_id: String,
    pub conflicting_with_type: String,
    pub conflicting_with_id: String,
    pub timetable_slot_id: Option<i32>,
    pub day_of_week: Option<i32>,
    pub start_time: Option<chrono::NaiveTime>,
    pub end_time: Option<chrono::NaiveTime>,
    pub severity: String,
    pub description: String,
    pub detected_at: chrono::DateTime<chrono::Utc>,
    pub resolved_at: Option<chrono::DateTime<chrono::Utc>>,
    pub resolved_by: Option<String>,
    pub resolution_notes: Option<String>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AdminTask {
    pub id: i32,
    pub school_id: String,
    pub task_type: String,
    pub task_name: String,
    pub description: Option<String>,
    pub payload: serde_json::Value,
    pub priority: String,
    pub status: String,
    pub scheduled_for: Option<chrono::DateTime<chrono::Utc>>,
    pub created_by: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminTaskCreate {
    pub task_type: String,
    pub task_name: String,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub payload: Option<serde_json::Value>,
    pub scheduled_for: Option<chrono::DateTime<chrono::Utc>>,
}

#[async_trait]
pub trait AdminAutomationServiceTrait: Send + Sync {
    // Form Processing
    async fn create_form_template(&self, school_id: &str, template: &FormTemplateCreate) -> AppResult<FormTemplate>;
    async fn get_form_templates(&self, school_id: &str, form_type: Option<&str>) -> AppResult<Vec<FormTemplate>>;
    async fn submit_form(&self, school_id: &str, submission: &FormSubmissionCreate) -> AppResult<FormSubmission>;
    async fn get_form_submissions(&self, school_id: &str, status: Option<&str>, form_type: Option<&str>) -> AppResult<Vec<FormSubmission>>;
    async fn update_form_submission_status(
        &self, 
        school_id: &str, 
        submission_id: &str, 
        status: &str, 
        reviewer_notes: Option<&str>, 
        processed_by: &str
    ) -> AppResult<FormSubmission>;
    
    // Report Generation
    async fn create_automated_report(&self, school_id: &str, report: &AutomatedReportCreate) -> AppResult<AutomatedReport>;
    async fn generate_report(&self, school_id: &str, report_id: &str) -> AppResult<ReportGenerationResult>;
    async fn get_reports(&self, report_type: Option<&str>) -> AppResult<Vec<AutomatedReport>>;
    
    // Email Processing
    async fn process_email(&self, school_id: &str, email: &EmailData) -> AppResult<EmailProcessingResult>;
    async fn categorize_email(&self, subject: &str, body: &str) -> AppResult<String>;
    
    // Timetable Conflict Detection
    async fn detect_timetable_conflicts(&self, school_id: &str) -> AppResult<Vec<TimetableConflict>>;
    async fn resolve_conflict(&self, conflict_id: i32) -> AppResult<TimetableConflict>;
    
    // Admin Task Queue
    async fn create_admin_task(&self, school_id: &str, task: AdminTaskCreate) -> AppResult<AdminTask>;
    async fn get_pending_tasks(&self, assigned_to: Option<&str>) -> AppResult<Vec<serde_json::Value>>;
}