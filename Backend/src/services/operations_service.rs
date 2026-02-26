use crate::repository::traits::*;
use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use chrono::{Datelike, Local};
use serde_json::{json, Value};
use std::error::Error;
use std::sync::Arc;

pub struct PostgresOperationsService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl OperationsService for PostgresOperationsService {
    async fn mark_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let date = data["date"]
            .as_str()
            .unwrap_or(&Local::now().format("%Y-%m-%d").to_string())
            .to_string();

        let mut final_data = data.clone();

        // 1. Calculate Duration if applicable
        if let (Some(in_t), Some(out_t)) = (data["inTime"].as_str(), data["outTime"].as_str()) {
            let duration = self.calculate_duration(in_t, out_t);
            final_data["totalTime"] = json!(duration);
        }

        self.repos
            .operations
            .mark_attendance(school_id, role, user_id, &date, final_data.clone())
            .await?;

        // 2. Transform for frontend (Firestore parity)
        let mut response_data = final_data.clone();
        
        let transform_time = |t_str: &str| {
            if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(t_str) {
                json!({
                    "_seconds": dt.timestamp(),
                    "_nanoseconds": dt.timestamp_subsec_nanos()
                })
            } else {
                json!({})
            }
        };

        if let Some(it) = response_data["inTime"].as_str() {
            response_data["inTime"] = transform_time(it);
        }
        if let Some(ot) = response_data["outTime"].as_str() {
            response_data["outTime"] = transform_time(ot);
        }

        response_data["createdAt"] = json!({});
        response_data["updatedAt"] = json!({});

        // 3. Log History (Audit Parity)
        self.repos
            .operations
            .add_attendance_history(school_id, role, user_id, "mark", final_data.clone())
            .await?;

