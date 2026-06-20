use crate::repository::Repositories;
use crate::services::traits::*;
use crate::services::utils::{audit::log_audit, delta::calculate_delta};
use chrono::{Datelike, Local};
use serde_json::{json, Value};
use std::sync::Arc;

pub struct PayrollProcessing {
    pub repos: Arc<Repositories>,
}

impl PayrollProcessing {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn add_bonus(&self, school_id: &str, employee_id: &str, admin_id: &str, data: Value) -> AppResult<Value> {
        let mut emp = self.repos.employee.get_employee(school_id, employee_id).await?
            .ok_or_else(|| AppError::NotFound("Employee not found".to_string()))?;
        let current_bonus = emp["bonus"].as_f64().unwrap_or(0.0);
        let add_amount = data["amount"].as_f64().unwrap_or(0.0);
        emp["bonus"] = json!(current_bonus + add_amount);
        self.repos.employee.update_employee(school_id, employee_id, emp).await?;
        log_audit(&self.repos.audit, school_id, admin_id, "EMPLOYEE_BONUS", employee_id, "ADD", json!({"amount": add_amount, "newBonus": current_bonus + add_amount})).await;
        Ok(json!({"newBonus": current_bonus + add_amount}))
    }

    pub async fn add_aid(&self, school_id: &str, employee_id: &str, admin_id: &str, data: Value) -> AppResult<Value> {
        let mut emp = self.repos.employee.get_employee(school_id, employee_id).await?
            .ok_or_else(|| AppError::NotFound("Employee not found".to_string()))?;
        let current_aid = emp["aid"].as_f64().unwrap_or(0.0);
        let add_amount = data["amount"].as_f64().unwrap_or(0.0);
        emp["aid"] = json!(current_aid + add_amount);
        self.repos.employee.update_employee(school_id, employee_id, emp).await?;
        log_audit(&self.repos.audit, school_id, admin_id, "EMPLOYEE_AID", employee_id, "ADD", json!({"amount": add_amount, "newAid": current_aid + add_amount})).await;
        Ok(json!({"newAid": current_aid + add_amount}))
    }

    pub async fn auto_close_month(&self, school_id: &str, employee_id: &str, admin_id: &str) -> AppResult<()> {
        let now = Local::now();
        let (month, year) = if now.month() == 1 { (12, now.year() - 1) } else { (now.month() - 1, now.year()) };

        let emp = self.repos.employee.get_employee(school_id, employee_id).await?
            .ok_or_else(|| AppError::NotFound("Employee not found".to_string()))?;
        let base_salary = emp["baseSalary"].as_f64().unwrap_or(0.0);
        let bonus = emp["bonus"].as_f64().unwrap_or(0.0);
        let increment = emp["incrementPercent"].as_f64().unwrap_or(0.0);
        let mut advance_balance = emp["advanceBalance"].as_f64().unwrap_or(0.0);

        let per_day = (base_salary + (base_salary * increment / 100.0)) / 30.0;
        let attendance = self.repos.attendance.get_attendance(school_id, "employee", employee_id).await?;
        let absent_days = attendance.iter()
            .filter(|a| a["month"] == month && a["year"] == year && a["status"] == "absent")
            .count() as f64;

        let deduction = per_day * absent_days;
        let total_salary = (base_salary + bonus + (base_salary * increment / 100.0)) - deduction;
        let advance_applied = f64::min(advance_balance, total_salary);
        let due_amount = total_salary - advance_applied;
        advance_balance -= advance_applied;
        let status = if due_amount <= 0.0 { "PAID" } else if due_amount < total_salary { "PARTIALLY_PAID" } else { "DUE" };

        let salary_data = json!({"month": month, "year": year, "baseSalary": base_salary, "totalSalary": total_salary, "dueAmount": due_amount, "advanceAdjusted": advance_applied, "status": status, "absentDays": absent_days});
        self.repos.payroll.add_payroll_salary(school_id, employee_id, salary_data).await?;
        self.repos.employee.update_employee(school_id, employee_id, json!({"advanceBalance": advance_balance})).await?;
        self.repos.payroll.add_payment_history(school_id, employee_id, "auto_close_month", json!({"salary": total_salary, "due": due_amount, "advanceApplied": advance_applied})).await?;
        log_audit(&self.repos.audit, school_id, admin_id, "PAYROLL_CLOSE_MONTH", employee_id, "CLOSE", json!({"month": month, "year": year})).await;
        Ok(())
    }

