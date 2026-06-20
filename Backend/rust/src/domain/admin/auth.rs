use crate::AppState;
use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};
use crate::domain::admin::{extract_admin_token, make_admin_service};

pub async fn get_admin_profile(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    let username = match extract_admin_token(&headers) {
        Some(token) => {
             use base64::{engine::general_purpose, Engine as _};
             let decoded = general_purpose::STANDARD.decode(token).unwrap_or_default();
             let s = String::from_utf8(decoded).unwrap_or_default();
             s.split(':').next().unwrap_or("").to_string()
        }
        None => "".to_string(),
    };
    
    match svc.get_admin_profile(&username).await {
        Ok(data) => ok_json!(data),
        Err(e) => err_json!(e),
    }
}

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

pub async fn update_admin_credentials(
    State(state): State<AppState>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let current_username = payload["currentUsername"].as_str().unwrap_or("");
    let current_password = payload["currentPassword"].as_str().unwrap_or("");
    let new_username = payload["newUsername"].as_str().unwrap_or("");
    let new_password = payload["newPassword"].as_str().unwrap_or("");

    if new_username.is_empty() || new_password.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"success":false,"message":"newUsername and newPassword are required"})),
        )
            .into_response();
    }

    let svc = make_admin_service(&state);
    match svc
        .update_admin_credentials(
            current_username,
            current_password,
            new_username,
            new_password,
            payload["profileImageUrl"].as_str().map(|s| s.to_string()),
        )
        .await
    {
        Ok(_) => ok_json!("Super admin credentials updated successfully"),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
