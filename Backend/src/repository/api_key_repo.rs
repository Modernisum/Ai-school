use crate::db::DbClient;
use crate::repository::traits::{AppError, ApiKeyRepository};
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresApiKeyRepository {
    pub client: Arc<DbClient>,
}

impl PostgresApiKeyRepository {
    pub fn new(client: Arc<DbClient>) -> Self {
        Self { client }
    }
}

#[async_trait]
impl ApiKeyRepository for PostgresApiKeyRepository {
    async fn generate_api_key(
        &self,
        school_id: &str,
        key_id: &str,
        key_hash: &str,
        name: &str,
        scopes: &[String],
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO api_keys (school_id, key_id, key_hash, name, scopes, status)
             VALUES ($1, $2, $3, $4, $5, 'active')",
        )
        .bind(school_id)
        .bind(key_id)
        .bind(key_hash)
        .bind(name)
        .bind(scopes)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }

    async fn list_api_keys(&self, school_id: &str) -> Result<Vec<Value>, AppError> {
        let rows = sqlx::query(
            "SELECT id, key_id, name, scopes, status, last_attempt_at, created_at 
             FROM api_keys WHERE school_id = $1",
        )
        .bind(school_id)
        .fetch_all(&self.client.pool)
        .await?;

        let keys: Vec<Value> = rows.iter().map(|r| {
            json!({
                "id": r.get::<i32, _>("id"),
                "key_id": r.get::<String, _>("key_id"),
                "name": r.get::<String, _>("name"),
                "scopes": r.get::<Vec<String>, _>("scopes"),
                "status": r.get::<String, _>("status"),
                "last_used_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_attempt_at").map(|d| d.to_rfc3339()),
                "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
            })
        }).collect();

        Ok(keys)
    }

    async fn revoke_api_key(&self, school_id: &str, key_id: &str) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE api_keys SET status = 'revoked', updated_at = NOW() 
             WHERE school_id = $1 AND key_id = $2",
        )
        .bind(school_id)
        .bind(key_id)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }
}
