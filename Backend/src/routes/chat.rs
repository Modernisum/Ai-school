use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use sqlx::Row;

#[derive(Deserialize)]
pub struct SendMessageRequest {
    pub sender_id: String,
    pub sender_type: String, // 'employee', 'student', 'parent'
    pub receiver_id: String,
    pub receiver_type: String, // 'employee', 'student', 'parent', 'group'
    pub content: String,
    pub attachment_url: Option<String>,
}

#[derive(Serialize)]
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

pub async fn send_message(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<SendMessageRequest>,
) -> impl IntoResponse {
    let mut conn = match state.db.acquire_tenant_connection(&school_id).await {
        Ok(c) => c,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response(),
    };

    let row = sqlx::query(
        "INSERT INTO messages (school_id, sender_id, sender_type, receiver_id, receiver_type, content, attachment_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING message_id, created_at::TEXT"
    )
    .bind(&school_id)
    .bind(&payload.sender_id)
    .bind(&payload.sender_type)
    .bind(&payload.receiver_id)
    .bind(&payload.receiver_type)
    .bind(&payload.content)
    .bind(&payload.attachment_url)
    .fetch_one(&mut *conn)
    .await;

    match row {
        Ok(r) => {
            let msg_id: i32 = r.get("message_id");
            let ct: String = r.get("created_at");

            let chat_msg = ChatMessage {
                message_id: msg_id,
                sender_id: payload.sender_id.clone(),
                sender_type: payload.sender_type.clone(),
                receiver_id: payload.receiver_id.clone(),
                receiver_type: payload.receiver_type.clone(),
                content: payload.content.clone(),
                attachment_url: payload.attachment_url.clone(),
                created_at: ct,
            };

            // Publish to Redis Pub/Sub so clients get it instantly
            let redis_url =
                std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1/".to_string());
            if let Ok(redis_client) = redis::Client::open(redis_url) {
                if let Ok(mut pubsub_conn) = redis_client.get_multiplexed_async_connection().await {
                    let channel_name = format!("school:{}:user:{}", school_id, payload.receiver_id);
                    let msg_json = serde_json::to_string(&chat_msg).unwrap_or_default();
                    let _: Result<(), _> = pubsub_conn.publish(channel_name, msg_json).await;
                }
            }

            (StatusCode::OK, Json(chat_msg)).into_response()
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Failed to send message").into_response(),
    }
}

pub async fn get_history(
    State(state): State<AppState>,
    Path((school_id, user1, user2)): Path<(String, String, String)>,
) -> impl IntoResponse {
    let mut conn = match state.db.acquire_tenant_connection(&school_id).await {
        Ok(c) => c,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response(),
    };

    let rows = sqlx::query(
        "SELECT * FROM messages WHERE school_id = $1 
         AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))
         ORDER BY created_at ASC LIMIT 50",
    )
    .bind(&school_id)
    .bind(&user1)
    .bind(&user2)
    .fetch_all(&mut *conn)
    .await;

    match rows {
        Ok(rs) => {
            use sqlx::Row;
            let mut history = Vec::new();
            for r in rs {
                history.push(ChatMessage {
                    message_id: r.get("message_id"),
                    sender_id: r.get("sender_id"),
                    sender_type: r.get("sender_type"),
                    receiver_id: r.get("receiver_id"),
                    receiver_type: r.get("receiver_type"),
                    content: r.get("content"),
                    attachment_url: r.get("attachment_url"),
                    // Using get_unchecked or map for timezone serialization depending on driver behavior:
                    // Here let's just use naive string cast from DB for simplicity or generic Value
                    created_at: r
                        .get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                        .to_rfc3339(),
                });
            }
            (StatusCode::OK, Json(history)).into_response()
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch history").into_response(),
    }
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/:schoolId/send", post(send_message))
        .route("/:schoolId/history/:user1/:user2", get(get_history))
}
