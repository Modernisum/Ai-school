use async_trait::async_trait;  
use serde_json::Value;  
use sqlx::types::BigDecimal;
use chrono::{DateTime, Utc};
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait AwardRepository: Send + Sync {
    async fn add_award(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_awards(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<JsonList, AppError>;
    async fn get_award(&self, school_id: &str, award_id: i32) -> Result<Option<Value>, AppError>;
    async fn delete_award(&self, school_id: &str, award_id: i32) -> Result<(), AppError>;
}

#[async_trait]
pub trait ComplainRepository: Send + Sync {
    async fn add_complain(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_complains(
        &self,
        school_id: &str,
        user_id: Option<&str>,
        user_role: Option<&str>,
    ) -> Result<JsonList, AppError>;
    async fn get_complain(&self, school_id: &str, complain_id: i32) -> Result<Option<Value>, AppError>;
    async fn delete_complain(&self, school_id: &str, complain_id: i32) -> Result<(), AppError>;
}

#[async_trait]
pub trait ReminderRepository: Send + Sync {
    async fn add_reminder(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_reminders(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_reminder(&self, school_id: &str, reminder_id: i32) -> Result<Option<Value>, AppError>;
    async fn delete_reminder(&self, school_id: &str, reminder_id: i32) -> Result<(), AppError>;
}

#[async_trait]
pub trait DocumentBoxRepository: Send + Sync {
    async fn add_document(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_documents(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<JsonList, AppError>;
    async fn get_document(&self, school_id: &str, document_id: i32) -> Result<Option<Value>, AppError>;
    async fn delete_document(&self, school_id: &str, document_id: i32) -> Result<(), AppError>;
}

#[async_trait]
pub trait SchoolRepository: Send + Sync {
    async fn get_school(&self, school_id: &str) -> Result<Option<Value>, AppError>;
    async fn get_session_duration_hours(&self, school_id: &str) -> Result<Option<i32>, AppError>;
    async fn update_school_data(&self, school_id: &str, data: Value) -> Result<(), AppError>;
    async fn update_session_duration_hours(&self, school_id: &str, hours: i32) -> Result<(), AppError>;
    async fn get_school_billing_info(&self, school_id: &str) -> Result<Option<(String, Option<DateTime<Utc>>, BigDecimal, BigDecimal)>, AppError>;
    async fn get_session_durations(&self, school_ids: &[String]) -> Result<Vec<i64>, AppError>;
    async fn setup_school_transaction(
        &self,
        payload: SchoolSetupPayload,
    ) -> Result<(), AppError>;
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct SchoolSetupPayload {
    pub school_id: String,
    pub school_name: String,
    pub school_logo_url: Option<String>,
    pub school_data: Value,
    pub hashed_password: String,
    pub admin_id: String,
    pub admin_email: String,
    pub admin_phone: String,
    pub admin_employee: Value,
    pub spaces: Vec<(String, String)>, // category, space_name
    pub items: Vec<(String, Value)>, // space_name, item_data
    pub responsibilities: Vec<Value>,
    pub holidays: Vec<Value>,
    pub fees: Vec<Value>,
}

#[async_trait]
pub trait NotificationPreferenceRepository: Send + Sync {
    async fn get_preferences(
        &self,
        school_id: &str,
        user_id: &str,
    ) -> Result<Option<Value>, AppError>;

    async fn update_preferences(
        &self,
        school_id: &str,
        user_id: &str,
        email_enabled: Option<bool>,
        sms_enabled: Option<bool>,
        push_enabled: Option<bool>,
        in_app_enabled: Option<bool>,
    ) -> Result<Value, AppError>;
}
