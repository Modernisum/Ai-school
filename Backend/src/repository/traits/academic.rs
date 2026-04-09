use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait AcademicRepository: Send + Sync {
    // Classes
    async fn add_class(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_classes(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_class(&self, school_id: &str, class_id: &str) -> Result<Option<Value>, AppError>;
    async fn get_class_by_name(&self, school_id: &str, name: &str) -> Result<Option<Value>, AppError>;
    async fn update_class(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn update_class_aggregates(
        &self,
        school_id: &str,
        class_id: &str,
        aggregates: Value,
    ) -> Result<(), AppError>;
    async fn get_class_students_count(
        &self,
        school_id: &str,
        class_name: &str,
    ) -> Result<i64, AppError>;
    
    // Subjects
    async fn add_subject(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn generate_subject_id(&self, subject_name: &str) -> Result<String, AppError>;
    async fn get_subjects(&self, school_id: &str) -> Result<JsonList, AppError>;
    
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
    
    // Periods
    async fn add_period(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn get_periods_count(&self, school_id: &str, class_id: &str) -> Result<i64, AppError>;
    
    // Streams
    async fn add_stream(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    
    async fn delete_class(&self, school_id: &str, class_id: &str) -> Result<(), AppError>;
    async fn get_subject(&self, school_id: &str, subject_id: &str) -> Result<Option<Value>, AppError>;
    async fn update_subject(&self, school_id: &str, subject_id: &str, data: Value) -> Result<(), AppError>;
    async fn delete_subject(&self, school_id: &str, subject_id: &str) -> Result<(), AppError>;
    async fn get_exam(&self, school_id: &str, exam_id: &str) -> Result<Option<Value>, AppError>;
    async fn update_exam(&self, school_id: &str, exam_id: &str, data: Value) -> Result<(), AppError>;
    async fn delete_exam(&self, school_id: &str, exam_id: &str) -> Result<(), AppError>;
}
