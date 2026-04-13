use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait AttendanceRepository: Send + Sync {
    async fn mark_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn get_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
    ) -> Result<JsonList, AppError>;
    async fn delete_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
    ) -> Result<(), AppError>;
    async fn add_attendance_history(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), AppError>;
    
    // Bulk operations
    async fn bulk_mark_attendance(
        &self,
        school_id: &str,
        role: &str,
        date: &str,
        class_name: Option<&str>,
        attendances: Vec<(String, Value)>,
    ) -> Result<(usize, Vec<(String, String)>), AppError>;
    
    async fn get_class_attendance(
        &self,
        school_id: &str,
        class_name: &str,
        date: &str,
    ) -> Result<JsonList, AppError>;
}
