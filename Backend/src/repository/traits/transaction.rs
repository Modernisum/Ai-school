use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait TransactionRepository: Send + Sync {
    async fn create_online_transaction(
        &self,
        school_id: &str,
        student_id: &str,
        fee_type: &str,
        fee_id: &str,
        amount: f64,
        currency: &str,
        gateway_order_id: &str,
    ) -> Result<(), AppError>;

    async fn complete_online_transaction(
        &self,
        gateway_order_id: &str,
        gateway_payment_id: &str,
        gateway_signature: &str,
    ) -> Result<Option<String>, AppError>;
}
