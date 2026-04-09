use crate::super_admin::service::AdminService;
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};

// ─── Helper: extract and verify admin token ───────────────────────────

fn extract_admin_token(headers: &HeaderMap) -> Option<String> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|s| s.to_string())
}

fn make_admin_service(state: &AppState) -> AdminService {
    AdminService {
        db: state.db.clone(),
    }
}

macro_rules! require_admin {
    ($headers:expr, $state:expr) => {{
        let svc = make_admin_service(&$state);
        match extract_admin_token(&$headers) {
            None => {
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({"success":false,"message":"Missing admin token"})),
                )
                    .into_response()
            }
            Some(token) => {
                if let Err(e) = svc.verify_admin_token(&token) {
                    return (
                        StatusCode::UNAUTHORIZED,
                        Json(json!({"success":false,"message":e.to_string()})),
                    )
                        .into_response();
                }
                svc
            }
        }
    }};
}

macro_rules! ok_json {
    ($val:expr) => {
        Json(json!({"success": true, "data": $val})).into_response()
    };
}

macro_rules! err_json {
    ($e:expr) => {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": $e.to_string()})),
        )
            .into_response()
    };
}

// ─── Support Routes ─────────────────────────────────────────────────

pub async fn create_support_request(
    State(state): State<AppState>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let svc = make_admin_service(&state);
    let school_name = payload["schoolName"].as_str().unwrap_or("");
    let contact_info = payload["contactInfo"].as_str().unwrap_or("");
    let message = payload["message"].as_str().unwrap_or("");
    
    if school_name.is_empty() || message.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"success":false,"message":"schoolName and message are required"})),
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