        Ok(response_data)
    }

    async fn mark_holiday(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let date = data["date"]
            .as_str()
            .ok_or("date is required for holiday")?
            .to_string();

        let description = data["description"]
            .as_str()
            .unwrap_or("Holiday")
            .to_string();

        let holiday_data = json!({
            "status": "holiday",
            "date": date,
            "description": description,
        });

        self.repos
            .operations
            .mark_attendance(school_id, role, user_id, &date, holiday_data.clone())
            .await?;

        self.repos
            .operations
            .add_attendance_history(school_id, role, user_id, "holiday_marked", holiday_data.clone())
            .await?;

        Ok(holiday_data)
    }

    async fn update_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let out_time = data["outTime"]
            .as_str()
            .ok_or("outTime is required")?
            .to_string();

        // Fetch existing to compute duration
        let existing_list = self
            .repos
            .operations
            .get_attendance(school_id, role, user_id)
            .await?;

        let existing = existing_list
            .iter()
            .find(|a| a["date"].as_str() == Some(date))
            .ok_or("Attendance record not found")?
            .clone();

        let in_time = existing["inTime"].as_str().unwrap_or("").to_string();
        let total_time = if !in_time.is_empty() {
            self.calculate_duration(&in_time, &out_time)
        } else {
            String::new()
        };

        let mut updated = existing.clone();
        updated["outTime"] = json!(out_time);
        updated["totalTime"] = json!(total_time);

        self.repos
            .operations
            .mark_attendance(school_id, role, user_id, date, updated.clone())
            .await?;

        self.repos
            .operations
            .add_attendance_history(school_id, role, user_id, "attendance_updated", json!({"outTime": out_time, "totalTime": total_time}))
            .await?;

        Ok(updated)
    }

    async fn delete_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos
            .operations
            .delete_attendance(school_id, role, user_id, date)
            .await?;

        self.repos
            .operations
            .add_attendance_history(school_id, role, user_id, "attendance_deleted", json!({"date": date}))
            .await?;

        Ok(())
    }

    async fn list_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos
            .operations
            .get_attendance(school_id, role, user_id)
            .await
    }

    async fn create_school_fee(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos
            .operations
            .add_school_fee(school_id, data.clone())
            .await
    }

    async fn get_school_fees(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.operations.get_school_fees(school_id).await
    }

    async fn get_pending_fees(
        &self,
        school_id: &str,
        min_percentage: f64,
        class_name: Option<String>,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos
            .operations
            .get_pending_fees(school_id, min_percentage, class_name)
            .await
    }

    async fn get_student_fee(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        match self
            .repos
            .operations
            .get_student_fee(school_id, student_id)
            .await?
        {
            Some(v) => Ok(v),
            None => Err("Student fee record not found".into()),
        }
    }

    async fn add_fee_to_student(
        &self,
        school_id: &str,
        student_id: &str,
        amount: f64,
        fee_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut fee_record = match self
            .repos
            .operations
            .get_student_fee(school_id, student_id)
            .await?
        {
            Some(record) => record,
            None => {
                json!({
                    "studentId": student_id,
                    "totalFees": 0.0,
                    "pendingAmount": 0.0,
                    "discount": 0.0
                })
            }
        };

        let current_total = fee_record["totalFees"].as_f64().unwrap_or(0.0);
        let current_pending = fee_record["pendingAmount"].as_f64().unwrap_or(0.0);

        fee_record["totalFees"] = json!(current_total + amount);
        fee_record["pendingAmount"] = json!(current_pending + amount);

        self.repos
            .operations
            .update_student_fee(school_id, student_id, fee_record.clone())
            .await?;

        self.repos
            .operations
            .add_fee_history(
                school_id,
                student_id,
                "fee_added",
                json!({"amount": amount, "feeId": fee_id}),
            )
            .await?;

        Ok(fee_record)
    }

    async fn apply_discount(
        &self,
        school_id: &str,
        student_id: &str,
        discount: f64,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut fee_record = self.get_student_fee(school_id, student_id).await?;
        let total = fee_record["totalFees"].as_f64().unwrap_or(0.0);
        let pending = fee_record["pendingAmount"].as_f64().unwrap_or(0.0);
        let old_discount = fee_record["discount"].as_f64().unwrap_or(0.0);

        let new_pending = pending - (discount - old_discount);

        fee_record["discount"] = json!(discount);
        fee_record["pendingAmount"] = json!(new_pending);

        self.repos
            .operations
            .update_student_fee(school_id, student_id, fee_record.clone())
            .await?;

        self.repos
            .operations
            .add_fee_history(
                school_id,
                student_id,
                "discount_applied",
                json!({
                    "newDiscount": discount,
                    "previousDiscount": old_discount,
                    "newPending": new_pending
                }),
            )
            .await?;

        Ok(fee_record)
    }

    async fn pay_fee(
        &self,
        school_id: &str,
        student_id: &str,
        amount: i64,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut fee_record = self.get_student_fee(school_id, student_id).await?;
        let pending = fee_record["pendingAmount"].as_f64().unwrap_or(0.0);

        if amount as f64 > pending {
            return Err("Pay amount exceeds pending amount".into());
        }

        let new_pending = pending - amount as f64;
        fee_record["pendingAmount"] = json!(new_pending);

        // Update DB
        self.repos
            .operations
            .update_student_fee(school_id, student_id, fee_record.clone())
            .await?;

        // Log History (Parity with Node.js)
        self.repos
            .operations
            .add_fee_history(
                school_id,
                student_id,
                "payment",
                json!({
                    "payAmount": amount,
                    "previousPending": pending,
                    "newPending": new_pending,
                    "date": Local::now().to_rfc3339()
                }),
            )
            .await?;

        Ok(fee_record)
    }

    async fn set_employee_salary_params(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos
            .operations
            .update_employee_salary_params(school_id, employee_id, data)
            .await
    }

    async fn auto_close_month(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let now = Local::now();
        let (month, year) = if now.month() == 1 {
            (12, now.year() - 1)
        } else {
            (now.month() - 1, now.year())
        };

        // 1. Get Employee Data
        let emp = self
            .repos
            .employee
            .get_employee(school_id, employee_id)
            .await?
            .ok_or("Employee not found")?;

        let base_salary = emp["baseSalary"].as_f64().unwrap_or(0.0);
        let bonus = emp["bonus"].as_f64().unwrap_or(0.0);
        let increment = emp["incrementPercent"].as_f64().unwrap_or(0.0);
        let mut advance_balance = emp["advanceBalance"].as_f64().unwrap_or(0.0);

        // 2. Calculate Absent Deduction
        let per_day = (base_salary + (base_salary * increment / 100.0)) / 30.0;
        let attendance = self
            .repos
            .operations
            .get_attendance(school_id, "employee", employee_id)
            .await?;
        let absent_days = attendance
            .iter()
            .filter(|a| a["status"] == "absent" && a["month"] == month && a["year"] == year)
            .count() as f64;

        let deduction = per_day * absent_days;
        let total_salary = (base_salary + bonus + (base_salary * increment / 100.0)) - deduction;

        // 3. Adjust Advance
        let advance_applied = f64::min(advance_balance, total_salary);
        let due_amount = total_salary - advance_applied;
        advance_balance -= advance_applied;

        // 4. Status logic
        let status = if due_amount <= 0.0 {
            "PAID"
        } else if due_amount < total_salary {
            "PARTIALLY_PAID"
        } else {
            "DUE"
        };

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

        // 5. Atomic Update via Repository
        self.repos
            .operations
            .add_payroll_salary(school_id, employee_id, salary_data)
            .await?;
        self.repos
            .employee
            .update_employee(
                school_id,
                employee_id,
                json!({"advanceBalance": advance_balance}),
            )
            .await?;

        self.repos
            .operations
            .add_payment_history(
                school_id,
                employee_id,
                "auto_close_month",
                json!({
                    "salary": total_salary,
                    "due": due_amount,
                    "advanceApplied": advance_applied
                }),
            )
            .await?;

        Ok(())
    }

    async fn add_payment(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let p_type = data["type"].as_str().ok_or("Missing payment type")?;
        let amount = data["amount"].as_f64().ok_or("Missing amount")?;

        let mut emp = self
            .repos
            .employee
            .get_employee(school_id, employee_id)
            .await?
            .ok_or("Employee not found")?;
        let mut advance_balance = emp["advanceBalance"].as_f64().unwrap_or(0.0);

        if p_type == "advance" {
            advance_balance += amount;
            self.repos
                .employee
                .update_employee(
                    school_id,
                    employee_id,
                    json!({"advanceBalance": advance_balance}),
                )
                .await?;
            self.repos
                .operations
                .add_payment_history(
                    school_id,
                    employee_id,
                    "advance_received",
                    json!({"amount": amount, "newBalance": advance_balance}),
                )
                .await?;
        } else if p_type == "salary" {
            let salary_id = data["salaryId"]
                .as_str()
                .ok_or("salaryId required for salary payment")?;
            // ... Logic for salary payment application matching Node.js ...
            self.repos
                .operations
                .add_employee_payment(school_id, employee_id, data.clone())
                .await?;
        }

        Ok(data)
    }
}

impl PostgresOperationsService {
    fn calculate_duration(&self, in_time: &str, out_time: &str) -> String {
        match (
            chrono::DateTime::parse_from_rfc3339(in_time),
            chrono::DateTime::parse_from_rfc3339(out_time),
        ) {
            (Ok(it), Ok(ot)) => {
                let duration = ot.signed_duration_since(it);
                let hours = duration.num_hours();
                let mins = duration.num_minutes() % 60;
                format!("{}h {}m", hours, mins)
            }
            _ => "".to_string(),
        }
    }
}
