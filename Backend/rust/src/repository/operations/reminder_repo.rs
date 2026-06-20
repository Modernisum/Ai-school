use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::{Acquire, Row};
use std::sync::Arc;

pub struct PostgresReminderRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl ReminderRepository for PostgresReminderRepository {
    async fn add_reminder(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let res = sqlx::query("INSERT INTO reminders (school_id, title, description, remind_at) VALUES ($1, $2, $3, $4) RETURNING id")
            .bind(school_id).bind(data["title"].as_str()).bind(data["description"].as_str()).bind(data["remindAt"].as_str().map(|d| d.parse::<chrono::NaiveDateTime>().unwrap_or_else(|_| chrono::Utc::now().naive_utc()))).fetch_one(&mut *conn).await?;
        let mut ret = data.clone();
        ret["id"] = json!(res.get::<i32, _>("id"));
        Ok(ret)
    }

    async fn get_reminders(&self, school_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT id, title, remind_at FROM reminders WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;
        Ok(rows
            .into_iter()
            .map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title")}))
            .collect())
    }

    async fn get_reminder(
        &self,
        school_id: &str,
        reminder_id: i32,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM reminders WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(reminder_id)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(row.map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title")})))
    }

    async fn delete_reminder(&self, school_id: &str, reminder_id: i32) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM reminders WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(reminder_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }
}
