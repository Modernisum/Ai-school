use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait LeaveRepository: Send + Sync {
    async fn add_leave(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_leaves(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_leave(&self, school_id: &str, leave_id: &str) -> Result<Option<Value>, AppError>;
    async fn update_leave_status(
        &self,
        school_id: &str,
        leave_id: &str,
        status: &str,
    ) -> Result<(), AppError>;
    async fn update_leave_duration(
        &self,
        school_id: &str,
        leave_id: &str,
        action: &str,
        days: i32,
    ) -> Result<(), AppError>;
    async fn delete_leave_application(&self, school_id: &str, leave_id: &str) -> Result<(), AppError>;
    async fn find_matching_employees(
        &self,
        school_id: &str,
        responsibility_id: &str,
        exclude_employee_id: &str,
        from_date: &str,
        to_date: &str,
    ) -> Result<Vec<Value>, AppError>;
}
