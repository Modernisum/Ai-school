use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait EmployeeService: Send + Sync {
    async fn create_employee(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn bulk_create_employees(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Vec<Value>,
    ) -> AppResult<Value>;
    async fn list_employees(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn get_employee(&self, school_id: &str, employee_id: &str) -> AppResult<Option<Value>>;
    async fn update_employee(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()>;
    async fn delete_employee(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
    ) -> AppResult<()>;
    async fn validate_employee_data(&self, school_id: &str, data: Value) -> AppResult<()>;
}
