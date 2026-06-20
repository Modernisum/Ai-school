use crate::repository::Repositories;
use crate::services::traits::*;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct PayrollReporting {
    pub repos: Arc<Repositories>,
}

impl PayrollReporting {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn get_payroll_history(
        &self,
        school_id: &str,
        employee_id: Option<&str>,
    ) -> AppResult<Vec<Value>> {
        let results = self.repos.payroll.get_payroll_history(school_id, employee_id).await?;
        Ok(results)
    }

    pub async fn get_payment_history(
        &self,
        school_id: &str,
        employee_id: Option<&str>,
    ) -> AppResult<Vec<Value>> {
        let results = self.repos.payroll.get_payment_history_list(school_id, employee_id).await?;
        Ok(results)
    }

    pub async fn generate_payroll_report(
        &self,
        school_id: &str,
        month: i32,
        year: i32,
    ) -> AppResult<Value> {
        let employees = self.repos.payroll.get_payroll_report_data(school_id, month, year).await?;
        
        let total_due: f64 = employees.iter()
            .filter_map(|e| e["dueAmount"].as_f64())
            .sum();
        
        let total_paid: f64 = employees.iter()
            .filter(|e| e["status"] == "PAID")
            .filter_map(|e| e["totalSalary"].as_f64())
            .sum();
        
        Ok(json!({
            "month": month,
            "year": year,
            "employees": employees,
            "summary": {
                "totalEmployees": employees.len(),
                "totalDue": total_due,
                "totalPaid": total_paid,
                "pendingPayments": employees.iter().filter(|e| e["status"] != "PAID").count()
            }
        }))
    }
}
