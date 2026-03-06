use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;

pub async fn create_leave(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state.services.leave.create_leave(&school_id, payload).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn list_leaves(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.leave.get_leaves(&school_id).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn approve_leave(
    State(state): State<AppState>,
    Path((school_id, leave_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state.services.leave.update_leave_status(&school_id, &leave_id, "approved").await {
        Ok(_) => Json(json!({"success": true, "message": "Leave approved"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn reject_leave(
    State(state): State<AppState>,
    Path((school_id, leave_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state.services.leave.update_leave_status(&school_id, &leave_id, "rejected").await {
        Ok(_) => Json(json!({"success": true, "message": "Leave rejected"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn extend_leave(
    State(state): State<AppState>,
    Path((school_id, leave_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let days = payload["days"].as_i64().unwrap_or(0) as i32;
    match state.services.leave.update_leave_duration(&school_id, &leave_id, "extend", days).await {
        Ok(_) => Json(json!({"success": true, "message": "Leave duration extended"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn reduce_leave(
    State(state): State<AppState>,
    Path((school_id, leave_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let days = payload["days"].as_i64().unwrap_or(0) as i32;
    match state.services.leave.update_leave_duration(&school_id, &leave_id, "reduce", days).await {
        Ok(_) => Json(json!({"success": true, "message": "Leave duration reduced"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
