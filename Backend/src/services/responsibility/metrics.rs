use crate::repository::Repositories;
use crate::services::traits::*;
use serde_json::{json, Value};
use std::sync::Arc;
use sqlx::Row;

pub struct ResponsibilityMetrics {
    pub repos: Arc<Repositories>,
}

impl ResponsibilityMetrics {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn get_responsibility_utilization_metrics(
        &self,
        school_id: &str,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let date_filter = if let (Some(start), Some(end)) = (start_date, end_date) {
            format!(" AND er.created_at BETWEEN '{}' AND '{}'", start, end)
        } else {
            String::new()
        };
        
        let total_responsibilities: i64 = sqlx::query_scalar(
            &format!("SELECT COUNT(*) FROM responsibilities WHERE school_id = $1{}", date_filter)
        )
        .bind(school_id)
        .fetch_one(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        
        let assigned_responsibilities: i64 = sqlx::query_scalar(
            &format!("SELECT COUNT(DISTINCT responsibility_id) FROM employee_responsibilities er
                      JOIN responsibilities r ON er.responsibility_id = r.responsibility_id
                      WHERE r.school_id = $1{}", date_filter)
        )
        .bind(school_id)
        .fetch_one(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        
        let utilization_rate = if total_responsibilities > 0 {
            (assigned_responsibilities as f64 / total_responsibilities as f64) * 100.0
        } else {
            0.0
        };
        
        Ok(json!({
            "totalResponsibilities": total_responsibilities,
            "assignedResponsibilities": assigned_responsibilities,
            "unassignedResponsibilities": total_responsibilities - assigned_responsibilities,
            "utilizationRate": utilization_rate,
            "startDate": start_date,
            "endDate": end_date
        }))
    }
    
    pub async fn get_employee_workload_metrics(
        &self,
        school_id: &str,
        employee_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let mut query = "SELECT e.employee_id, e.name, COUNT(DISTINCT er.responsibility_id) as responsibility_count,
                        COUNT(DISTINCT er.space_ids) as space_count
                        FROM employees e
                        LEFT JOIN employee_responsibilities er ON e.employee_id = er.employee_id
                        WHERE e.school_id = $1".to_string();
        
        let mut param_count = 1;
        
        if let Some(eid) = employee_id {
            query.push_str(&format!(" AND e.employee_id = ${}", param_count + 1));
            param_count += 1;
        }
        
        query.push_str(" GROUP BY e.employee_id, e.name ORDER BY responsibility_count DESC");
        
        let rows = sqlx::query(&query)
            .bind(school_id)
            .bind(employee_id.unwrap_or(""))
            .fetch_all(&mut *conn)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        
        let mut employees = Vec::new();
        for row in rows {
            employees.push(json!({
                "employeeId": row.get::<String, _>("employee_id"),
                "name": row.get::<String, _>("name"),
                "responsibilityCount": row.get::<i64, _>("responsibility_count"),
                "spaceCount": row.get::<i64, _>("space_count")
            }));
        }
        
        Ok(json!({
            "employees": employees,
            "totalEmployees": employees.len(),
            "startDate": start_date,
            "endDate": end_date
        }))
    }
    
    pub async fn get_space_distribution_metrics(
        &self,
        school_id: &str,
        space_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let mut query = "SELECT s.space_id, s.name, COUNT(DISTINCT er.employee_id) as employee_count,
                        COUNT(DISTINCT er.responsibility_id) as responsibility_count
                        FROM spaces s
                        LEFT JOIN employee_responsibilities er ON s.space_id = ANY(er.space_ids)
                        WHERE s.school_id = $1".to_string();
        
        let mut param_count = 1;
        
        if let Some(sid) = space_id {
            query.push_str(&format!(" AND s.space_id = ${}", param_count + 1));
            param_count += 1;
        }
        
        query.push_str(" GROUP BY s.space_id, s.name ORDER BY employee_count DESC");
        
        let rows = sqlx::query(&query)
            .bind(school_id)
            .bind(space_id.unwrap_or(""))
            .fetch_all(&mut *conn)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        
        let mut spaces = Vec::new();
        for row in rows {
            spaces.push(json!({
                "spaceId": row.get::<String, _>("space_id"),
                "name": row.get::<String, _>("name"),
                "employeeCount": row.get::<i64, _>("employee_count"),
                "responsibilityCount": row.get::<i64, _>("responsibility_count")
            }));
        }
        
        Ok(json!({
            "spaces": spaces,
            "totalSpaces": spaces.len(),
            "startDate": start_date,
            "endDate": end_date
        }))
    }
    
    pub async fn get_revenue_metrics(
        &self,
        school_id: &str,
        responsibility_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> AppResult<Value> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let mut query = "SELECT r.responsibility_id, r.name, r.monthly_price,
                        COUNT(DISTINCT er.employee_id) as assigned_count,
                        r.monthly_price * COUNT(DISTINCT er.employee_id) as total_revenue
                        FROM responsibilities r
                        LEFT JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id
                        WHERE r.school_id = $1".to_string();
        
        let mut param_count = 1;
        
        if let Some(rid) = responsibility_id {
            query.push_str(&format!(" AND r.responsibility_id = ${}", param_count + 1));
            param_count += 1;
        }
        
        query.push_str(" GROUP BY r.responsibility_id, r.name, r.monthly_price ORDER BY total_revenue DESC");
        
        let rows = sqlx::query(&query)
            .bind(school_id)
            .bind(responsibility_id.unwrap_or(""))
            .fetch_all(&mut *conn)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        
        let mut responsibilities = Vec::new();
        let mut total_revenue = 0.0;
        
        for row in rows {
            let revenue: f64 = row.get::<f64, _>("total_revenue");
            total_revenue += revenue;
            responsibilities.push(json!({
                "responsibilityId": row.get::<String, _>("responsibility_id"),
                "name": row.get::<String, _>("name"),
                "monthlyPrice": row.get::<f64, _>("monthly_price"),
                "assignedCount": row.get::<i64, _>("assigned_count"),
                "totalRevenue": revenue
            }));
        }
        
        Ok(json!({
            "responsibilities": responsibilities,
            "totalRevenue": total_revenue,
            "startDate": start_date,
            "endDate": end_date
        }))
    }
    
    pub async fn generate_utilization_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        let metrics = self.get_responsibility_utilization_metrics(school_id, Some(start_date), Some(end_date)).await?;
        
        Ok(json!({
            "reportType": "utilization",
            "schoolId": school_id,
            "period": {
                "start": start_date,
                "end": end_date
            },
            "metrics": metrics,
            "generatedAt": chrono::Utc::now().to_rfc3339()
        }))
    }
    
    pub async fn generate_workload_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        let metrics = self.get_employee_workload_metrics(school_id, None, Some(start_date), Some(end_date)).await?;
        
        Ok(json!({
            "reportType": "workload",
            "schoolId": school_id,
            "period": {
                "start": start_date,
                "end": end_date
            },
            "metrics": metrics,
            "generatedAt": chrono::Utc::now().to_rfc3339()
        }))
    }
    
    pub async fn generate_space_distribution_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        let metrics = self.get_space_distribution_metrics(school_id, None, Some(start_date), Some(end_date)).await?;
        
        Ok(json!({
            "reportType": "space_distribution",
            "schoolId": school_id,
            "period": {
                "start": start_date,
                "end": end_date
            },
            "metrics": metrics,
            "generatedAt": chrono::Utc::now().to_rfc3339()
        }))
    }
    
    pub async fn generate_revenue_report(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        let metrics = self.get_revenue_metrics(school_id, None, Some(start_date), Some(end_date)).await?;
        
        Ok(json!({
            "reportType": "revenue",
            "schoolId": school_id,
            "period": {
                "start": start_date,
                "end": end_date
            },
            "metrics": metrics,
            "generatedAt": chrono::Utc::now().to_rfc3339()
        }))
    }
}
