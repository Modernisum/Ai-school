use async_trait::async_trait;  
use serde_json::Value;  
  
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
}
