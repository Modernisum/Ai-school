use crate::AppState;
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};
use crate::domain::admin::make_admin_service;

pub async fn create_support_request(
    State(state): State<AppState>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let svc = make_admin_service(&state);
    let school_name = payload["schoolName"]
        .as_str()
        .or_else(|| payload["schoolId"].as_str())
        .unwrap_or("");
    let contact_info = payload["contactInfo"]
        .as_str()
        .or_else(|| payload["subject"].as_str())
        .unwrap_or("");
    let message = payload["message"]
        .as_str()
        .or_else(|| payload["description"].as_str())
        .unwrap_or("");

    if school_name.is_empty() || message.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"success":false,"message":"schoolName (or schoolId) and message (or description) are required"})),
        )
            .into_response();
    }

    match svc
        .create_support_request(school_name, contact_info, message)
        .await
    {
        Ok(_) => ok_json!("Support request submitted"),
        Err(e) => err_json!(e),
    }
}


pub async fn list_support_requests(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.list_support_requests().await {
        Ok(data) => ok_json!(data),
        Err(e) => err_json!(e),
    }
}

pub async fn resolve_support_request(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.resolve_support_request(id).await {
        Ok(_) => ok_json!("Request marked as resolved"),
        Err(e) => err_json!(e),
    }
}
