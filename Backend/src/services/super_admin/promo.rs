use super::AdminService;
use sqlx::{Row, Connection};
use std::error::Error;
use serde_json::{json, Value};

impl AdminService {
    pub async fn create_promo_code(
        &self,
        code: &str,
        credit_amount: bigdecimal::BigDecimal,
        free_days: i32,
        discount_percentage: bigdecimal::BigDecimal,
        expires_at: Option<chrono::DateTime<chrono::Utc>>,
        max_uses: i32,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        sqlx::query(
            "INSERT INTO promo_codes (code, credit_amount, free_days, discount_percentage, expires_at, max_uses, current_uses, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, 0, NOW())"
        )
        .bind(code)
        .bind(credit_amount.to_string().parse::<bigdecimal::BigDecimal>()?) // Ensure type safety
        .bind(free_days)
        .bind(discount_percentage)
        .bind(expires_at)
        .bind(max_uses)
        .execute(&mut *conn)
        .await?;

        Ok(json!({
            "success": true,
            "message": format!("Promo code {} created successfully", code)
        }))
    }

    pub async fn list_promo_codes(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let rows = sqlx::query(
            "SELECT id, code, credit_amount, free_days, discount_percentage, max_uses, current_uses, expires_at, created_at 
             FROM promo_codes ORDER BY created_at DESC"
        )
        .fetch_all(&mut *conn)
        .await?;

        let promos: Vec<Value> = rows
            .iter()
            .map(|r| {
                let credit: bigdecimal::BigDecimal = r.try_get("credit_amount").unwrap_or_default();
                let discount: bigdecimal::BigDecimal =
                    r.try_get("discount_percentage").unwrap_or_default();
                json!({
                    "id": r.try_get::<i32, _>("id").unwrap_or(0),
                    "code": r.try_get::<String, _>("code").unwrap_or_default(),
                    "creditAmount": credit.to_string(),
                    "discountPercentage": discount.to_string(),
                    "freeDays": r.try_get::<i32, _>("free_days").unwrap_or(0),
                    "maxUses": r.try_get::<i32, _>("max_uses").unwrap_or(1),
                    "currentUses": r.try_get::<i32, _>("current_uses").unwrap_or(0),
                    "expiresAt": r.try_get::<chrono::DateTime<chrono::Utc>, _>("expires_at")
                                   .ok().map(|t| t.to_rfc3339()),
                    "createdAt": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                                   .ok().map(|t| t.to_rfc3339()),
                })
            })
            .collect();

        Ok(json!(promos))
    }

