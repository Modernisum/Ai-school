use super::AdminService;
use std::error::Error;
use serde_json::{json, Value};

impl AdminService {
    pub async fn process_refund(
        &self,
        school_id: &str,
        amount: bigdecimal::BigDecimal,
        description: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let new_balance = self.repos.super_admin.refund_wallet(school_id, amount.clone(), description).await?;

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
        let ledger = self.repos.super_admin.get_wallet_ledger(school_id).await?;
        Ok(json!(ledger))
    }

    pub async fn get_churn_radar(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let radar = self.repos.super_admin.get_churn_radar().await?;
        Ok(json!(radar))
    }

    pub async fn get_admin_stats(&self) -> Result<serde_json::Value, Box<dyn Error + Send + Sync>> {
        let stats = self.repos.super_admin.get_admin_stats().await?;
        Ok(stats)
    }
}

