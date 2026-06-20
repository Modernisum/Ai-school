use crate::AppState;
use crate::models::communication::CreateWebhookRequest;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;

/// POST /api/school/:schoolId/webhooks
pub async fn register_webhook(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<CreateWebhookRequest>,
) -> impl IntoResponse {
    match state
        .repos
        .config
        .register_webhook(
            &school_id,
            &payload.url,
            &payload.secret,
            &payload.event_types,
        )
        .await
    {
        Ok(id) => Json(json!({"success": true, "id": id})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// GET /api/school/:schoolId/webhooks
pub async fn list_webhooks(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.repos.config.list_webhooks(&school_id).await {
        Ok(endpoints) => Json(json!({"success": true, "webhooks": endpoints})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// DELETE /api/school/:schoolId/webhooks/:webhookId
pub async fn delete_webhook(
    State(state): State<AppState>,
    Path((school_id, webhook_id)): Path<(String, i32)>,
) -> impl IntoResponse {
    match state.repos.config.delete_webhook(&school_id, webhook_id).await {
        Ok(_) => Json(json!({"success": true, "message": "Webhook deleted"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// GET /api/school/:schoolId/webhooks/:webhookId/logs
pub async fn get_webhook_logs(
    State(state): State<AppState>,
    Path((school_id, webhook_id)): Path<(String, i32)>,
) -> impl IntoResponse {
    match state.repos.config.get_webhook_logs(&school_id, webhook_id).await {
        Ok(logs) => Json(json!({"success": true, "logs": logs})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
