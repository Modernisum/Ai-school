use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

mod calculation;
mod processing;
mod reporting;

pub use calculation::PayrollCalculation;
pub use processing::PayrollProcessing;
pub use reporting::PayrollReporting;

pub struct PostgresPayrollService {
    pub repos: Arc<Repositories>,
    pub calculation: PayrollCalculation,
    pub processing: PayrollProcessing,
    pub reporting: PayrollReporting,
}

impl PostgresPayrollService {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self {
            calculation: PayrollCalculation::new(repos.clone()),
            processing: PayrollProcessing::new(repos.clone()),
            reporting: PayrollReporting::new(repos.clone()),
            repos,
        }
    }
}

#[async_trait]
impl PayrollService for PostgresPayrollService {
    async fn get_salary_breakdown(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> AppResult<Value> {
        self.calculation.get_salary_breakdown(school_id, employee_id).await
    }

    async fn add_bonus(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        self.processing.add_bonus(school_id, employee_id, admin_id, data).await
    }

    async fn add_aid(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        self.processing.add_aid(school_id, employee_id, admin_id, data).await
    }

    async fn auto_close_month(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
    ) -> AppResult<()> {
        self.processing.auto_close_month(school_id, employee_id, admin_id).await
    }

    async fn add_payment(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        self.processing.add_payment(school_id, employee_id, admin_id, data).await
    }

    async fn set_employee_salary_params(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()> {
        self.processing.set_employee_salary_params(school_id, employee_id, admin_id, data).await
    }
}
