mod bulk_operations;
mod crud;
mod history;
mod metrics;
pub mod notifications;

pub use bulk_operations::ResponsibilityBulkOperations;
pub use crud::ResponsibilityCrud;
pub use history::ResponsibilityHistory;
pub use metrics::ResponsibilityMetrics;
pub use notifications::ResponsibilityNotificationService;
pub use notifications::ResponsibilityNotificationType;

use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct PostgresResponsibilityService {
    pub repos: Arc<Repositories>,
    pub crud: ResponsibilityCrud,
    pub metrics: ResponsibilityMetrics,
    pub history: ResponsibilityHistory,
    pub bulk: ResponsibilityBulkOperations,
}

impl PostgresResponsibilityService {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self {
            crud: ResponsibilityCrud::new(repos.clone()),
            metrics: ResponsibilityMetrics::new(repos.clone()),
            history: ResponsibilityHistory::new(repos.clone()),
            bulk: ResponsibilityBulkOperations::new(repos.clone()),
            repos,
        }
    }
}

#[async_trait]
impl ResponsibilityService for PostgresResponsibilityService {
    async fn list_responsibilities(
        &self,
        school_id: &str,
        employee_type: Option<String>,
    ) -> AppResult<Vec<Value>> {
        self.crud.list_responsibilities(school_id, employee_type).await
    }

    async fn list_responsibilities_paginated(
        &self,
        school_id: &str,
        employee_type: Option<String>,
        page: i32,
        limit: i32,
    ) -> AppResult<Value> {
        self.crud.list_responsibilities_paginated(school_id, employee_type, page, limit).await
    }

    async fn create_responsibility(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        self.crud.create_responsibility(school_id, admin_id, data).await
    }

    async fn get_responsibility(&self, school_id: &str, responsibility_id: &str) -> AppResult<Option<Value>> {
        self.crud.get_responsibility(school_id, responsibility_id).await
    }

    async fn get_responsibility_analytics(&self, school_id: &str, responsibility_id: &str) -> AppResult<Value> {
        self.crud.get_responsibility_analytics(school_id, responsibility_id).await
    }

    async fn list_student_responsibilities(&self, school_id: &str, student_id: &str) -> AppResult<Vec<Value>> {
        self.crud.list_student_responsibilities(school_id, student_id).await
    }

    async fn get_employee_responsibilities(&self, school_id: &str, employee_id: &str) -> AppResult<Vec<Value>> {
        self.crud.get_employee_responsibilities(school_id, employee_id).await
    }

    async fn update_responsibility(&self, school_id: &str, responsibility_id: &str, admin_id: &str, data: Value) -> AppResult<()> {
        self.crud.update_responsibility(school_id, responsibility_id, admin_id, data).await
    }

    async fn delete_responsibility(&self, school_id: &str, responsibility_id: &str, admin_id: &str) -> AppResult<()> {
        self.crud.delete_responsibility(school_id, responsibility_id, admin_id).await
    }

    async fn get_overview_analytics(&self, school_id: &str, time_range: &str) -> AppResult<Value> {
        self.crud.get_overview_analytics(school_id, time_range).await
    }

    async fn export_responsibilities_csv(&self, school_id: &str) -> AppResult<String> {
        self.crud.export_responsibilities_csv(school_id).await
    }

    async fn import_responsibilities_csv(&self, school_id: &str, admin_id: &str, csv_content: &str) -> AppResult<usize> {
        self.crud.import_responsibilities_csv(school_id, admin_id, csv_content).await
    }

    async fn bulk_update_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
        admin_id: &str,
        updates: Vec<(String, Vec<String>)>,
    ) -> AppResult<usize> {
        self.bulk.bulk_update_responsibility(school_id, responsibility_id, admin_id, updates).await
    }

    async fn get_assignment_history(
        &self,
        school_id: &str,
        responsibility_id: Option<&str>,
        employee_id: Option<&str>,
        limit: i64,
    ) -> AppResult<Vec<Value>> {
        self.history.get_assignment_history(school_id, responsibility_id, employee_id, limit).await
    }

    async fn get_responsibility_versions(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> AppResult<Vec<Value>> {
        self.history.get_responsibility_versions(school_id, responsibility_id).await
    }

    async fn rollback_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
        version: i32,
        admin_id: &str,
    ) -> AppResult<()> {
        self.history.rollback_responsibility(school_id, responsibility_id, version, admin_id).await
    }

    async fn create_responsibility_version(
        &self,
        school_id: &str,
        responsibility_id: &str,
        admin_id: &str,
    ) -> AppResult<i32> {
        self.history.create_responsibility_version(school_id, responsibility_id, admin_id).await
    }

    async fn get_responsibility_utilization_metrics(
        &self,
        school_id: &str,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value> {
        self.metrics.get_responsibility_utilization_metrics(school_id, start_date, end_date).await
    }

    async fn get_employee_workload_metrics(
        &self,
        school_id: &str,
        employee_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value> {
        self.metrics.get_employee_workload_metrics(school_id, employee_id, start_date, end_date).await
    }

    async fn get_space_distribution_metrics(
        &self,
        school_id: &str,
        space_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value> {
        self.metrics.get_space_distribution_metrics(school_id, space_id, start_date, end_date).await
    }

    async fn get_revenue_metrics(
        &self,
        school_id: &str,
        responsibility_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value> {
        self.metrics.get_revenue_metrics(school_id, responsibility_id, start_date, end_date).await
    }

    async fn generate_utilization_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        self.metrics.generate_utilization_report(school_id, start_date, end_date).await
    }

    async fn generate_workload_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        self.metrics.generate_workload_report(school_id, start_date, end_date).await
    }

    async fn generate_space_distribution_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        self.metrics.generate_space_distribution_report(school_id, start_date, end_date).await
    }

    async fn generate_revenue_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        self.metrics.generate_revenue_report(school_id, start_date, end_date).await
    }
}
