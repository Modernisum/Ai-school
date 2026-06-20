use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait AwardService: Send + Sync {
    async fn create_award(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn list_awards(&self, school_id: &str, student_id: Option<&str>)
        -> AppResult<Vec<Value>>;
    async fn delete_award(&self, school_id: &str, admin_id: &str, award_id: i32) -> AppResult<()>;
}

#[async_trait]
pub trait ComplainService: Send + Sync {
    async fn create_complain(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn list_complains(
        &self,
        school_id: &str,
        user_id: Option<&str>,
        user_role: Option<&str>,
    ) -> AppResult<Vec<Value>>;
    async fn delete_complain(
        &self,
        school_id: &str,
        admin_id: &str,
        complain_id: i32,
    ) -> AppResult<()>;
}

#[async_trait]
pub trait ReminderService: Send + Sync {
    async fn create_reminder(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn list_reminders(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn delete_reminder(
        &self,
        school_id: &str,
        admin_id: &str,
        reminder_id: i32,
    ) -> AppResult<()>;
}

#[async_trait]
pub trait DocumentBoxService: Send + Sync {
    async fn upload_document(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn list_documents(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> AppResult<Vec<Value>>;
    async fn delete_document(
        &self,
        school_id: &str,
        admin_id: &str,
        document_id: i32,
    ) -> AppResult<()>;
}

#[async_trait]
pub trait SchoolService: Send + Sync {
    async fn get_school_details(&self, school_id: &str, filter: Option<String>)
        -> AppResult<Value>;
    async fn update_school(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<()>;
}
