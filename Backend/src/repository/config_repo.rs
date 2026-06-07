use crate::db::DbClient;
use crate::repository::traits::AppError;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresConfigRepository {
    pub client: Arc<DbClient>,
}

impl PostgresConfigRepository {
    pub fn new(client: Arc<DbClient>) -> Self {
        Self { client }
    }

    pub async fn get(&self, school_id: &str, key: &str) -> Result<Option<Value>, AppError> {
        let row = sqlx::query("SELECT config_value FROM system_config WHERE school_id = $1 AND config_key = $2")
            .bind(school_id).bind(key)
            .fetch_optional(&self.client.pool).await?;
        Ok(row.map(|r| {
            let val_str: String = r.get("config_value");
            serde_json::from_str(&val_str).unwrap_or(Value::Null)
        }))
    }

    pub async fn set(&self, school_id: &str, key: &str, value: &Value) -> Result<(), AppError> {
        let val_str = serde_json::to_string(value).unwrap_or_default();
        sqlx::query(
            "INSERT INTO system_config (school_id, config_key, config_value) VALUES ($1, $2, $3)
             ON CONFLICT (school_id, config_key) DO UPDATE SET config_value = EXCLUDED.config_value"
        )
        .bind(school_id).bind(key).bind(&val_str)
        .execute(&self.client.pool).await?;
        Ok(())
    }

    pub async fn get_many(&self, school_id: &str, keys: &[&str]) -> Result<std::collections::HashMap<String, Value>, AppError> {
        let rows = sqlx::query("SELECT config_key, config_value FROM system_config WHERE school_id = $1 AND config_key = ANY($2)")
            .bind(school_id).bind(keys)
            .fetch_all(&self.client.pool).await?;

        let mut map = std::collections::HashMap::new();
        for r in rows {
            let key: String = r.get("config_key");
            let val_str: String = r.get("config_value");
            let val: Value = serde_json::from_str(&val_str).unwrap_or(Value::Null);
            map.insert(key, val);
        }
        Ok(map)
    }
}
