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

    async fn get_missing_responsibility_alerts(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn search_responsibilities(&self, school_id: &str, pattern: &str, limit: i32, offset: i32) -> Result<(JsonList, i64), AppError>;

    async fn get_space_responsibilities(
        &self,
        school_id: &str,
        space_id: &str,
    ) -> Result<Vec<Value>, AppError>;

    async fn get_overview_analytics(&self, school_id: &str, days: i32) -> Result<Value, AppError>;

    async fn export_responsibilities_csv(&self, school_id: &str) -> Result<String, AppError>;

    async fn import_responsibilities_csv(
        &self,
        school_id: &str,
        admin_id: &str,
        csv_content: &str,
    ) -> Result<usize, AppError>;

    async fn sync_student_fees_for_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> Result<usize, AppError>;

    async fn recalculate_all_student_fees(&self, school_id: &str) -> Result<usize, AppError>;

    async fn generate_salaries_from_responsibilities(
        &self,
        school_id: &str,
        month: i32,
        year: i32,
    ) -> Result<Value, AppError>;

    async fn get_space_financial_overview(
        &self,
        school_id: &str,
        space_id: &str,
    ) -> Result<Value, AppError>;

    async fn bulk_create_employee_assignments(
        &self,
        school_id: &str,
        assignments: Vec<(String, String, Vec<String>)>,
    ) -> Result<(), AppError>;

    async fn bulk_remove_employee_responsibilities(
        &self,
        school_id: &str,
        removals: Vec<(String, String)>,
    ) -> Result<(), AppError>;

    async fn get_assignment_history(
        &self,
        school_id: &str,
        responsibility_id: Option<&str>,
        employee_id: Option<&str>,
        limit: i64,
    ) -> Result<JsonList, AppError>;

    async fn get_responsibility_versions(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> Result<JsonList, AppError>;

    async fn rollback_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
        version: i32,
        admin_id: &str,
    ) -> Result<(), AppError>;

    async fn create_responsibility_version(
        &self,
        school_id: &str,
        responsibility_id: &str,
        admin_id: &str,
    ) -> Result<i32, AppError>;

    async fn get_responsibility_utilization_metrics(
        &self,
        school_id: &str,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<Value, AppError>;

    async fn get_employee_workload_metrics(
        &self,
        school_id: &str,
        employee_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<Value, AppError>;

    async fn get_space_distribution_metrics(
        &self,
        school_id: &str,
        space_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<Value, AppError>;

    async fn get_revenue_metrics(
        &self,
        school_id: &str,
        responsibility_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<Value, AppError>;
}
