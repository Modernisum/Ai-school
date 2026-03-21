use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use crate::AppState;
use serde::Deserialize;
use serde_json::json;

#[derive(Deserialize)]
pub struct AuditQuery {
    pub module: Option<String>,
    pub limit: Option<i64>,
}

pub async fn list_student_history(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.recovery.list_student_history(&school_id).await {
        Ok(history) => Json(json!({ "success": true, "data": history })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}

pub async fn undo_student_change(
    State(state): State<AppState>,
    Path((school_id, id)): Path<(String, i32)>,
) -> impl IntoResponse {
    match state.services.recovery.undo_student_change(&school_id, id).await {
        Ok(_) => Json(json!({ "success": true, "message": "Change reverted successfully" })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}

pub async fn list_audit_logs(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    axum::extract::Query(query): axum::extract::Query<AuditQuery>,
) -> impl IntoResponse {
    let limit = query.limit.unwrap_or(100);
    match state.services.recovery.list_audit_logs(&school_id, query.module.as_deref(), limit).await {
        Ok(logs) => Json(json!({ "success": true, "data": logs })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}

pub async fn undo_audit_log(
    State(state): State<AppState>,
    Path((school_id, log_id)): Path<(String, i32)>,
) -> impl IntoResponse {
    match state.services.recovery.undo_audit_log(&school_id, log_id).await {
        Ok(_) => Json(json!({ "success": true, "message": "Audit log reversion submitted." })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}
