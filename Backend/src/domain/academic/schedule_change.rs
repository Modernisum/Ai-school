use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Extension, Json,
};
use crate::middleware::rls::TenantContext;
use serde_json::json;
use sqlx::Row;

pub async fn request_change(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let pool = &state.db.pool;
    let change_type = payload["type"].as_str().unwrap_or("");
    let reason = payload["reason"].as_str().unwrap_or("");
    let date_from = payload["dateFrom"].as_str();
    let date_to = payload["dateTo"].as_str();
    let block_cap = payload["blockCapMinutes"].as_i64();

    match sqlx::query(
        "INSERT INTO schedule_change_requests (school_id, type, requested_by, status, \
         source_class_id, source_subject_id, target_class_id, target_subject_id, reason, date_from, date_to, block_cap_minutes) \
         VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10, $11)"
    )
    .bind(&school_id).bind(change_type).bind(&tenant_ctx.admin_id)
    .bind(payload["sourceClassId"].as_str())
    .bind(payload["sourceSubjectId"].as_str())
    .bind(payload["targetClassId"].as_str())
    .bind(payload["targetSubjectId"].as_str())
    .bind(reason).bind(date_from).bind(date_to)
    .bind(block_cap)
    .execute(pool).await
    {
        Ok(_) => Json(json!({"success": true, "message": "Change request submitted"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn list_pending(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let pool = &state.db.pool;
    match sqlx::query(
        "SELECT * FROM schedule_change_requests WHERE school_id = $1 AND status = 'pending' ORDER BY created_at DESC"
    )
    .bind(&school_id).fetch_all(pool).await
    {
        Ok(rows) => {
            let list: Vec<serde_json::Value> = rows.into_iter().map(|r| json!({
                "id": r.get::<i32, _>("id"),
                "type": r.get::<String, _>("type"),
                "requestedBy": r.get::<String, _>("requested_by"),
                "status": r.get::<String, _>("status"),
                "reason": r.get::<Option<String>, _>("reason"),
                "sourceClassId": r.get::<Option<String>, _>("source_class_id"),
                "targetClassId": r.get::<Option<String>, _>("target_class_id"),
                "dateFrom": r.get::<Option<String>, _>("date_from").map(|d| d.to_string()),
                "dateTo": r.get::<Option<String>, _>("date_to").map(|d| d.to_string()),
                "createdAt": r.get::<Option<String>, _>("updated_at").map(|d| d.to_string()),
            })).collect();
            Json(json!({"success": true, "data": list})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn approve_change(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, change_id)): Path<(String, i32)>,
) -> impl IntoResponse {
    let pool = &state.db.pool;
    match sqlx::query(
        "UPDATE schedule_change_requests SET status = 'approved', approved_by = $1, updated_at = NOW() WHERE school_id = $2 AND id = $3"
    )
    .bind(&tenant_ctx.admin_id).bind(&school_id).bind(change_id)
    .execute(pool).await
    {
        Ok(_) => Json(json!({"success": true})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn reject_change(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, change_id)): Path<(String, i32)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let pool = &state.db.pool;
    let note = payload["adminNote"].as_str().unwrap_or("");
    match sqlx::query(
        "UPDATE schedule_change_requests SET status = 'rejected', approved_by = $1, admin_note = $2, updated_at = NOW() WHERE school_id = $3 AND id = $4"
    )
    .bind(&tenant_ctx.admin_id).bind(note).bind(&school_id).bind(change_id)
    .execute(pool).await
    {
        Ok(_) => Json(json!({"success": true})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}
