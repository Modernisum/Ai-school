use async_trait::async_trait;
use crate::repository::traits::AppError;
use crate::services::traits::admin_automation::{
    FormTemplate, FormTemplateCreate, FormSubmission, FormSubmissionCreate,
    AutomatedReport, AutomatedReportCreate, EmailData, TimetableConflict,
    AdminTask, AdminTaskCreate,
};

#[async_trait]
pub trait AdminAutomationRepository: Send + Sync {
    async fn find_user_by_role(&self, school_id: &str, role: &str) -> Result<Option<String>, AppError>;
    async fn create_form_template(&self, school_id: &str, template: &FormTemplateCreate) -> Result<FormTemplate, AppError>;
    async fn get_form_templates(&self, school_id: &str, form_type: Option<&str>) -> Result<Vec<FormTemplate>, AppError>;
    async fn check_form_template_exists(&self, school_id: &str, template_id: i32) -> Result<bool, AppError>;
    async fn submit_form(&self, school_id: &str, submission: &FormSubmissionCreate) -> Result<FormSubmission, AppError>;
    async fn get_form_template_by_id(&self, school_id: &str, template_id: i32) -> Result<Option<FormTemplate>, AppError>;
    async fn get_form_submissions(&self, school_id: &str, status: Option<&str>, form_type: Option<&str>) -> Result<Vec<FormSubmission>, AppError>;
    async fn update_form_submission_status(
        &self,
        school_id: &str,
        submission_id: uuid::Uuid,
        status: &str,
        reviewer_notes: Option<&str>,
        processed_by: &str,
    ) -> Result<FormSubmission, AppError>;
    async fn insert_form_submission_history(
        &self,
        submission_id: uuid::Uuid,
        status: &str,
        changed_by: &str,
        notes: Option<&str>,
    ) -> Result<(), AppError>;
    async fn create_automated_report(
        &self,
        school_id: &str,
        report: &AutomatedReportCreate,
        next_scheduled_at: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<AutomatedReport, AppError>;
    async fn get_automated_report_by_id(&self, school_id: &str, report_id: uuid::Uuid) -> Result<AutomatedReport, AppError>;
    async fn check_email_exists_in_queue(&self, school_id: &str, email_id: uuid::Uuid) -> Result<bool, AppError>;
    async fn insert_email_into_queue(&self, school_id: &str, email: &EmailData, email_uuid: uuid::Uuid) -> Result<uuid::Uuid, AppError>;
    async fn get_email_processing_rules(&self, school_id: &str) -> Result<Vec<(uuid::Uuid, serde_json::Value, serde_json::Value, String, Option<String>)>, AppError>;
    async fn create_support_request(&self, school_id: &str, message: &str, contact_info: &str) -> Result<(), AppError>;
    async fn update_email_queue_status(
        &self,
        school_id: &str,
        queue_id: uuid::Uuid,
        category: Option<&str>,
        assigned_to: Option<&str>,
        status: &str,
    ) -> Result<(), AppError>;
    async fn get_active_timetable_slots(&self, school_id: &str) -> Result<Vec<(uuid::Uuid, String, String, i32, chrono::NaiveTime, chrono::NaiveTime)>, AppError>;
    async fn insert_timetable_conflict(&self, conflict: &TimetableConflict) -> Result<(), AppError>;
    async fn create_admin_task(&self, school_id: &str, task: &AdminTaskCreate) -> Result<AdminTask, AppError>;
}
