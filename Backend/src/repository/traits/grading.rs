use async_trait::async_trait;
use serde_json::Value;
use super::{AppError, JsonList};

#[async_trait]
pub trait GradingRepository: Send + Sync {
    // Rubrics
    async fn add_rubric(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_rubrics(&self, school_id: &str, filters: Value) -> Result<JsonList, AppError>;
    async fn get_rubric(&self, school_id: &str, rubric_id: &str) -> Result<Option<Value>, AppError>;
    
    // Submissions
    async fn add_submission(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_submissions(&self, school_id: &str, filters: Value) -> Result<JsonList, AppError>;
    async fn update_submission_status(&self, school_id: &str, submission_id: &str, status: &str) -> Result<(), AppError>;
    
    // Grading Results
    async fn save_grading_result(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_grading_results(&self, school_id: &str, submission_id: &str) -> Result<JsonList, AppError>;
    
    // Answer Keys (New)
    async fn add_answer_key(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_answer_keys(&self, school_id: &str, exam_id: &str) -> Result<JsonList, AppError>;
    
    // Config (New)
    async fn set_grading_config(&self, school_id: &str, data: Value) -> Result<(), AppError>;
    async fn get_grading_config(&self, school_id: &str, subject_name: Option<&str>) -> Result<Option<Value>, AppError>;
}
