use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait ResponsibilityService: Send + Sync {
    async fn list_responsibilities(
        &self,
        school_id: &str,
        employee_type: Option<String>,
    ) -> AppResult<Vec<Value>>;
    async fn list_responsibilities_paginated(
        &self,
        school_id: &str,
        employee_type: Option<String>,
        page: i32,
        limit: i32,
    ) -> AppResult<Value>;
    async fn create_responsibility(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn get_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> AppResult<Option<Value>>;
    async fn get_responsibility_analytics(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> AppResult<Value>;
    async fn list_student_responsibilities(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> AppResult<Vec<Value>>;
    async fn get_employee_responsibilities(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> AppResult<Vec<Value>>;
    async fn update_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()>;
    async fn delete_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
        admin_id: &str,
    ) -> AppResult<()>;
    async fn get_overview_analytics(
        &self,
        school_id: &str,
        time_range: &str,
    ) -> AppResult<Value>;
    async fn export_responsibilities_csv(
        &self,
        school_id: &str,
    ) -> AppResult<String>;
    async fn import_responsibilities_csv(
        &self,
        school_id: &str,
        admin_id: &str,
        csv_content: &str,
    ) -> AppResult<usize>;
    async fn bulk_update_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
        admin_id: &str,
        updates: Vec<(String, Vec<String>)>,
    ) -> AppResult<usize>;
    
    // History and Versioning methods
    async fn get_assignment_history(
        &self,
        school_id: &str,
        responsibility_id: Option<&str>,
        employee_id: Option<&str>,
        limit: i64,
    ) -> AppResult<Vec<Value>>;
    
    async fn get_responsibility_versions(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> AppResult<Vec<Value>>;
    
    async fn rollback_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
        version: i32,
        admin_id: &str,
    ) -> AppResult<()>;
    
    async fn create_responsibility_version(
        &self,
        school_id: &str,
        responsibility_id: &str,
        admin_id: &str,
    ) -> AppResult<i32>;
    
    // Phase 6: Reporting & Analytics methods
    async fn get_responsibility_utilization_metrics(
        &self,
        school_id: &str,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value>;
    
    async fn get_employee_workload_metrics(
        &self,
        school_id: &str,
        employee_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value>;
    
    async fn get_space_distribution_metrics(
        &self,
        school_id: &str,
        space_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value>;
    
    async fn get_revenue_metrics(
        &self,
        school_id: &str,
        responsibility_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value>;
    
    async fn generate_utilization_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value>;
    
    async fn generate_workload_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value>;
    
    async fn generate_space_distribution_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value>;
    
    async fn generate_revenue_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value>;
    
    // PDF Export methods
    async fn generate_utilization_report_pdf(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Vec<u8>>;
    
    async fn generate_workload_report_pdf(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Vec<u8>>;
    
    async fn generate_space_distribution_report_pdf(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Vec<u8>>;
    
    async fn generate_revenue_report_pdf(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Vec<u8>>;
}
