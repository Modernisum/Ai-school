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
}
