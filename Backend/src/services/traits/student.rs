use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait StudentService: Send + Sync {
    async fn create_student(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn bulk_create_students(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Vec<Value>,
    ) -> AppResult<Value>;
    async fn list_students(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn list_students_by_class(
        &self,
        school_id: &str,
        class_name: &str,
        section: Option<&str>,
    ) -> AppResult<Vec<Value>>;
    async fn get_student(&self, school_id: &str, student_id: &str) -> AppResult<Option<Value>>;
    async fn update_student(
        &self,
        school_id: &str,
        student_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()>;
    async fn delete_student(
        &self,
        school_id: &str,
        student_id: &str,
        admin_id: &str,
    ) -> AppResult<()>;
    async fn resequence_roll_numbers(&self, school_id: &str, class_name: &str) -> AppResult<()>;
    async fn list_student_ids(&self, school_id: &str) -> AppResult<Vec<String>>;
    async fn validate_student_data(&self, school_id: &str, data: Value) -> AppResult<()>;
}
