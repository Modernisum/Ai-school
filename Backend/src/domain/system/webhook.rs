use crate::AppState;
use crate::models::system::CreateWebhookRequest;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use sqlx::Row;


/// POST /api/school/:schoolId/webhooks
pub async fn register_webhook(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<CreateWebhookRequest>,
) -> impl IntoResponse {
    match sqlx::query(
        "INSERT INTO webhook_endpoints (school_id, url, secret, event_types, status)
         VALUES ($1, $2, $3, $4, 'active') RETURNING id",
    )
    .bind(&school_id)
    .bind(&payload.url)
    .bind(&payload.secret)
    .bind(&payload.event_types)
    .fetch_one(&state.db.pool)
    .await
    {
        Ok(row) => {
            let id: i32 = row.get(0);
            Json(json!({"success": true, "id": id})).into_response()
        }
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
    match sqlx::query(
        "SELECT id, url, event_types, status, created_at FROM webhook_endpoints WHERE school_id = $1"
    )
    .bind(&school_id)
    .fetch_all(&state.db.pool)
    .await {
        Ok(rows) => {
            let endpoints: Vec<_> = rows.iter().map(|r| {
                json!({
                    "id": r.get::<i32, _>("id"),
                    "url": r.get::<String, _>("url"),
                    "event_types": r.get::<Vec<String>, _>("event_types"),
                    "status": r.get::<String, _>("status"),
                    "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                })
            }).collect();
            Json(json!({"success": true, "webhooks": endpoints})).into_response()
        },
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// DELETE /api/school/:schoolId/webhooks/:webhookId
pub async fn delete_webhook(
    State(state): State<AppState>,
    Path((school_id, webhook_id)): Path<(String, i32)>,
) -> impl IntoResponse {
    match sqlx::query("DELETE FROM webhook_endpoints WHERE school_id = $1 AND id = $2")
        .bind(&school_id)
        .bind(webhook_id)
        .execute(&state.db.pool)
        .await
    {
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
    match sqlx::query(
        "SELECT id, event_type, status_code, attempt_count, last_attempt_at, status 
         FROM webhook_delivery_logs 
         WHERE school_id = $1 AND endpoint_id = $2 
         ORDER BY created_at DESC LIMIT 50",
    )
    .bind(&school_id)
    .bind(webhook_id)
    .fetch_all(&state.db.pool)
    .await
    {
        Ok(rows) => {
            let logs: Vec<_> = rows.iter().map(|r| {
                json!({
                    "id": r.get::<i32, _>("id"),
                    "event_type": r.get::<String, _>("event_type"),
                    "status_code": r.get::<Option<i32>, _>("status_code"),
                    "attempt_count": r.get::<i32, _>("attempt_count"),
                    "last_attempt_at": r.get::<chrono::DateTime<chrono::Utc>, _>("last_attempt_at").to_rfc3339(),
                    "status": r.get::<String, _>("status"),
                })
            }).collect();
            Json(json!({"success": true, "logs": logs})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
