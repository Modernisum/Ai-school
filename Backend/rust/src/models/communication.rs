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

#[derive(Debug, Deserialize, Serialize)]
pub struct NotificationListQuery {
    pub category: Option<String>,
    pub unread_only: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WsAuthPayload {
    pub token: String,
    pub school_id: String,
    pub vehicle_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WsEnvelope {
    pub version: &'static str,
    #[serde(rename = "type")]
    pub msg_type: String,
    pub id: String,
    pub timestamp: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateWebhookRequest {
    pub url: String,
    pub secret: String,
    pub event_types: Vec<String>,
}



