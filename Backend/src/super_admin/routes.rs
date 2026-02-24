use crate::super_admin::service::AdminService;
use crate::AppState;
use axum::{
    body::Body,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};

// ─── Helper: extract and verify admin token ───────────────────────────────────

fn extract_admin_token(headers: &HeaderMap) -> Option<String> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|s| s.to_string())
}

fn make_admin_service(state: &AppState) -> AdminService {
    AdminService {
        pool: state.db.pool.clone(),
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

// ─── Admin Login ──────────────────────────────────────────────────────────────

pub async fn admin_login(
    State(state): State<AppState>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let username = match payload["username"].as_str() {
        Some(u) => u.to_string(),
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"success":false,"message":"username required"})),
            )
                .into_response()
        }
    };
    let password = match payload["password"].as_str() {
        Some(p) => p.to_string(),
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"success":false,"message":"password required"})),
            )
                .into_response()
        }
    };

    let svc = make_admin_service(&state);
    match svc.admin_login(&username, &password).await {
        Ok(token) => Json(json!({
            "success": true,
            "accessToken": token,
            "message": "Super admin login successful"
        }))
        .into_response(),
        Err(e) => (
            StatusCode::UNAUTHORIZED,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

// ─── List All Schools ─────────────────────────────────────────────────────────

pub async fn list_all_schools(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.list_all_schools().await {
        Ok(data) => ok_json!(data),
        Err(e) => err_json!(e),
    }
}

// ─── Get Single School ────────────────────────────────────────────────────────

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

// ─── Update School ────────────────────────────────────────────────────────────

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

// ─── Delete School ────────────────────────────────────────────────────────────

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

// ─── Set School Status (block/activate/inactive) ─────────────────────────────

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

// ─── Change Password ──────────────────────────────────────────────────────────

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

// ─── Session Duration ─────────────────────────────────────────────────────────

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

// ─── Expire Sessions ──────────────────────────────────────────────────────────

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

// ─── Get Sessions ─────────────────────────────────────────────────────────────

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

// ─── Notifications ────────────────────────────────────────────────────────────

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

// ─── School notification endpoint (called by school frontend) ─────────────────

pub async fn get_school_notification(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let svc = make_admin_service(&state);
    match svc.get_notification(&school_id).await {
        Ok(data) => ok_json!(data),
        Err(e) => err_json!(e),
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

// ─── Export ───────────────────────────────────────────────────────────────────

pub async fn export_school(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.export_school_data(&school_id).await {
        Ok(data) => {
            let filename = format!("school_{}_backup.json", school_id);
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

// ─── Support Requests ─────────────────────────────────────────────────────────

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
        ).into_response();
    }

    match svc.create_support_request(school_name, contact_info, message).await {
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

// ─── Promo Codes ──────────────────────────────────────────────────────────────

pub async fn create_promo_code(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    
    let code = payload["code"].as_str().unwrap_or("");
    let credit_amount_str = payload["creditAmount"].as_str().unwrap_or("0");
    let free_days = payload["freeDays"].as_i64().unwrap_or(0) as i32;
    let max_uses = payload["maxUses"].as_i64().unwrap_or(1) as i32;

    if code.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"success":false,"message":"Promo code must not be empty"})),
        ).into_response();
    }

    let credit_amount = match credit_amount_str.parse::<bigdecimal::BigDecimal>() {
        Ok(amt) => amt,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"success":false,"message":"Invalid credit amount format"})),
            ).into_response();
        }
    };

    match svc.create_promo_code(code, credit_amount, free_days, max_uses).await {
        Ok(result) => ok_json!(result),
        Err(e) => err_json!(e),
    }
}

pub async fn list_promo_codes(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.list_promo_codes().await {
        Ok(data) => ok_json!(data),
        Err(e) => err_json!(e),
    }
}
