use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresPayrollRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::PayrollRepository for PostgresPayrollRepository {
    async fn update_employee_salary_params(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO employee_salaries (school_id, employee_id, base_salary, data) VALUES ($1, $2, $3, $4) ON CONFLICT (school_id, employee_id) DO UPDATE SET base_salary = EXCLUDED.base_salary, data = EXCLUDED.data")
            .bind(school_id).bind(employee_id).bind(data["baseSalary"].as_f64().unwrap_or(0.0)).bind(&data).execute(&mut *conn).await?;
        Ok(())
    }

    async fn add_employee_payment(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let payment_id = format!("PAY{}", chrono::Utc::now().timestamp_millis());
        let payment_type = data["type"].as_str().unwrap_or("salary");
        let amount = data["amount"].as_f64().unwrap_or(0.0);
        let salary_id = data["salaryId"].as_str();

        sqlx::query("INSERT INTO employee_payments (payment_id, school_id, employee_id, payment_type, amount, salary_id) VALUES ($1, $2, $3, $4, $5, $6)")
            .bind(&payment_id)
            .bind(school_id)
            .bind(employee_id)
            .bind(payment_type)
            .bind(amount)
            .bind(salary_id)
            .execute(&mut *conn)
            .await?;
        
        let mut ret = data.clone();
        ret["paymentId"] = json!(payment_id);
        Ok(ret)
    }

    async fn add_payroll_salary(
        &self,
        _school_id: &str,
        _employee_id: &str,
        _data: Value,
    ) -> Result<(), AppError> {
        // Bulk implementation could go here
        Ok(())
    }

    async fn get_payroll_summary(
        &self,
        school_id: &str,
        employee_id: &str,
        _page: u32,
        _limit: u32,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT * FROM employee_payments WHERE school_id = $1 AND employee_id = $2")
            .bind(school_id).bind(employee_id).fetch_all(&mut *conn).await?;
        
        let payments: Vec<Value> = rows.into_iter().map(|r| json!({
            "paymentId": r.get::<String, _>("payment_id"),
            "amount": r.get::<f64, _>("amount"),
            "date": r.get::<chrono::NaiveDateTime, _>("payment_date").to_string()
        })).collect();

        Ok(json!({"employeeId": employee_id, "payments": payments}))
    }

    async fn add_payment_history(
        &self,
        school_id: &str,
        employee_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        crate::repository::base::insert_audit_log(&mut *conn, school_id, "payroll", employee_id, action, data).await?;
        Ok(())
    }

    async fn get_payroll_history(
        &self,
        school_id: &str,
        employee_id: Option<&str>,
    ) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let query = if employee_id.is_some() {
            "SELECT * FROM payroll_salaries WHERE school_id = $1 AND employee_id = $2 ORDER BY year DESC, month DESC"
        } else {
            "SELECT * FROM payroll_salaries WHERE school_id = $1 ORDER BY year DESC, month DESC"
        };
        
        let rows = if let Some(eid) = employee_id {
            sqlx::query(query)
                .bind(school_id)
                .bind(eid)
                .fetch_all(&mut *conn)
                .await?
        } else {
            sqlx::query(query)
                .bind(school_id)
                .fetch_all(&mut *conn)
                .await?
        };
        
        let results = rows.iter().map(|r| {
            json!({
                "salaryId": r.get::<i32, _>("id"),
                "employeeId": r.get::<String, _>("employee_id"),
                "month": r.get::<i32, _>("month"),
                "year": r.get::<i32, _>("year"),
                "baseSalary": r.get::<f64, _>("base_salary"),
                "totalSalary": r.get::<f64, _>("total_salary"),
                "dueAmount": r.get::<f64, _>("due_amount"),
                "advanceAdjusted": r.get::<f64, _>("advance_adjusted"),
                "status": r.get::<String, _>("status"),
                "absentDays": r.get::<i32, _>("absent_days"),
                "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339()
            })
        }).collect();
        
        Ok(results)
    }

    async fn get_payment_history_list(
        &self,
        school_id: &str,
        employee_id: Option<&str>,
    ) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let query = if employee_id.is_some() {
            "SELECT * FROM payment_history WHERE school_id = $1 AND employee_id = $2 ORDER BY created_at DESC"
        } else {
            "SELECT * FROM payment_history WHERE school_id = $1 ORDER BY created_at DESC"
        };
        
        let rows = if let Some(eid) = employee_id {
            sqlx::query(query)
                .bind(school_id)
                .bind(eid)
                .fetch_all(&mut *conn)
                .await?
        } else {
            sqlx::query(query)
                .bind(school_id)
                .fetch_all(&mut *conn)
                .await?
        };
        
        let results = rows.iter().map(|r| {
            json!({
                "paymentId": r.get::<i32, _>("id"),
                "employeeId": r.get::<String, _>("employee_id"),
                "type": r.get::<String, _>("payment_type"),
                "amount": r.get::<f64, _>("amount"),
                "data": r.get::<Value, _>("payment_data"),
                "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339()
            })
        }).collect();
        
        Ok(results)
    }

    async fn get_payroll_report_data(
        &self,
        school_id: &str,
        month: i32,
        year: i32,
    ) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT e.employee_id, e.name, e.base_salary, p.total_salary, p.due_amount, p.status
             FROM employees e
             LEFT JOIN payroll_salaries p ON e.employee_id = p.employee_id AND p.month = $1 AND p.year = $2
             WHERE e.school_id = $3"
        )
        .bind(month)
        .bind(year)
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;
        
        let employees = rows.iter().map(|r| {
            json!({
                "employeeId": r.get::<String, _>("employee_id"),
                "name": r.get::<String, _>("name"),
                "baseSalary": r.get::<f64, _>("base_salary"),
                "totalSalary": r.get::<Option<f64>, _>("total_salary").unwrap_or(0.0),
                "dueAmount": r.get::<Option<f64>, _>("due_amount").unwrap_or(0.0),
                "status": r.get::<Option<String>, _>("status").unwrap_or_else(|| "NOT_PROCESSED".to_string())
            })
        }).collect();
        
        Ok(employees)
    }
}

