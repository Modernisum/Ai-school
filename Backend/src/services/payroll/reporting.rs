use crate::repository::Repositories;
use crate::services::traits::*;
use serde_json::{json, Value};
use sqlx::Row;
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
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let query = if employee_id.is_some() {
            "SELECT * FROM payroll_salaries WHERE school_id = $1 AND employee_id = $2 ORDER BY year DESC, month DESC"
        } else {
            "SELECT * FROM payroll_salaries WHERE school_id = $1 ORDER BY year DESC, month DESC"
        };
        
        let rows: Vec<sqlx::postgres::PgRow> = if let Some(eid) = employee_id {
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
        
        let results: Vec<Value> = rows.iter().map(|r| {
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

    pub async fn get_payment_history(
        &self,
        school_id: &str,
        employee_id: Option<&str>,
    ) -> AppResult<Vec<Value>> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let query = if employee_id.is_some() {
            "SELECT * FROM payment_history WHERE school_id = $1 AND employee_id = $2 ORDER BY created_at DESC"
        } else {
            "SELECT * FROM payment_history WHERE school_id = $1 ORDER BY created_at DESC"
        };
        
        let rows: Vec<sqlx::postgres::PgRow> = if let Some(eid) = employee_id {
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
        
        let results: Vec<Value> = rows.iter().map(|r| {
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

    pub async fn generate_payroll_report(
        &self,
        school_id: &str,
        month: i32,
        year: i32,
    ) -> AppResult<Value> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let rows: Vec<sqlx::postgres::PgRow> = sqlx::query(
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
        
        let employees: Vec<Value> = rows.iter().map(|r| {
            json!({
                "employeeId": r.get::<String, _>("employee_id"),
                "name": r.get::<String, _>("name"),
                "baseSalary": r.get::<f64, _>("base_salary"),
                "totalSalary": r.get::<Option<f64>, _>("total_salary").unwrap_or(0.0),
                "dueAmount": r.get::<Option<f64>, _>("due_amount").unwrap_or(0.0),
                "status": r.get::<Option<String>, _>("status").unwrap_or_else(|| "NOT_PROCESSED".to_string())
            })
        }).collect();
        
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
