use crate::repository::Repositories;
use crate::services::traits::*;
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

    pub async fn add_bonus(
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

    pub async fn add_aid(
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

    pub async fn auto_close_month(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
    ) -> AppResult<()> {
        let now = Local::now();
        let (month, year) = if now.month() == 1 {
            (12, now.year() - 1)
        } else {
            (now.month() - 1, now.year())
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

    pub async fn add_payment(
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

    pub async fn set_employee_salary_params(
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

    /// Calculate salary deductions based on attendance for a given month
    pub async fn calculate_attendance_deductions(
        &self,
        school_id: &str,
        employee_id: &str,
        month: i32,
        year: i32,
    ) -> AppResult<Value> {
        use chrono::{NaiveDate, Datelike};
        
        // Get employee details
        let emp = self.repos.employee.get_employee(school_id, employee_id).await?
            .ok_or_else(|| AppError::NotFound("Employee not found".to_string()))?;
        
        let base_salary = emp["baseSalary"].as_f64().unwrap_or(0.0);
        let daily_rate = base_salary / 30.0; // Assuming 30-day month
        
        // Calculate date range for the month
        let start_date = NaiveDate::from_ymd_opt(year, month as u32, 1)
            .ok_or_else(|| AppError::Validation("Invalid month/year".to_string()))?;
        
        let end_date = if month == 12 {
            NaiveDate::from_ymd_opt(year + 1, 1, 1)
        } else {
            NaiveDate::from_ymd_opt(year, month as u32 + 1, 1)
        }.ok_or_else(|| AppError::Validation("Invalid month/year".to_string()))?;
        
        // Get attendance records for the month
        let attendance_query = "
            SELECT date, status, in_time, out_time, total_time, reason
            FROM attendance
            WHERE school_id = $1 AND user_id = $2 AND date >= $3 AND date < $4
            ORDER BY date
        ";
        
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(attendance_query)
            .bind(school_id)
            .bind(employee_id)
            .bind(start_date)
            .bind(end_date)
            .fetch_all(&mut *conn)
            .await?;
        
        let mut total_days = 0;
        let mut present_days = 0;
        let mut absent_days = 0;
        let mut half_days = 0;
        let mut late_days = 0;
        let mut total_deduction = 0.0;
        let mut attendance_details = Vec::new();
        
        // Calculate working days in the month (excluding weekends)
        let mut current_date = start_date;
        while current_date < end_date {
            let weekday = current_date.weekday();
            if weekday != chrono::Weekday::Sat && weekday != chrono::Weekday::Sun {
                total_days += 1;
            }
            current_date = current_date.succ_opt()
                .ok_or_else(|| AppError::Internal("Date calculation error".to_string()))?;
        }
        
        // Process attendance records
        for row in rows {
            let date: NaiveDate = sqlx::Row::get(&row, "date");
            let status: Option<String> = sqlx::Row::get(&row, "status");
            let reason: Option<String> = sqlx::Row::get(&row, "reason");
            
            let status_str = status.unwrap_or_default();
            let mut deduction = 0.0;
            let mut day_type = "present";
            
            match status_str.as_str() {
                "present" => {
                    present_days += 1;
                }
                "absent" => {
                    absent_days += 1;
                    deduction = daily_rate;
                    day_type = "absent";
                    total_deduction += deduction;
                }
                "half_day" => {
                    half_days += 1;
                    deduction = daily_rate * 0.5;
                    day_type = "half_day";
                    total_deduction += deduction;
                }
                "late" => {
                    late_days += 1;
                    deduction = daily_rate * 0.25; // 25% deduction for late
                    day_type = "late";
                    total_deduction += deduction;
                }
                _ => {}
            }
            
            attendance_details.push(json!({
                "date": date.format("%Y-%m-%d").to_string(),
                "status": status_str,
                "reason": reason,
                "deduction": deduction,
                "day_type": day_type
            }));
        }
        
        let working_days_present = present_days + (half_days as f64 * 0.5) as i32;
        let attendance_percentage = if total_days > 0 {
            (working_days_present as f64 / total_days as f64) * 100.0
        } else {
            0.0
        };
        
        let net_salary = base_salary - total_deduction;
        
        Ok(json!({
            "employee_id": employee_id,
            "month": month,
            "year": year,
            "base_salary": base_salary,
            "daily_rate": daily_rate,
            "attendance_summary": {
                "total_working_days": total_days,
                "present_days": present_days,
                "absent_days": absent_days,
                "half_days": half_days,
                "late_days": late_days,
                "working_days_present": working_days_present,
                "attendance_percentage": attendance_percentage
            },
            "deductions": {
                "total_deduction": total_deduction,
                "absent_deduction": absent_days as f64 * daily_rate,
                "half_day_deduction": half_days as f64 * daily_rate * 0.5,
                "late_deduction": late_days as f64 * daily_rate * 0.25
            },
            "salary_calculation": {
                "gross_salary": base_salary,
                "total_deductions": total_deduction,
                "net_salary": net_salary
            },
            "attendance_details": attendance_details,
            "calculated_at": Local::now().to_rfc3339()
        }))
    }

    /// Apply attendance-based deductions to payroll
    pub async fn apply_attendance_deductions(
        &self,
        school_id: &str,
        employee_id: &str,
        month: i32,
        year: i32,
        admin_id: &str,
    ) -> AppResult<Value> {
        // Calculate deductions
        let calculation = self.calculate_attendance_deductions(school_id, employee_id, month, year).await?;
        
        let total_deduction = calculation["deductions"]["total_deduction"].as_f64().unwrap_or(0.0);
        let net_salary = calculation["salary_calculation"]["net_salary"].as_f64().unwrap_or(0.0);
        
        if total_deduction > 0.0 {
            // Create deduction record
            let deduction_data = json!({
                "type": "attendance_deduction",
                "amount": total_deduction,
                "month": month,
                "year": year,
                "reason": "Attendance-based salary deduction",
                "details": calculation["attendance_summary"].clone(),
                "applied_by": admin_id,
                "applied_at": Local::now().to_rfc3339()
            });
            
            self.repos.payroll.add_payroll_salary(school_id, employee_id, deduction_data).await?;
            
            // Update employee salary for the month
            let salary_data = json!({
                "month": month,
                "year": year,
                "base_salary": calculation["base_salary"].as_f64().unwrap_or(0.0),
                "deductions": total_deduction,
                "net_salary": net_salary,
                "status": "calculated",
                "calculated_at": Local::now().to_rfc3339(),
                "attendance_summary": calculation["attendance_summary"].clone()
            });
            
            self.repos.payroll.add_payroll_salary(school_id, employee_id, salary_data).await?;
            
            // Log the action
            let _ = self.repos.audit.log_action(
                school_id,
                admin_id,
                "PAYROLL_ATTENDANCE_DEDUCTION",
                employee_id,
                "APPLY",
                json!({
                    "month": month,
                    "year": year,
                    "deduction": total_deduction,
                    "net_salary": net_salary,
                    "attendance_summary": calculation["attendance_summary"].clone()
                })
            ).await;
        }
        
        Ok(json!({
            "success": true,
            "message": format!("Attendance deductions applied: ₹{:.2}", total_deduction),
            "deduction": total_deduction,
            "net_salary": net_salary,
            "calculation": calculation
        }))
    }
}
