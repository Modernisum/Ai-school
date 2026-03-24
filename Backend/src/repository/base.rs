use crate::db::DbClient;
use crate::repository::traits::AppError;
use sqlx::{Postgres, Transaction, Connection};
use std::sync::Arc;

#[allow(dead_code)]
pub struct PostgresBaseRepository {
    pub client: Arc<DbClient>,
}

#[allow(dead_code)]
impl PostgresBaseRepository {
    pub fn new(client: Arc<DbClient>) -> Self {
        Self { client }
    }

    pub async fn with_tenant_tx<F, T>(&self, school_id: &str, f: F) -> Result<T, AppError>
    where
        F: for<'c> FnOnce(&'c mut Transaction<'_, Postgres>) -> futures_util::future::BoxFuture<'c, Result<T, AppError>>,
    {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;
        let result = f(&mut tx).await;
        if result.is_ok() {
            tx.commit().await?;
        }
        result
    }
}
