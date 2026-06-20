use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait FeeService: Send + Sync {
    async fn create_school_fee(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn get_school_fees(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn get_pending_fees(
        &self,
        school_id: &str,
        min_percentage: f64,
        class_name: Option<String>,
    ) -> AppResult<Vec<Value>>;
    async fn get_student_fee(&self, school_id: &str, student_id: &str) -> AppResult<Value>;
    async fn add_fee_to_student(
        &self,
        school_id: &str,
        student_id: &str,
        amount: f64,
        fee_id: &str,
        admin_id: &str,
    ) -> AppResult<Value>;
    async fn apply_discount(
        &self,
        school_id: &str,
        student_id: &str,
        discount: f64,
        admin_id: &str,
    ) -> AppResult<Value>;
    async fn pay_fee(
        &self,
        school_id: &str,
        student_id: &str,
        admin_id: &str,
        payload: Value,
    ) -> AppResult<Value>;
    async fn create_custom_fee(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn list_custom_fees(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn remove_custom_fee(
        &self,
        school_id: &str,
        fee_id: &str,
        admin_id: &str,
    ) -> AppResult<()>;
    async fn apply_custom_fee(
        &self,
        school_id: &str,
        fee_id: &str,
        admin_id: &str,
    ) -> AppResult<Value>;
    async fn generate_fee_reminder(&self, school_id: &str, student_id: &str) -> AppResult<Value>;
}

#[async_trait]
pub trait CouponService: Send + Sync {
    async fn create_coupon(&self, school_id: &str, admin_id: &str, data: Value)
        -> AppResult<Value>;
    async fn list_coupons(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn remove_coupon(
        &self,
        school_id: &str,
        coupon_id: &str,
        admin_id: &str,
    ) -> AppResult<()>;
    async fn toggle_block_coupon(
        &self,
        school_id: &str,
        coupon_id: &str,
        admin_id: &str,
        blocked: bool,
    ) -> AppResult<()>;
    async fn validate_coupon(&self, school_id: &str, coupon_name: &str)
        -> AppResult<Option<Value>>;
    async fn use_coupon(
        &self,
        school_id: &str,
        coupon_id: &str,
        student_id: &str,
        admin_id: &str,
        discount: f64,
    ) -> AppResult<Value>;
}
