use sqlx::Row;
use std::error::Error;
use serde_json::{json, Value};

pub struct SupportService {
    pub db: std::sync::Arc<crate::db::DbClient>,
}

impl SupportService {
    pub fn new(db: std::sync::Arc<crate::db::DbClient>) -> Self {
        Self { db }
    }

    pub async fn create_support_request(
        &self,
        school_name: &str,
        contact_info: &str,
        message: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        sqlx::query(
            "INSERT INTO support_requests (school_name, contact_info, message) VALUES ($1, $2, $3)",
        )
        .bind(school_name)
        .bind(contact_info)
        .bind(message)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    pub async fn list_support_requests(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let rows = sqlx::query(
            "SELECT id, school_name, contact_info, message, status, created_at 
             FROM support_requests ORDER BY created_at DESC",
        )
        .fetch_all(&mut *conn)
        .await?;

        let requests: Vec<Value> = rows
            .iter()
            .map(|r| {
                json!({
                    "id": r.try_get::<i32, _>("id").unwrap_or(0),
                    "schoolName": r.try_get::<String, _>("school_name").unwrap_or_default(),
                    "contactInfo": r.try_get::<String, _>("contact_info").unwrap_or_default(),
                    "message": r.try_get::<String, _>("message").unwrap_or_default(),
                    "status": r.try_get::<String, _>("status").unwrap_or_default(),
                    "createdAt": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                                   .ok().map(|t| t.to_rfc3339()),
                })
            })
            .collect();

        Ok(json!(requests))
    }

    pub async fn resolve_support_request(
        &self,
        id: i32,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        sqlx::query("UPDATE support_requests SET status = 'resolved' WHERE id = $1")
            .bind(id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }
}
