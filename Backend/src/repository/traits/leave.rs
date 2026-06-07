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

    async fn assign_responsibility_coverage(
        &self,
        school_id: &str,
        coverage_id: &str,
        leave_id: &str,
        original_employee_id: &str,
        covering_employee_id: &str,
        responsibility_id: &str,
        coverage_period_start: chrono::NaiveDate,
        coverage_period_end: chrono::NaiveDate,
        notes: &str,
    ) -> Result<(), AppError>;

    async fn get_available_coverages(
        &self,
        school_id: &str,
        leave_id: &str,
    ) -> Result<Vec<Value>, AppError>;

    async fn accept_responsibility_coverage(
        &self,
        school_id: &str,
        employee_id: &str,
        coverage_id: &str,
    ) -> Result<(), AppError>;

    async fn save_workload_assessment(
        &self,
        school_id: &str,
        leave_id: &str,
        employee_id: &str,
        assessment_id: &str,
        impact_score: i32,
        workload_category: &str,
        coverage_needed: bool,
        notes: &str,
    ) -> Result<(), AppError>;

    async fn get_workload_assessment(
        &self,
        school_id: &str,
        leave_id: &str,
    ) -> Result<Option<Value>, AppError>;
}
