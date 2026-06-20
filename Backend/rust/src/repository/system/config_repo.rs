use crate::db::DbClient;
use crate::repository::traits::{AppError, ConfigRepository};
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::{Row, Acquire};
use std::sync::Arc;

pub struct PostgresConfigRepository {
    pub client: Arc<DbClient>,
}

impl PostgresConfigRepository {
    pub fn new(client: Arc<DbClient>) -> Self {
        Self { client }
    }
}

#[async_trait]
impl ConfigRepository for PostgresConfigRepository {
    async fn get(&self, school_id: &str, key: &str) -> Result<Option<Value>, AppError> {
        let row = sqlx::query("SELECT config_value FROM system_config WHERE school_id = $1 AND config_key = $2")
            .bind(school_id).bind(key)
            .fetch_optional(&self.client.pool).await?;
        Ok(row.map(|r| {
            let val_str: String = r.get("config_value");
            serde_json::from_str(&val_str).unwrap_or(Value::Null)
        }))
    }

    async fn set(&self, school_id: &str, key: &str, value: &Value) -> Result<(), AppError> {
        let val_str = serde_json::to_string(value).unwrap_or_default();
        sqlx::query(
            "INSERT INTO system_config (school_id, config_key, config_value) VALUES ($1, $2, $3)
             ON CONFLICT (school_id, config_key) DO UPDATE SET config_value = EXCLUDED.config_value"
        )
        .bind(school_id).bind(key).bind(&val_str)
        .execute(&self.client.pool).await?;
        Ok(())
    }

    async fn get_many(&self, school_id: &str, keys: &[&str]) -> Result<std::collections::HashMap<String, Value>, AppError> {
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

    async fn register_webhook(
        &self,
        school_id: &str,
        url: &str,
        secret: &str,
        event_types: &[String],
    ) -> Result<i32, AppError> {
        let row = sqlx::query(
            "INSERT INTO webhook_endpoints (school_id, url, secret, event_types, status) \
             VALUES ($1, $2, $3, $4, 'active') RETURNING id",
        )
        .bind(school_id)
        .bind(url)
        .bind(secret)
        .bind(event_types)
        .fetch_one(&self.client.pool)
        .await?;

        let id: i32 = row.get(0);
        Ok(id)
    }

    async fn list_webhooks(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError> {
        let rows = sqlx::query(
            "SELECT id, url, event_types, status, created_at FROM webhook_endpoints WHERE school_id = $1"
        )
        .bind(school_id)
        .fetch_all(&self.client.pool)
        .await?;

        let endpoints: Vec<Value> = rows.iter().map(|r| {
            json!({
                "id": r.get::<i32, _>("id"),
                "url": r.get::<String, _>("url"),
                "event_types": r.get::<Vec<String>, _>("event_types"),
                "status": r.get::<String, _>("status"),
                "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
            })
        }).collect();

        Ok(endpoints)
    }

    async fn delete_webhook(
        &self,
        school_id: &str,
        id: i32,
    ) -> Result<(), AppError> {
        sqlx::query("DELETE FROM webhook_endpoints WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(id)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn get_webhook_logs(
        &self,
        school_id: &str,
        webhook_id: i32,
    ) -> Result<Vec<Value>, AppError> {
        let rows = sqlx::query(
            "SELECT id, event_type, status_code, attempt_count, last_attempt_at, status \
             FROM webhook_delivery_logs \
             WHERE school_id = $1 AND endpoint_id = $2 \
             ORDER BY created_at DESC LIMIT 50",
        )
        .bind(school_id)
        .bind(webhook_id)
        .fetch_all(&self.client.pool)
        .await?;

        let logs: Vec<Value> = rows.iter().map(|r| {
            json!({
                "id": r.get::<i32, _>("id"),
                "event_type": r.get::<String, _>("event_type"),
                "status_code": r.get::<Option<i32>, _>("status_code"),
                "attempt_count": r.get::<i32, _>("attempt_count"),
                "last_attempt_at": r.get::<chrono::DateTime<chrono::Utc>, _>("last_attempt_at").to_rfc3339(),
                "status": r.get::<String, _>("status"),
            })
        }).collect();

        Ok(logs)
    }

    async fn get_global_config(&self, key: &str) -> Result<Option<String>, AppError> {
        let row = sqlx::query("SELECT config_value FROM system_config WHERE config_key = $1")
            .bind(key)
            .fetch_optional(&self.client.pool)
            .await?;
        Ok(row.map(|r| r.get::<String, _>("config_value")))
    }

    async fn set_global_config(&self, key: &str, value: &str) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO system_config (config_key, config_value, updated_at) \
             VALUES ($1, $2, NOW()) \
             ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = EXCLUDED.updated_at"
        )
        .bind(key)
        .bind(value)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }

    async fn set_global_notification(&self, notification: Value) -> Result<(), AppError> {
        let mut conn = self.client.pool.acquire().await?;
        let mut tx = conn.begin().await?;

        sqlx::query("UPDATE global_notifications SET active = FALSE WHERE active = TRUE")
            .execute(&mut *tx)
            .await?;

        sqlx::query("INSERT INTO global_notifications (notification, active) VALUES ($1, TRUE)")
            .bind(notification)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }

    async fn clear_global_notification(&self) -> Result<(), AppError> {
        sqlx::query("UPDATE global_notifications SET active = FALSE WHERE active = TRUE")
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn get_global_notification(&self) -> Result<Option<Value>, AppError> {
        let row = sqlx::query("SELECT notification FROM global_notifications WHERE active = TRUE ORDER BY created_at DESC LIMIT 1")
            .fetch_optional(&self.client.pool)
            .await?;
        Ok(row.map(|r| r.get::<Value, _>("notification")))
    }

    async fn fetch_table_for_school(&self, table: &str, school_id: &str) -> Result<Vec<Value>, AppError> {
        let allowed_tables = [
            "students", "employees", "classes", "subjects", "fees", 
            "attendance", "announcements", "events", "complains", "spaces"
        ];
        if !allowed_tables.contains(&table) {
            return Err(Box::new(crate::error::AppError::Validation(format!("Invalid table name: {}", table))));
        }

        let q = format!("SELECT row_to_json(t) as j FROM {} t WHERE school_id = $1", table);
        let rows = sqlx::query(&q)
            .bind(school_id)
            .fetch_all(&self.client.pool)
            .await?;

        let results = rows
            .into_iter()
            .filter_map(|r| r.try_get::<Value, _>(0).ok())
            .collect();
        Ok(results)
    }

    async fn get_all_school_ids(&self) -> Result<Vec<String>, AppError> {
        let rows = sqlx::query("SELECT school_id FROM schools")
            .fetch_all(&self.client.pool)
            .await?;
        let ids = rows
            .into_iter()
            .filter_map(|r| r.try_get::<String, _>("school_id").ok())
            .collect();
        Ok(ids)
    }

    async fn import_student_record(&self, school_id: &str, student_id: &str, data: Value) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO students (student_id, school_id, data, created_at, updated_at) \
             VALUES ($1, $2, $3, NOW(), NOW()) \
             ON CONFLICT (student_id) DO UPDATE SET data = EXCLUDED.data",
        )
        .bind(student_id)
        .bind(school_id)
        .bind(data)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }
}

