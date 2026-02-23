use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;

pub async fn mark_present(
    State(state): State<AppState>,
    Path((school_id, role, user_id)): Path<(String, String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state
        .services
        .operations
        .mark_attendance(&school_id, &role, &user_id, payload)
        .await
    {
        Ok(data) => {
            Json(json!({"success": true, "message": "Attendance marked present", "data": data})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn list_attendance(
    State(state): State<AppState>,
    Path((school_id, role, user_id)): Path<(String, String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .operations
        .list_attendance(&school_id, &role, &user_id)
        .await
    {
        Ok(list) => Json(json!({"success": true, "data": list})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
