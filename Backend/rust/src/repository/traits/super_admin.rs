use async_trait::async_trait;
use serde_json::Value;
use bigdecimal::BigDecimal;
use super::AppError;

#[async_trait]
pub trait SuperAdminRepository: Send + Sync {
    async fn get_password_hash(&self, username: &str) -> Result<Option<String>, AppError>;
    async fn get_super_admin_profile(&self, username: &str) -> Result<Option<(String, Option<String>)>, AppError>;
    async fn update_super_admin(
        &self,
        current_username: &str,
        new_username: &str,
        password_hash: &str,
        profile_image_url: Option<String>,
    ) -> Result<(), AppError>;
    async fn refund_wallet(&self, school_id: &str, amount: BigDecimal, description: &str) -> Result<BigDecimal, AppError>;
    async fn get_wallet_ledger(&self, school_id: &str) -> Result<Vec<Value>, AppError>;
    async fn get_churn_radar(&self) -> Result<Vec<Value>, AppError>;
    async fn get_admin_stats(&self) -> Result<Value, AppError>;
}
