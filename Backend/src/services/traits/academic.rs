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

    // Exam Sections
    async fn create_exam_section(&self, school_id: &str, admin_id: &str, exam_id: i32, data: Value) -> AppResult<Value>;
    async fn list_exam_sections(&self, school_id: &str, exam_id: i32) -> AppResult<Vec<Value>>;
    async fn update_exam_section(&self, school_id: &str, admin_id: &str, section_id: i32, data: Value) -> AppResult<()>;

    // Chapters
    async fn create_chapter(&self, school_id: &str, admin_id: &str, subject_id: &str, data: Value) -> AppResult<Value>;
    async fn list_chapters(&self, school_id: &str, subject_id: &str) -> AppResult<Vec<Value>>;
    async fn update_chapter(&self, school_id: &str, admin_id: &str, chapter_id: i32, data: Value) -> AppResult<()>;
    async fn get_auto_syllabus(&self, school_id: &str, subject_id: &str) -> AppResult<Value>;
    async fn create_teacher_test(&self, school_id: &str, teacher_id: &str, data: Value) -> AppResult<Value>;

    // Exam Checker Workflow
    async fn assign_exam_checker(&self, school_id: &str, admin_id: &str, exam_id: &str, checker_employee_id: &str) -> AppResult<Value>;
    async fn list_checker_exams(&self, school_id: &str, checker_employee_id: &str) -> AppResult<Vec<Value>>;
    async fn get_exam_submissions_for_checker(&self, school_id: &str, checker_id: &str, exam_id: &str, status: Option<&str>) -> AppResult<Vec<Value>>;
    async fn checker_review_submission(&self, school_id: &str, checker_id: &str, submission_id: &str, data: Value) -> AppResult<Value>;
    async fn teacher_approve_submission(&self, school_id: &str, teacher_id: &str, submission_id: &str, data: Value) -> AppResult<Value>;
    async fn teacher_reject_submission(&self, school_id: &str, teacher_id: &str, submission_id: &str, data: Value) -> AppResult<Value>;
    async fn publish_exam_results(&self, school_id: &str, admin_id: &str, exam_id: &str) -> AppResult<Value>;
}
