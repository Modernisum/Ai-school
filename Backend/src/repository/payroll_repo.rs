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
        sqlx::query("INSERT INTO audit_logs (school_id, target_type, target_id, action, data) VALUES ($1, $2, $3, $4, $5)")
            .bind(school_id).bind("payroll").bind(employee_id).bind(action).bind(data).execute(&mut *conn).await?;
        Ok(())
    }
}
