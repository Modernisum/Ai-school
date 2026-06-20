use async_trait::async_trait;
use crate::repository::traits::AppError;
use crate::models::communication::{ChatMessage, AiHistoryEntry};

#[async_trait]
pub trait CommunicationRepository: Send + Sync {
    async fn add_message(
        &self,
        school_id: &str,
        sender_id: &str,
        sender_type: &str,
        receiver_id: &str,
        receiver_type: &str,
        content: &str,
        attachment_url: Option<&str>,
    ) -> Result<(i32, String), AppError>;

    async fn get_chat_history(
        &self,
        school_id: &str,
        user1: &str,
        user2: &str,
    ) -> Result<Vec<ChatMessage>, AppError>;

    async fn get_ai_chat_history(&self, school_id: &str) -> Result<Vec<AiHistoryEntry>, AppError>;
}
