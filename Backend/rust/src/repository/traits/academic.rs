use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait AcademicRepository: Send + Sync {
    // Exams
    async fn add_exam(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_exams(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<JsonList, AppError>;
    async fn add_student_exam(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    
    // Topics
    async fn add_topic(&self, data: Value) -> Result<Value, AppError>;
    async fn get_topics(&self) -> Result<JsonList, AppError>;
    
    // Exam CRUD
    async fn get_exam(&self, school_id: &str, exam_id: &str) -> Result<Option<Value>, AppError>;
    async fn update_exam(&self, school_id: &str, exam_id: &str, data: Value) -> Result<(), AppError>;
    async fn delete_exam(&self, school_id: &str, exam_id: &str) -> Result<(), AppError>;

    // Exam Sections
    async fn add_exam_section(&self, school_id: &str, exam_id: i32, data: Value) -> Result<Value, AppError>;
    async fn get_exam_sections(&self, school_id: &str, exam_id: i32) -> Result<JsonList, AppError>;
    async fn update_exam_section(&self, school_id: &str, section_id: i32, data: Value) -> Result<(), AppError>;

    // Exam Checker Workflow
    async fn assign_exam_checker(&self, school_id: &str, exam_id: &str, checker_employee_id: &str) -> Result<Value, AppError>;
    async fn get_checker_exams(&self, school_id: &str, checker_employee_id: &str) -> Result<JsonList, AppError>;
    async fn get_exam_submissions(&self, school_id: &str, exam_id: &str, status: Option<&str>) -> Result<JsonList, AppError>;
    async fn update_submission_checker(&self, school_id: &str, submission_id: &str, checker_id: &str, checked_at: &str, data: Value) -> Result<(), AppError>;
    async fn update_exam_grading_approval(&self, school_id: &str, submission_id: &str, teacher_id: &str, data: Value) -> Result<(), AppError>;
    async fn publish_exam_results(&self, school_id: &str, exam_id: &str, admin_id: &str) -> Result<Value, AppError>;

    // Chapters
    async fn add_chapter(&self, school_id: &str, responsibility_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_chapters(&self, school_id: &str, responsibility_id: &str) -> Result<JsonList, AppError>;
    async fn update_chapter(&self, school_id: &str, chapter_id: i32, data: Value) -> Result<(), AppError>;

    // Scanned Submission Pages Cleanup
    async fn clear_temporary_submission_pages(
        &self,
        school_id: &str,
        submission_id: uuid::Uuid,
    ) -> Result<Vec<String>, AppError>;
}

