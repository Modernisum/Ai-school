use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::error::Error;
use std::sync::Arc;

pub struct PostgresTaskRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl TaskRepository for PostgresTaskRepository {
    async fn get_tasks(&self, school_id: &str) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows =
            sqlx::query("SELECT * FROM audit_logs WHERE school_id = $1 AND target_type = 'task'")
                .bind(school_id)
                .fetch_all(&mut *conn)
                .await?;
        Ok(rows
            .into_iter()
            .map(|r| json!({"id": r.get::<i32, _>("id"), "data": r.get::<Value, _>("data")}))
            .collect())
    }
}
