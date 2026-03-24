use axum::{
    extract::{Path, State, Query},
    response::IntoResponse,
    Json,
};
use crate::AppState;

use serde::Deserialize;
use serde_json::json;
use crate::error::AppResult;

#[derive(Deserialize)]
pub struct AuditQuery {
    #[allow(dead_code)]
    pub module: Option<String>,
    #[allow(dead_code)]
    pub limit: Option<i64>,
}

pub async fn list_student_history(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let history = state.services.recovery.list_student_history(&school_id).await?;
    Ok(Json(json!({ "success": true, "data": history })))
}

pub async fn undo_student_change(
    State(state): State<AppState>,
    Path((school_id, id)): Path<(String, i32)>,
) -> AppResult<impl IntoResponse> {
    state.services.recovery.undo_student_change(&school_id, id).await?;
    Ok(Json(json!({ "success": true, "message": "Change reverted successfully" })))
}

pub async fn list_audit_logs(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(_query): Query<AuditQuery>,
) -> AppResult<impl IntoResponse> {
    // Note: The service currently has a hardcoded limit of 100 in its trait implementation
    // We can expand the trait later if more granular control is needed.
    let logs = state.services.recovery.list_audit_logs(&school_id).await?;
    Ok(Json(json!({ "success": true, "data": logs })))
}

pub async fn undo_audit_log(
    State(state): State<AppState>,
    Path((school_id, log_id)): Path<(String, i32)>,
) -> AppResult<impl IntoResponse> {
    state.services.recovery.undo_audit_log(&school_id, log_id).await?;
    Ok(Json(json!({ "success": true, "message": "Audit log reversion submitted." })))
}