    pub async fn add_payment(&self, school_id: &str, employee_id: &str, admin_id: &str, data: Value) -> AppResult<Value> {
        let p_type = data["type"].as_str().ok_or_else(|| AppError::Validation("Missing payment type".to_string()))?;
        let amount = data["amount"].as_f64().ok_or_else(|| AppError::Validation("Missing amount".to_string()))?;
        let emp = self.repos.employee.get_employee(school_id, employee_id).await?
            .ok_or_else(|| AppError::NotFound("Employee not found".to_string()))?;
        let mut advance_balance = emp["advanceBalance"].as_f64().unwrap_or(0.0);

        if p_type == "advance" {
            advance_balance += amount;
            self.repos.employee.update_employee(school_id, employee_id, json!({"advanceBalance": advance_balance})).await?;
            self.repos.payroll.add_payment_history(school_id, employee_id, "advance_received", json!({"amount": amount, "newBalance": advance_balance})).await?;
        } else if p_type == "salary" {
            let _salary_id = data["salaryId"].as_str().ok_or_else(|| AppError::Validation("salaryId required".to_string()))?;
            self.repos.payroll.add_employee_payment(school_id, employee_id, data.clone()).await?;
        }

        log_audit(&self.repos.audit, school_id, admin_id, "EMPLOYEE_PAYMENT", employee_id, "ADD", data.clone()).await;
        Ok(data)
    }

    pub async fn set_employee_salary_params(&self, school_id: &str, employee_id: &str, admin_id: &str, data: Value) -> AppResult<()> {
        let old = self.repos.employee.get_employee(school_id, employee_id).await?.unwrap_or(json!({}));
        self.repos.employee.update_employee(school_id, employee_id, data.clone()).await?;
        let delta = calculate_delta(&old, &data);
        log_audit(&self.repos.audit, school_id, admin_id, "EMPLOYEE_SALARY_PARAMS", employee_id, "UPDATE", delta).await;
        Ok(())
    }

    pub async fn calculate_attendance_deductions(&self, school_id: &str, employee_id: &str, month: i32, year: i32) -> AppResult<Value> {
        use chrono::NaiveDate;

        let emp = self.repos.employee.get_employee(school_id, employee_id).await?
            .ok_or_else(|| AppError::NotFound("Employee not found".to_string()))?;
        let base_salary = emp["baseSalary"].as_f64().unwrap_or(0.0);
        let daily_rate = base_salary / 30.0;

        let start_date = NaiveDate::from_ymd_opt(year, month as u32, 1)
            .ok_or_else(|| AppError::Validation("Invalid month/year".to_string()))?;
        let end_date = if month == 12 {
            NaiveDate::from_ymd_opt(year + 1, 1, 1)
        } else {
            NaiveDate::from_ymd_opt(year, month as u32 + 1, 1)
        }.ok_or_else(|| AppError::Validation("Invalid month/year".to_string()))?;

        let attendance = self.repos.attendance.get_attendance(school_id, "employee", employee_id).await?;
        let absent_days = attendance.iter()
            .filter(|a| {
                if let Some(date_str) = a["date"].as_str() {
                    if let Ok(date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                        return date >= start_date && date < end_date && a["status"] == "absent";
                    }
                }
                false
            })
            .count() as f64;

        let deduction = daily_rate * absent_days;
        Ok(json!({"absentDays": absent_days, "dailyRate": daily_rate, "totalDeduction": deduction}))
    }
}
