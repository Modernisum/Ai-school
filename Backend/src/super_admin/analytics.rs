use sqlx::Row;
use std::error::Error;
use serde_json::{json, Value};

pub struct AnalyticsService {
    pub db: std::sync::Arc<crate::db::DbClient>,
}

impl AnalyticsService {
    pub fn new(db: std::sync::Arc<crate::db::DbClient>) -> Self {
        Self { db }
    }

    pub async fn get_churn_radar(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let rows = sqlx::query(
            r#"
            SELECT 
                s.school_id, 
                s.school_name, 
                cp.churn_probability, 
                cp.risk_factors,
                cp.last_calculated
            FROM school_churn_predictions cp
            JOIN schools s ON s.school_id = cp.school_id
            WHERE s.status = 'active'
            ORDER BY cp.churn_probability DESC
            LIMIT 20
            "#,
        )
        .fetch_all(&mut *conn)
        .await?;

        let radar: Vec<Value> = rows
            .iter()
            .map(|r| {
                json!({
                    "schoolId": r.try_get::<String, _>("school_id").unwrap_or_default(),
                    "schoolName": r.try_get::<String, _>("school_name").unwrap_or_default(),
                    "probability": r.try_get::<i32, _>("churn_probability").unwrap_or(0),
                    "factors": r.try_get::<Value, _>("risk_factors").unwrap_or(json!([])),
                    "lastCalculated": r.try_get::<chrono::DateTime<chrono::Utc>, _>("last_calculated")
                                       .ok().map(|t| t.to_rfc3339()),
                })
            })
            .collect();

        Ok(json!(radar))
    }

    pub async fn get_admin_stats(&self) -> Result<serde_json::Value, Box<dyn Error>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        
        // 1. School Metrics
        let school_metrics = sqlx::query(
            r#"
            SELECT
                COUNT(*) as total_schools,
                COUNT(*) FILTER (WHERE status = 'Active') as active_schools,
                COUNT(*) FILTER (WHERE status = 'Trial') as trial_schools
            FROM schools
            "#
        )
        .fetch_one(&mut *conn)
        .await?;
        
        // 2. Revenue (Last 30 days) - Based on deductions from schools
        // We take sum of absolute values of 'monthly_usage' transactions
        let revenue_metrics = sqlx::query(
            r#"
            SELECT
                ABS(COALESCE(SUM(amount), 0)) as total_revenue
            FROM billing_ledger
            WHERE transaction_type = 'monthly_usage'
            AND created_at > NOW() - INTERVAL '30 days'
            "#
        )
        .fetch_one(&mut *conn)
        .await?;
        
        // 3. System Load (Simplified)
        let system_load = sqlx::query(
            r#"
            SELECT
                (SELECT COUNT(*) FROM students) as total_students,
                (SELECT COUNT(*) FROM employees) as total_employees
            "#
        )
        .fetch_one(&mut *conn)
        .await?;
        
        Ok(json!({
            "schools": {
                "total": school_metrics.try_get::<i64, _>("total_schools").unwrap_or(0),
                "active": school_metrics.try_get::<i64, _>("active_schools").unwrap_or(0),
                "trial": school_metrics.try_get::<i64, _>("trial_schools").unwrap_or(0)
            },
            "revenue": {
                "thirty_days": revenue_metrics.try_get::<bigdecimal::BigDecimal, _>("total_revenue").unwrap_or_else(|_| bigdecimal::BigDecimal::from(0)).to_string()
            },
            "load": {
                "students": system_load.try_get::<i64, _>("total_students").unwrap_or(0),
                "employees": system_load.try_get::<i64, _>("total_employees").unwrap_or(0)
            }
        }))
    }
}
