use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait EmployeeRepository: Send + Sync {
    async fn add_employee(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_employees(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_employee(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<Option<Value>, AppError>;
    async fn update_employee(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn delete_employee(&self, school_id: &str, employee_id: &str) -> Result<(), AppError>;
    async fn generate_employee_id(&self) -> Result<String, AppError>;
}
