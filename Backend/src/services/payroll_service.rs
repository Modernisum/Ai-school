use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use chrono::{Datelike, Local};
use serde_json::{json, Value};
use std::sync::Arc;

pub struct PostgresPayrollService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl PayrollService for PostgresPayrollService {
    async fn get_salary_breakdown(
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
            (12, (now.year() - 1) as i32)
        } else {
            (now.month() - 1, now.year() as i32)
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

    async fn add_bonus(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let mut emp = self
            .repos
            .employee
            .get_employee(school_id, employee_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Employee not found".to_string()))?;

        let current_bonus = emp["bonus"].as_f64().unwrap_or(0.0);
        let add_amount = data["amount"].as_f64().unwrap_or(0.0);
        emp["bonus"] = json!(current_bonus + add_amount);

        self.repos
            .employee
            .update_employee(school_id, employee_id, emp)
            .await?;
        
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "EMPLOYEE_BONUS",
            employee_id,
            "ADD",
            json!({"amount": add_amount, "newBonus": current_bonus + add_amount})
        ).await;

        Ok(json!({"newBonus": current_bonus + add_amount}))
    }

    async fn add_aid(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let mut emp = self
            .repos
            .employee
            .get_employee(school_id, employee_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Employee not found".to_string()))?;

        let current_aid = emp["aid"].as_f64().unwrap_or(0.0);
        let add_amount = data["amount"].as_f64().unwrap_or(0.0);
        emp["aid"] = json!(current_aid + add_amount);

        self.repos
            .employee
            .update_employee(school_id, employee_id, emp)
            .await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "EMPLOYEE_AID",
            employee_id,
            "ADD",
            json!({"amount": add_amount, "newAid": current_aid + add_amount})
        ).await;

        Ok(json!({"newAid": current_aid + add_amount}))
    }

    async fn auto_close_month(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
    ) -> AppResult<()> {
        let now = Local::now();
        let (month, year) = if now.month() == 1 {
            (12, now.year() - 1)
        } else {
            (now.month() - 1, now.year() as i32)
        };

        let emp = self
            .repos
            .employee
            .get_employee(school_id, employee_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Employee not found".to_string()))?;

        let base_salary = emp["baseSalary"].as_f64().unwrap_or(0.0);
        let bonus = emp["bonus"].as_f64().unwrap_or(0.0);
        let increment = emp["incrementPercent"].as_f64().unwrap_or(0.0);
        let mut advance_balance = emp["advanceBalance"].as_f64().unwrap_or(0.0);

        let per_day = (base_salary + (base_salary * increment / 100.0)) / 30.0;
        let attendance = self
            .repos
            .attendance
            .get_attendance(school_id, "employee", employee_id)
            .await?;
        let absent_days = attendance
            .iter()
            .filter(|a| a["month"] == month && a["year"] == year && a["status"] == "absent")
            .count() as f64;

        let deduction = per_day * absent_days;
        let total_salary = (base_salary + bonus + (base_salary * increment / 100.0)) - deduction;

        let advance_applied = f64::min(advance_balance, total_salary);
        let due_amount = total_salary - advance_applied;
        advance_balance -= advance_applied;

        let status = if due_amount <= 0.0 { "PAID" } else if due_amount < total_salary { "PARTIALLY_PAID" } else { "DUE" };

        let salary_data = json!({
            "month": month,
            "year": year,
            "baseSalary": base_salary,
            "totalSalary": total_salary,
            "dueAmount": due_amount,
            "advanceAdjusted": advance_applied,
            "status": status,
            "absentDays": absent_days
        });

        self.repos.payroll.add_payroll_salary(school_id, employee_id, salary_data).await?;
        self.repos.employee.update_employee(school_id, employee_id, json!({"advanceBalance": advance_balance})).await?;
        self.repos.payroll.add_payment_history(school_id, employee_id, "auto_close_month", json!({
            "salary": total_salary,
            "due": due_amount,
            "advanceApplied": advance_applied
        })).await?;
        let _ = self.repos.audit.log_action(school_id, admin_id, "PAYROLL_CLOSE_MONTH", employee_id, "CLOSE", json!({"month": month, "year": year})).await;
        Ok(())
    }

    async fn add_payment(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let p_type = data["type"].as_str().ok_or_else(|| AppError::Validation("Missing payment type".to_string()))?;
        let amount = data["amount"].as_f64().ok_or_else(|| AppError::Validation("Missing amount".to_string()))?;

        let emp = self
            .repos
            .employee
            .get_employee(school_id, employee_id)
            .await?
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

        let _ = self.repos.audit.log_action(school_id, admin_id, "EMPLOYEE_PAYMENT", employee_id, "ADD", data.clone()).await;
        Ok(data)
    }

    async fn set_employee_salary_params(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()> {
        let old = self.repos.employee.get_employee(school_id, employee_id).await?.unwrap_or(json!({}));
        self.repos.employee.update_employee(school_id, employee_id, data.clone()).await?;
        let delta = self.calculate_delta(&old, &data);
        let _ = self.repos.audit.log_action(school_id, admin_id, "EMPLOYEE_SALARY_PARAMS", employee_id, "UPDATE", delta).await;
        Ok(())
    }
}

impl PostgresPayrollService {
    fn calculate_delta(&self, old: &Value, new: &Value) -> Value {
        let mut delta = json!({});
        if let (Some(old_obj), Some(new_obj)) = (old.as_object(), new.as_object()) {
            for (key, new_val) in new_obj {
                if key == "updatedAt" || key == "updated_at" || key == "createdAt" || key == "created_at" {
                    continue;
                }
                if let Some(old_val) = old_obj.get(key) {
                    if old_val != new_val {
                        delta[key] = json!({
                            "old": old_val.clone(),
                            "new": new_val.clone()
                        });
                    }
                } else {
                    delta[key] = json!({
                        "old": null,
                        "new": new_val.clone()
                    });
                }
            }
        }
        delta
    }
}
