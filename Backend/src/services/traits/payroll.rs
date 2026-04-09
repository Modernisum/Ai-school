use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait PayrollService: Send + Sync {
    async fn get_salary_breakdown(&self, school_id: &str, employee_id: &str) -> AppResult<Value>;
    async fn add_bonus(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn add_aid(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn auto_close_month(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
    ) -> AppResult<()>;
    async fn add_payment(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn set_employee_salary_params(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()>;
}
