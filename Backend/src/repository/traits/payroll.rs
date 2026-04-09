use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait PayrollRepository: Send + Sync {
    async fn update_employee_salary_params(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn add_employee_payment(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn add_payroll_salary(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn get_payroll_summary(
        &self,
        school_id: &str,
        employee_id: &str,
        page: u32,
        limit: u32,
    ) -> Result<Value, AppError>;
    async fn add_payment_history(
        &self,
        school_id: &str,
        employee_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), AppError>;
}
