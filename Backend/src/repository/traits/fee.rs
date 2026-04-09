use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait FeeRepository: Send + Sync {
    async fn add_school_fee(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_school_fees(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_pending_fees(
        &self,
        school_id: &str,
        min_percentage: f64,
        class_name: Option<String>,
    ) -> Result<JsonList, AppError>;
    async fn add_student_fee(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn get_student_fee(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Option<Value>, AppError>;
    async fn update_student_fee(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn add_fee_history(
        &self,
        school_id: &str,
        fee_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), AppError>;

    async fn add_custom_fee(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_custom_fees(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn delete_custom_fee(&self, school_id: &str, fee_id: &str) -> Result<(), AppError>;
    async fn apply_custom_fee(&self, school_id: &str, fee_id: &str) -> Result<Value, AppError>;
    async fn get_student_custom_fees(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Vec<Value>, AppError>;
}

#[async_trait]
pub trait CouponRepository: Send + Sync {
    async fn create_coupon(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_coupons(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn delete_coupon(&self, school_id: &str, coupon_id: &str) -> Result<(), AppError>;
    async fn block_coupon(
        &self,
        school_id: &str,
        coupon_id: &str,
        blocked: bool,
    ) -> Result<(), AppError>;
    async fn validate_coupon(
        &self,
        school_id: &str,
        coupon_name: &str,
    ) -> Result<Option<Value>, AppError>;
    async fn use_coupon(
        &self,
        school_id: &str,
        coupon_id: &str,
        student_id: &str,
        discount: f64,
    ) -> Result<Value, AppError>;
}
