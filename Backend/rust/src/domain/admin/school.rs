use crate::AppState;
use axum::{
    extract::{Path, State, Query},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};
use std::collections::HashMap;
use crate::domain::admin::{extract_admin_token, make_admin_service};

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

pub async fn send_notification(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    let notif = json!({
        "title": payload["title"].as_str().unwrap_or("Message from Admin"),
        "message": payload["message"].as_str().unwrap_or(""),
        "type": payload["type"].as_str().unwrap_or("info"),  // info|warning|error
        "sentAt": chrono::Utc::now().to_rfc3339(),
        "dismissible": true,
    });
    match svc.set_notification(&school_id, notif).await {
        Ok(_) => ok_json!("Notification sent"),
        Err(e) => err_json!(e),
    }
}

pub async fn clear_notification(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.clear_notification(&school_id).await {
        Ok(_) => ok_json!("Notification cleared"),
        Err(e) => err_json!(e),
    }
}

pub async fn get_school_notification(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let svc = make_admin_service(&state);
    match svc.get_notification(&school_id).await {
        Ok(data) => ok_json!(data),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("not found") {
                not_found_json!(msg)
            } else {
                err_json!(e)
            }
        }
    }
}

pub async fn clear_school_notification(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let svc = make_admin_service(&state);
    match svc.clear_notification(&school_id).await {
        Ok(_) => ok_json!("Notification cleared"),
        Err(e) => err_json!(e),
    }
}
