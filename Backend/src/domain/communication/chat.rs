use crate::AppState;
use crate::models::communication::{SendMessageRequest, ChatMessage, AiHistoryEntry};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use redis::AsyncCommands;
use serde_json::json;

pub async fn send_message(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<SendMessageRequest>,
) -> impl IntoResponse {
    let result = state.repos.communication.add_message(
        &school_id,
        &payload.sender_id,
        &payload.sender_type,
        &payload.receiver_id,
        &payload.receiver_type,
        &payload.content,
        payload.attachment_url.as_deref(),
    ).await;

    match result {
        Ok((msg_id, ct)) => {
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
                std::env::var("REDIS_URL").expect("REDIS_URL environment variable must be set");
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
    match state.repos.communication.get_chat_history(&school_id, &user1, &user2).await {
        Ok(history) => (StatusCode::OK, Json(history)).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch history").into_response(),
    }
}

// ── AI Chat History ──────────────────────────────────────────────────────

pub async fn get_ai_chat_history(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.repos.communication.get_ai_chat_history(&school_id).await {
        Ok(history) => (StatusCode::OK, Json(json!({"success": true, "data": history}))).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success": false, "message": "Failed to fetch chat history"}))).into_response(),
    }
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/:schoolId/send", post(send_message))
        .route("/:schoolId/history/:user1/:user2", get(get_history))
        .route("/:schoolId/ai-history", get(get_ai_chat_history))
}