    pub async fn apply_promo_code(
        &self,
        school_id: &str,
        code: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let promo = sqlx::query("SELECT * FROM promo_codes WHERE code = $1")
            .bind(code)
            .fetch_optional(&mut *conn)
            .await?;

        let p = match promo {
            Some(p) => p,
            None => return Err("Invalid promo code".into()),
        };

        let promo_id: i32 = p.get("id");
        let credit: bigdecimal::BigDecimal = p.get("credit_amount");
        let free_days: i32 = p.get("free_days");
        let discount_percentage: bigdecimal::BigDecimal =
            p.try_get("discount_percentage").unwrap_or_default();
        let max_uses: i32 = p.get("max_uses");
        let current_uses: i32 = p.get("current_uses");
        let expires_at: Option<chrono::DateTime<chrono::Utc>> = p.get("expires_at");

        if let Some(exp) = expires_at {
            if exp < chrono::Utc::now() {
                return Err("Promo code has expired".into());
            }
        }

        if current_uses >= max_uses {
            return Err("Promo code usage limit reached".into());
        }

        // Check if school already used it
        let already_used = sqlx::query(
            "SELECT 1 FROM school_promo_codes WHERE school_id = $1 AND promo_code_id = $2",
        )
        .bind(school_id)
        .bind(promo_id)
        .fetch_optional(&mut *conn)
        .await?;

        if already_used.is_some() {
            return Err("Promo code already applied to this school".into());
        }

        let mut tx = conn.begin().await?;

        // Fetch current school billing data
        let school_data = sqlx::query("SELECT per_student_rate, wallet_balance, base_rate, active_promo_id FROM schools WHERE school_id = $1")
            .bind(school_id)
            .fetch_one(&mut *tx)
            .await?;

        let active_promo_id: Option<i32> = school_data.get("active_promo_id");
        if active_promo_id.is_some() {
            return Err("A promo code is already active for this school. It must expire before another can be applied.".into());
        }

        let mut balance: bigdecimal::BigDecimal = school_data.get("wallet_balance");
        let mut per_student_rate: bigdecimal::BigDecimal = school_data.get("per_student_rate");
        let base_rate: bigdecimal::BigDecimal = school_data.get("base_rate");

        // Calculate promo_expires_at
        let mut promo_expires_at: Option<chrono::DateTime<chrono::Utc>> = p.get("expires_at");
        if promo_expires_at.is_none() && free_days > 0 {
            promo_expires_at = Some(chrono::Utc::now() + chrono::Duration::days(free_days as i64));
        }

        use bigdecimal::BigDecimal;
        use std::str::FromStr;

        let mut rate_updated = false;
        if discount_percentage > BigDecimal::from_str("0").unwrap() {
            let one_hundred = BigDecimal::from_str("100").unwrap();
            let discount_factor = (&one_hundred - &discount_percentage) / &one_hundred;

            // Apply discount to base_rate, not the current per_student_rate
            per_student_rate = (&base_rate * &discount_factor).round(2);

            sqlx::query(
                "UPDATE schools SET per_student_rate = $1, active_promo_id = $2, promo_expires_at = $3 WHERE school_id = $4"
            )
            .bind(&per_student_rate)
            .bind(promo_id)
            .bind(promo_expires_at)
            .bind(school_id)
            .execute(&mut *tx)
            .await?;
            rate_updated = true;
        } else {
            // Apply credit only, but still track active_promo_id if it has an expiry
            sqlx::query(
                "UPDATE schools SET active_promo_id = $1, promo_expires_at = $2 WHERE school_id = $3"
            )
            .bind(promo_id)
            .bind(promo_expires_at)
            .bind(school_id)
            .execute(&mut *tx)
            .await?;
        }

        // Apply Wallet Credit
        if credit > BigDecimal::from_str("0").unwrap() {
            sqlx::query(
                "UPDATE schools SET wallet_balance = wallet_balance + $1 WHERE school_id = $2",
            )
            .bind(&credit)
            .bind(school_id)
            .execute(&mut *tx)
            .await?;

            balance += &credit;

            sqlx::query(
                "INSERT INTO billing_ledger (school_id, amount, transaction_type, description, balance_after)
                 VALUES ($1, $2, 'promo_credit', $3, $4)"
            )
            .bind(school_id)
            .bind(&credit)
            .bind(format!("Promo code applied: {}", code))
            .bind(&balance)
            .execute(&mut *tx)
            .await?;
        }

        // Track usage
        sqlx::query("INSERT INTO school_promo_codes (school_id, promo_code_id) VALUES ($1, $2)")
            .bind(school_id)
            .bind(promo_id)
            .execute(&mut *tx)
            .await?;

        sqlx::query("UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = $1")
            .bind(promo_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        let msg = if rate_updated {
            format!(
                "Promo {} applied. New rate: ₹{}/student",
                code, per_student_rate
            )
        } else {
            format!("Promo code {} applied successfully", code)
        };

        Ok(json!({
            "success": true,
            "message": msg
        }))
    }

    pub async fn get_promo_usage(
        &self,
        promo_id: i32,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let rows = sqlx::query(
            "SELECT sp.school_id, s.school_name, sp.applied_at
             FROM school_promo_codes sp
             JOIN schools s ON sp.school_id = s.school_id
             WHERE sp.promo_code_id = $1
             ORDER BY sp.applied_at DESC",
        )
        .bind(promo_id)
        .fetch_all(&mut *conn)
        .await?;

        let usage: Vec<Value> = rows.iter().map(|r| {
            json!({
                "schoolId": r.get::<String, _>("school_id"),
                "schoolName": r.get::<String, _>("school_name"),
                "appliedAt": r.get::<chrono::DateTime<chrono::Utc>, _>("applied_at").to_rfc3339()
            })
        }).collect();

        Ok(json!(usage))
    }
}
