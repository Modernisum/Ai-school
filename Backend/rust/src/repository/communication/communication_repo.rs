use crate::db::DbClient;
use crate::repository::traits::{AppError, CommunicationRepository};
use crate::models::communication::{ChatMessage, AiHistoryEntry};
use async_trait::async_trait;
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresCommunicationRepository {
    pub client: Arc<DbClient>,
}

impl PostgresCommunicationRepository {
    pub fn new(client: Arc<DbClient>) -> Self {
        Self { client }
    }
}

#[async_trait]
impl CommunicationRepository for PostgresCommunicationRepository {
    async fn add_message(
        &self,
        school_id: &str,
        sender_id: &str,
        sender_type: &str,
        receiver_id: &str,
        receiver_type: &str,
        content: &str,
        attachment_url: Option<&str>,
    ) -> Result<(i32, String), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query(
            "INSERT INTO messages (school_id, sender_id, sender_type, receiver_id, receiver_type, content, attachment_url) \
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING message_id, created_at::TEXT"
        )
        .bind(school_id)
        .bind(sender_id)
        .bind(sender_type)
        .bind(receiver_id)
        .bind(receiver_type)
        .bind(content)
        .bind(attachment_url)
        .fetch_one(&mut *conn)
        .await?;

        let message_id: i32 = row.get("message_id");
        let created_at: String = row.get("created_at");
        Ok((message_id, created_at))
    }

    async fn get_chat_history(
        &self,
        school_id: &str,
        user1: &str,
        user2: &str,
    ) -> Result<Vec<ChatMessage>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT * FROM messages WHERE school_id = $1 \
             AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2)) \
             ORDER BY created_at ASC LIMIT 50",
        )
        .bind(school_id)
        .bind(user1)
        .bind(user2)
        .fetch_all(&mut *conn)
        .await?;

        let history: Vec<ChatMessage> = rows.iter().map(|r| {
            ChatMessage {
                message_id: r.get("message_id"),
                sender_id: r.get("sender_id"),
                sender_type: r.get("sender_type"),
                receiver_id: r.get("receiver_id"),
                receiver_type: r.get("receiver_type"),
                content: r.get("content"),
                attachment_url: r.get("attachment_url"),
                created_at: r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
            }
        }).collect();

        Ok(history)
    }

    async fn get_ai_chat_history(&self, school_id: &str) -> Result<Vec<AiHistoryEntry>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT role, content, created_at::TEXT FROM ai_chat_history WHERE school_id = $1 ORDER BY created_at ASC LIMIT 100"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let history: Vec<AiHistoryEntry> = rows.iter().map(|r| {
            AiHistoryEntry {
                role: r.get("role"),
                content: r.get("content"),
                created_at: r.get("created_at"),
            }
        }).collect();

        Ok(history)
    }
}
