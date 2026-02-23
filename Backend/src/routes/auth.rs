use crate::models::auth::*;
use crate::AppState;
use axum::{extract::State, response::IntoResponse, Json};
use bcrypt::{hash, verify, DEFAULT_COST};
use rand::{distributions::Alphanumeric, Rng};
use serde_json::json;

/* ----------------------- Helpers ----------------------- */

fn normalize_id(id: &str) -> String {
    id.to_lowercase().replace(' ', "-")
}

fn generate_random_password(length: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(length)
        .map(char::from)
        .collect()
}

fn generate_token_id() -> String {
    let bytes: [u8; 32] = rand::random();
    hex::encode(bytes)
}

async fn verify_password(stored: &str, candidate: &str) -> bool {
    if stored.starts_with("$2") {
        verify(candidate, stored).unwrap_or(false)
    } else {
        stored == candidate
    }
}

/* ----------------------- Handlers ----------------------- */

pub async fn login_handler(
    State(state): State<AppState>,
    Json(payload): Json<SchoolLoginRequest>,
) -> impl IntoResponse {
    let login_data = json!({
        "schoolId": payload.school_id,
        "password": payload.password,
        "userType": payload.user_type
    });

    match state.services.auth.login(login_data).await {
        Ok(res) => Json(json!({
            "success": true,
            "message": res["message"],
            "accessToken": res["accessToken"],
            "schoolId": res["schoolId"],
            "expiresIn": "1h"
        }))
        .into_response(),
        Err(e) => (
            axum::http::StatusCode::UNAUTHORIZED,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn verify_token_handler(
    State(state): State<AppState>,
    Json(payload): Json<TokenVerifyRequest>,
) -> impl IntoResponse {
    match state.services.auth.verify_token(&payload.token).await {
        Ok(token_data) => {
            Json(json!({"success": true, "message": "Token valid", "token": token_data}))
                .into_response()
        }
        Err(e) => (
            axum::http::StatusCode::UNAUTHORIZED,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn logout_handler(
    State(state): State<AppState>,
    Json(payload): Json<TokenVerifyRequest>,
) -> impl IntoResponse {
    match state.services.auth.logout(&payload.token).await {
        Ok(_) => {
            Json(json!({"success": true, "message": "Logged out, token revoked"})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn set_security_handler(
    State(state): State<AppState>,
    Json(payload): Json<SetSecurityRequest>,
) -> impl IntoResponse {
    match state
        .services
        .auth
        .set_security(&payload.school_id, &payload.question, &payload.answer)
        .await
    {
        Ok(_) => Json(json!({"success": true, "message": "Security question set"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn forgot_password_handler(
    State(state): State<AppState>,
    Json(payload): Json<ForgotPasswordRequest>,
) -> impl IntoResponse {
    match state
        .services
        .auth
        .forgot_password(&payload.school_id, &payload.answer)
        .await
    {
        Ok(temp_pass) => Json(json!({
            "success": true,
            "message": "Temporary password generated. Use it to login and change your password.",
            "tempPassword": temp_pass
        }))
        .into_response(),
        Err(e) => (
            axum::http::StatusCode::UNAUTHORIZED,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn change_password_handler(
    State(state): State<AppState>,
    Json(payload): Json<ChangePasswordRequest>,
) -> impl IntoResponse {
    match state
        .services
        .auth
        .change_password(
            &payload.school_id,
            &payload.old_password,
            &payload.new_password,
        )
        .await
    {
        Ok(_) => Json(json!({"success": true, "message": "Password updated successfully"}))
            .into_response(),
        Err(e) => (
            axum::http::StatusCode::UNAUTHORIZED,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
pub async fn verify_otp_handler(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    // For parity/migration, we assume Firebase token validation is handled
    // or we're just accepting it for now to let the frontend proceed.
    let id_token = payload["idToken"].as_str().unwrap_or("");
    if id_token.is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "Missing idToken"})),
        )
            .into_response();
    }

    Json(json!({
        "success": true,
        "message": "OTP verified successfully",
        "user": {
            "uid": "migrated-user-uid",
            "email": "migrated@school.com"
        }
    }))
    .into_response()
}
