use super::AdminService;
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
        self.repos.coupon.create_promo_code(
            code,
            credit_amount,
            free_days,
            discount_percentage,
            expires_at,
            max_uses,
        ).await?;

        Ok(json!({
            "success": true,
            "message": format!("Promo code {} created successfully", code)
        }))
    }

    pub async fn list_promo_codes(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let promos = self.repos.coupon.list_promo_codes().await?;
        Ok(json!(promos))
    }

    pub async fn apply_promo_code(
        &self,
        school_id: &str,
        code: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let msg = self.repos.coupon.apply_promo_code(school_id, code).await?;
        Ok(json!({
            "success": true,
            "message": msg
        }))
    }

    pub async fn get_promo_usage(
        &self,
        promo_id: i32,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let usage = self.repos.coupon.get_promo_usage(promo_id).await?;
        Ok(json!(usage))
    }
}
