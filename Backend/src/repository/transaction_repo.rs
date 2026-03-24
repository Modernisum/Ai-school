use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresTransactionRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::TransactionRepository for PostgresTransactionRepository {
    async fn create_online_transaction(
        &self,
        school_id: &str,
        student_id: &str,
        fee_type: &str,
        fee_id: &str,
        amount: f64,
        currency: &str,
        gateway_order_id: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO transactions (school_id, student_id, fee_type, fee_id, amount, currency, gateway_order_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')")
            .bind(school_id).bind(student_id).bind(fee_type).bind(fee_id).bind(amount).bind(currency).bind(gateway_order_id).execute(&mut *conn).await?;
        Ok(())
    }

    async fn complete_online_transaction(
        &self,
        gateway_order_id: &str,
        gateway_payment_id: &str,
        gateway_signature: &str,
    ) -> Result<Option<String>, AppError> {
        let row = sqlx::query("UPDATE transactions SET gateway_payment_id = $1, gateway_signature = $2, status = 'completed', completed_at = NOW() WHERE gateway_order_id = $3 RETURNING school_id")
            .bind(gateway_payment_id)
            .bind(gateway_signature)
            .bind(gateway_order_id)
            .fetch_optional(&self.client.pool)
            .await?;
        
        Ok(row.map(|r| r.get::<String, _>("school_id")))
    }
}
