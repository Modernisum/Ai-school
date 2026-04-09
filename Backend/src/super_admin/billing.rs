use sqlx::Row;
use std::error::Error;
use serde_json::{json, Value};

pub struct BillingService {
    pub db: std::sync::Arc<crate::db::DbClient>,
}

impl BillingService {
    pub fn new(db: std::sync::Arc<crate::db::DbClient>) -> Self {
        Self { db }
    }

    pub async fn process_refund(
        &self,
        school_id: &str,
        amount: bigdecimal::BigDecimal,
        description: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut tx = self.db.pool.begin().await?;
 
        // Update wallet balance
        let row: sqlx::postgres::PgRow = sqlx::query(
            "UPDATE schools SET wallet_balance = wallet_balance + $1 WHERE school_id = $2 RETURNING wallet_balance"
        )
        .bind(&amount)
        .bind(school_id)
        .fetch_one(&mut *tx)
        .await?;
 
        let new_balance: bigdecimal::BigDecimal = row.get("wallet_balance");
 
        // Record in ledger
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
 
        Ok(json!({
            "success": true,
            "newBalance": new_balance.to_string(),
            "message": format!("Refund of ₹{} processed for school {}", amount, school_id)
        }))
    }

    pub async fn get_wallet_ledger(
        &self,
        school_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let rows = sqlx::query(
            "SELECT id, amount, transaction_type, description, balance_after, created_at
             FROM billing_ledger WHERE school_id = $1 ORDER BY created_at DESC"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;
 
        let ledger: Vec<Value> = rows.iter().map(|r| {
            let amount: bigdecimal::BigDecimal = r.try_get("amount").unwrap_or_default();
            let balance: bigdecimal::BigDecimal = r.try_get("balance_after").unwrap_or_default();
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
 
        Ok(json!(ledger))
    }
}
