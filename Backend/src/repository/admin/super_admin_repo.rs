use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::{Row, Acquire};
use bigdecimal::BigDecimal;
use std::sync::Arc;

pub struct PostgresSuperAdminRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl SuperAdminRepository for PostgresSuperAdminRepository {
    async fn get_password_hash(&self, username: &str) -> Result<Option<String>, AppError> {
        let mut conn = self.client.acquire_super_admin_connection().await?;
        let row = sqlx::query("SELECT password_hash FROM super_admin WHERE username = $1")
            .bind(username)
            .fetch_optional(&mut *conn)
            .await?;
        if let Some(r) = row {
            let hash: String = r.try_get("password_hash")?;
            Ok(Some(hash))
        } else {
            Ok(None)
        }
    }

    async fn get_super_admin_profile(&self, username: &str) -> Result<Option<(String, Option<String>)>, AppError> {
        let mut conn = self.client.acquire_super_admin_connection().await?;
        let row = sqlx::query("SELECT username, profile_image_url FROM super_admin WHERE username = $1")
            .bind(username)
            .fetch_optional(&mut *conn)
            .await?;
        if let Some(r) = row {
            let u: String = r.try_get("username")?;
            let img: Option<String> = r.try_get("profile_image_url")?;
            Ok(Some((u, img)))
        } else {
            Ok(None)
        }
    }

    async fn update_super_admin(
        &self,
        current_username: &str,
        new_username: &str,
        password_hash: &str,
        profile_image_url: Option<String>,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_super_admin_connection().await?;
        let mut tx = conn.begin().await?;

        // Fetch old photo
        let row = sqlx::query("SELECT profile_image_url FROM super_admin WHERE username = $1")
            .bind(current_username)
            .fetch_optional(&mut *tx)
            .await?;
        let old_photo: Option<String> = row.and_then(|r| r.try_get("profile_image_url").ok());

        if current_username != new_username {
            sqlx::query("DELETE FROM super_admin WHERE username = $1")
                .bind(current_username)
                .execute(&mut *tx)
                .await?;
        }

        sqlx::query(
            "INSERT INTO super_admin (username, password_hash, profile_image_url) VALUES ($1, $2, $3)
             ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, profile_image_url = EXCLUDED.profile_image_url"
        )
        .bind(new_username)
        .bind(password_hash)
        .bind(&profile_image_url)
        .execute(&mut *tx)
        .await?;

        // Handle file transitions
        if let Some(url) = &profile_image_url {
            sqlx::query("UPDATE app_files SET is_permanent = TRUE WHERE public_url = $1")
                .bind(url)
                .execute(&mut *tx)
                .await?;
        }

        if let Some(old_url) = old_photo {
            if let Some(new_url) = &profile_image_url {
                if old_url != *new_url {
                    sqlx::query("UPDATE app_files SET is_permanent = FALSE WHERE public_url = $1")
                        .bind(old_url)
                        .execute(&mut *tx)
                        .await?;
                }
            } else {
                sqlx::query("UPDATE app_files SET is_permanent = FALSE WHERE public_url = $1")
                    .bind(old_url)
                    .execute(&mut *tx)
                    .await?;
            }
        }

        tx.commit().await?;
        Ok(())
    }

    async fn refund_wallet(&self, school_id: &str, amount: BigDecimal, description: &str) -> Result<BigDecimal, AppError> {
        let mut conn = self.client.acquire_super_admin_connection().await?;
        let mut tx = conn.begin().await?;

        let row = sqlx::query(
            "UPDATE schools SET wallet_balance = wallet_balance + $1 WHERE school_id = $2 RETURNING wallet_balance"
        )
        .bind(&amount)
        .bind(school_id)
        .fetch_one(&mut *tx)
        .await?;

        let new_balance: BigDecimal = row.get("wallet_balance");

        sqlx::query(
            "INSERT INTO billing_ledger (school_id, amount, transaction_type, description, balance_after)
             VALUES ($1, $2, 'refund', $3, $4)"
        )
        .bind(school_id)
        .bind(&amount)
        .bind(description)
        .bind(&new_balance)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(new_balance)
    }

    async fn get_wallet_ledger(&self, school_id: &str) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_super_admin_connection().await?;
        let rows = sqlx::query(
            "SELECT id, amount, transaction_type, description, balance_after, created_at
             FROM billing_ledger WHERE school_id = $1 ORDER BY created_at DESC"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let ledger: Vec<Value> = rows.iter().map(|r| {
            let amount: BigDecimal = r.try_get("amount").unwrap_or_default();
            let balance: BigDecimal = r.try_get("balance_after").unwrap_or_default();
            json!({
                "id": r.try_get::<i32, _>("id").unwrap_or(0),
                "amount": amount.to_string(),
                "type": r.try_get::<String, _>("transaction_type").unwrap_or_default(),
                "description": r.try_get::<String, _>("description").unwrap_or_default(),
                "balanceAfter": balance.to_string(),
                "createdAt": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                               .ok().map(|t| t.to_rfc3339()),
            })
        }).collect();

        Ok(ledger)
    }

    async fn get_churn_radar(&self) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_super_admin_connection().await?;
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

        Ok(radar)
    }

    async fn get_admin_stats(&self) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_super_admin_connection().await?;

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
                "thirty_days": revenue_metrics.try_get::<BigDecimal, _>("total_revenue").unwrap_or_else(|_| BigDecimal::from(0)).to_string()
            },
            "load": {
                "students": system_load.try_get::<i64, _>("total_students").unwrap_or(0),
                "employees": system_load.try_get::<i64, _>("total_employees").unwrap_or(0)
            }
        }))
    }
}
