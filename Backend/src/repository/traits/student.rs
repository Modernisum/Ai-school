use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait StudentRepository: Send + Sync {
    async fn add_student(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_students(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_students_by_class(
        &self,
        school_id: &str,
        class_name: &str,
        section: Option<&str>,
    ) -> Result<JsonList, AppError>;
    async fn get_student(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Option<Value>, AppError>;
    async fn update_student(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn delete_student(&self, school_id: &str, student_id: &str) -> Result<(), AppError>;
    async fn get_next_roll_number(
        &self,
        school_id: &str,
        class_name: &str,
    ) -> Result<i32, AppError>;
    async fn generate_student_id(&self, school_id: &str) -> Result<String, AppError>;
    
    // Security & Validation
    async fn check_aadhaar_exists(&self, school_id: &str, aadhaar: &str, exclude_sid: Option<&str>, exclude_eid: Option<&str>) -> Result<bool, AppError>;
    async fn count_phone_usage(&self, school_id: &str, phone: &str, exclude_sid: Option<&str>, exclude_eid: Option<&str>) -> Result<i32, AppError>;
    async fn count_email_usage(&self, school_id: &str, email: &str, exclude_sid: Option<&str>, exclude_eid: Option<&str>) -> Result<i32, AppError>;
    
    // History & Rollback
    async fn add_history(&self, school_id: &str, student_id: &str, rev_no: i32, snapshot: Value, delta: Value) -> Result<(), AppError>;
    async fn get_next_rev_no(&self, school_id: &str, student_id: &str) -> Result<i32, AppError>;
    async fn get_history_by_id(&self, school_id: &str, id: i32) -> Result<Option<Value>, AppError>;
    async fn get_all_student_history(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_student_profile(&self, school_id: &str, student_id: &str) -> Result<Option<Value>, AppError>;
}
