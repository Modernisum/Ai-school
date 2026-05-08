use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait AcademicService: Send + Sync {
    async fn create_exam(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn list_exams(&self, school_id: &str, student_id: String) -> AppResult<Vec<Value>>;
    async fn create_subject(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn list_subjects(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn create_topic(&self, data: Value) -> AppResult<Value>;
}
