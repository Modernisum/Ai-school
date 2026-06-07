use async_trait::async_trait;
use serde_json::Value;

use super::{AppError, JsonList};

#[async_trait]
pub trait ResponsibilityRepository: Send + Sync {
    async fn get_responsibilities(&self, school_id: &str, employee_type: Option<String>) -> Result<JsonList, AppError>;
    async fn get_responsibilities_paginated(
        &self,
        school_id: &str,
        employee_type: Option<String>,
        page: i32,
        limit: i32,
    ) -> Result<Value, AppError>;
    async fn add_responsibility(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn assign_employees_with_spaces(
        &self,
        school_id: &str,
        responsibility_id: &str,
        assignments: Vec<(String, Vec<String>)>,
    ) -> Result<(), AppError>;
    async fn assign_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), AppError>;
    async fn bulk_assign_responsibilities(
        &self,
        school_id: &str,
        employee_ids: Vec<String>,
        responsibility_ids: Vec<String>,
        space_ids: Vec<String>,
    ) -> Result<(), AppError>;
    async fn get_student_fee_sum_for_space(&self, school_id: &str, space_id: &str) -> Result<f64, AppError>;
    async fn get_responsibility_analytics(&self, school_id: &str, responsibility_id: &str) -> Result<Value, AppError>;
    async fn get_student_responsibilities(&self, school_id: &str, student_id: &str) -> Result<Vec<Value>, AppError>;
    async fn get_student_responsibilities_paginated(
        &self,
        school_id: &str,
        student_id: &str,
        page: i32,
        limit: i32,
    ) -> Result<Value, AppError>;
    async fn get_responsibility(&self, school_id: &str, responsibility_id: &str) -> Result<Option<Value>, AppError>;
    async fn get_responsibility_by_name(&self, school_id: &str, name: &str) -> Result<Option<Value>, AppError>;
    async fn update_responsibility(&self, school_id: &str, responsibility_id: &str, data: Value) -> Result<(), AppError>;
    async fn remove_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), AppError>;
    async fn delete_responsibility(&self, school_id: &str, responsibility_id: &str) -> Result<(), AppError>;
    async fn get_employee_responsibilities(&self, school_id: &str, employee_id: &str) -> Result<JsonList, AppError>;
    async fn get_employee_responsibilities_paginated(
        &self,
        school_id: &str,
        employee_id: &str,
        page: i32,
        limit: i32,
    ) -> Result<Value, AppError>;
}
