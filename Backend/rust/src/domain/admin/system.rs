use crate::AppState;
use axum::{
    body::Body,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};
use crate::domain::admin::make_admin_service;

pub async fn manual_backup(headers: HeaderMap, State(state): State<AppState>) -> impl IntoResponse {
    let _ = require_admin!(headers, state);
    match state.backup.perform_backup().await {
        Ok(_) => ok_json!("Manual backup completed successfully"),
        Err(e) => err_json!(e),
    }
}

pub async fn get_config(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.get_system_config(&key).await {
        Ok(val) => ok_json!(val),
        Err(e) => err_json!(e),
    }
}

pub async fn update_config(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    let key = payload["key"].as_str().unwrap_or("");
    let value = payload["value"].as_str().unwrap_or("");
    
    if key.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"success": false, "message": "key is required"}))).into_response();
    }
    
    match svc.update_system_config(key, value).await {
        Ok(_) => ok_json!("Config updated"),
        Err(e) => err_json!(e),
    }
}

pub async fn send_global_notification(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    let notif = json!({
        "title": payload["title"].as_str().unwrap_or("Global Message"),
        "message": payload["message"].as_str().unwrap_or(""),
        "type": payload["type"].as_str().unwrap_or("info"),
        "sentAt": chrono::Utc::now().to_rfc3339(),
        "dismissible": true,
    });
    match svc.set_global_notification(notif).await {
        Ok(_) => ok_json!("Global update sent"),
        Err(e) => err_json!(e),
    }
}

pub async fn clear_global_notification(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.clear_global_notification().await {
        Ok(_) => ok_json!("Global notifications cleared"),
        Err(e) => err_json!(e),
    }
}

pub async fn get_global_notification(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let svc = make_admin_service(&state);
    match svc.get_global_notification().await {
        Ok(data) => ok_json!(data),
        Err(e) => err_json!(e),
    }
}

// ─── Export ───────────────────────────────────────────────────────────────────

pub async fn export_school(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.export_school_data_stream(&school_id).await {
        Ok(body) => {
            let filename = format!("school_{}_backup.json", school_id);
            axum::response::Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .header(
                    "Content-Disposition",
                    format!("attachment; filename=\"{}\"", filename),
                )
                .body(body)
                .unwrap()
        }
        Err(e) => err_json!(e),
    }
}

pub async fn export_all_schools(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.export_all_schools().await {
        Ok(data) => {
            let date = chrono::Utc::now().format("%Y%m%d").to_string();
            let filename = format!("all_schools_backup_{}.json", date);
            let body = serde_json::to_string_pretty(&data).unwrap_or_default();
            axum::response::Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .header(
                    "Content-Disposition",
                    format!("attachment; filename=\"{}\"", filename),
                )
                .body(Body::from(body))
                .unwrap()
        }
        Err(e) => err_json!(e),
    }
}

// ─── Import ───────────────────────────────────────────────────────────────────

pub async fn import_school(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.import_school_data(&school_id, payload).await {
        Ok(result) => ok_json!(result),
        Err(e) => err_json!(e),
    }
}
