use crate::super_admin::service::AdminService;
use crate::AppState;
use axum::{
    extract::{Path, State, Query},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};
use std::collections::HashMap;

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

// ─── School Routes ─────────────────────────────────────────────────────

pub async fn list_all_schools(
    headers: HeaderMap,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    let simple = params.get("simple").map(|v| v == "true").unwrap_or(false);

    match svc.list_all_schools().await {
        Ok(data) => {
            if simple {
                if let Some(list) = data.as_array() {
                    let simple_list: Vec<Value> = list
                        .iter()
                        .map(|s| {
                            json!({
                                "schoolId": s["schoolId"],
                                "schoolName": s["schoolName"]
                            })
                        })
                        .collect();
                    return ok_json!(simple_list).into_response();
                }
            }
            ok_json!(data).into_response()
        }
        Err(e) => err_json!(e).into_response(),
    }
}

pub async fn get_school(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.get_school_full(&school_id).await {
        Ok(data) => ok_json!(data),
        Err(e) => err_json!(e),
    }
}

pub async fn update_school(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.update_school(&school_id, payload).await {
        Ok(_) => ok_json!("School updated"),
        Err(e) => err_json!(e),
    }
}

pub async fn delete_school(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.delete_school(&school_id).await {
        Ok(_) => ok_json!("School and all related data deleted"),
        Err(e) => err_json!(e),
    }
}

pub async fn set_school_status(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    let status = match payload["status"].as_str() {
        Some(s) if ["active", "blocked", "inactive"].contains(&s) => s.to_string(),
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"success":false,"message":"status must be active|blocked|inactive"})),
            )
                .into_response()
        }
    };
    match svc.set_school_status(&school_id, &status).await {
        Ok(_) => ok_json!(format!("School status set to {}", status)),
        Err(e) => err_json!(e),
    }
}

pub async fn change_school_password(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    let new_password = match payload["newPassword"].as_str() {
        Some(p) => p.to_string(),
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"success":false,"message":"newPassword required"})),
            )
                .into_response()
        }
    };
    match svc.change_school_password(&school_id, &new_password).await {
        Ok(_) => ok_json!("Password updated"),
        Err(e) => err_json!(e),
    }
}

pub async fn set_session_duration(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    let hours = match payload["hours"].as_i64() {
        Some(h) if h > 0 && h <= 8760 => h as i32,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"success":false,"message":"hours must be 1–8760"})),
            )
                .into_response()
        }
    };
    match svc.set_session_duration(&school_id, hours).await {
        Ok(_) => ok_json!(format!("Session duration set to {} hours", hours)),
        Err(e) => err_json!(e),
    }
}

pub async fn expire_school_sessions(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.expire_school_sessions(&school_id).await {
        Ok(n) => ok_json!(format!("{} sessions expired", n)),
        Err(e) => err_json!(e),
    }
}

pub async fn get_school_sessions(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.get_school_sessions(&school_id).await {
        Ok(data) => ok_json!(data),
        Err(e) => err_json!(e),
    }
}
