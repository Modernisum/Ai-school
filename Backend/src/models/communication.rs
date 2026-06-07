use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct SendMessageRequest {
    pub sender_id: String,
    pub sender_type: String, // 'employee', 'student', 'parent'
    pub receiver_id: String,
    pub receiver_type: String, // 'employee', 'student', 'parent', 'group'
    pub content: String,
    pub attachment_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub message_id: i32,
    pub sender_id: String,
    pub sender_type: String,
    pub receiver_id: String,
    pub receiver_type: String,
    pub content: String,
    pub attachment_url: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiHistoryEntry {
    pub role: String,
    pub content: String,
    pub created_at: String,
}
