use crate::repository::Repositories;
use crate::services::traits::*;
use chrono::{Datelike, Local};
use serde_json::{json, Value};
use std::sync::Arc;

pub struct PayrollCalculation {
    pub repos: Arc<Repositories>,
}

impl PayrollCalculation {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn get_salary_breakdown(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> AppResult<Value> {
        let emp = self
            .repos
            .employee
            .get_employee(school_id, employee_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Employee not found".to_string()))?;

        let base_salary = emp["baseSalary"].as_f64().unwrap_or(0.0);
        let bonus = emp["bonus"].as_f64().unwrap_or(0.0);
        let aid = emp["aid"].as_f64().unwrap_or(0.0);

        let experience_years = emp["experienceYears"].as_f64().unwrap_or(0.0);
        let experience_rate = emp["experienceRate"].as_f64().unwrap_or(0.0);
        let tenure_months = emp["tenureMonths"].as_f64().unwrap_or(0.0);
        let tenure_rate = emp["tenureRate"].as_f64().unwrap_or(0.0);

        let exp_component = experience_years * experience_rate;
        let tenure_component = tenure_months * tenure_rate;

        let mut spaces_component: f64 = 0.0;
        let responsibilities = self
            .repos
            .responsibility
            .get_employee_responsibilities(school_id, employee_id)
            .await
            .unwrap_or_default();
        for r in responsibilities {
            let monthly_price = r["monthlyPrice"].as_f64().unwrap_or(0.0);
            let spaces_count = r["assignedSpaceIds"].as_array().map(|arr| arr.len()).unwrap_or(1) as f64;
            let current_comp = if monthly_price > 0.0 {
                monthly_price * spaces_count
            } else {
                r["totalPrice"].as_f64().unwrap_or(0.0)
            };
            spaces_component += current_comp;
        }

        let gross_salary = spaces_component + exp_component + tenure_component + bonus + aid;

        let now = Local::now();
        let (month, year) = if now.month() == 1 {
            (12, (now.year() - 1))
        } else {
            (now.month() - 1, now.year())
        };
        let attendance = self
            .repos
            .attendance
            .get_attendance(school_id, "employee", employee_id)
            .await
            .unwrap_or_default();

        let absent_days = attendance
            .iter()
            .filter(|a| {
                a["status"] == "absent" && a["month"] == json!(month) && a["year"] == json!(year)
            })
            .count() as f64;

        let daily_rate = gross_salary / 30.0;
        let deductions = absent_days * daily_rate;
        let net_monthly_salary = gross_salary - deductions;

        Ok(json!({
            "baseSalary": base_salary,
            "spacesComponent": spaces_component,
            "experienceComponent": exp_component,
            "tenureComponent": tenure_component,
            "bonus": bonus,
            "aid": aid,
            "grossSalary": gross_salary,
            "deductions": deductions,
            "absentDays": absent_days,
            "netMonthlySalary": net_monthly_salary.max(0.0)
        }))
    }
}
