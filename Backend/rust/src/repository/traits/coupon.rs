use async_trait::async_trait;
use serde_json::Value;

use super::{AppError, JsonList};

#[async_trait]
pub trait CouponRepository: Send + Sync {
    async fn create_coupon(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_coupons(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn delete_coupon(&self, school_id: &str, coupon_id: &str) -> Result<(), AppError>;
    async fn block_coupon(&self, school_id: &str, coupon_id: &str, blocked: bool) -> Result<(), AppError>;
    async fn validate_coupon(&self, school_id: &str, coupon_name: &str) -> Result<Option<Value>, AppError>;
    async fn use_coupon(&self, school_id: &str, coupon_id: &str, student_id: &str, discount: f64) -> Result<Value, AppError>;
    
    // Global Promo Code Operations
    async fn create_promo_code(
        &self,
        code: &str,
        credit_amount: bigdecimal::BigDecimal,
        free_days: i32,
        discount_percentage: bigdecimal::BigDecimal,
        expires_at: Option<chrono::DateTime<chrono::Utc>>,
        max_uses: i32,
    ) -> Result<(), AppError>;
    async fn list_promo_codes(&self) -> Result<Vec<Value>, AppError>;
    async fn apply_promo_code(&self, school_id: &str, code: &str) -> Result<String, AppError>;
    async fn get_promo_usage(&self, promo_id: i32) -> Result<Vec<Value>, AppError>;
}

