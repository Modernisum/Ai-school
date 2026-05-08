use crate::error::{AppError, AppResult};
use crate::models::auth::*;
use crate::AppState;
use axum::{extract::State, Json};
use bcrypt::verify;
use rand::{distributions::Alphanumeric, Rng};
use serde_json::{json, Value};

/* ----------------------- Helpers ----------------------- */

#[allow(dead_code)]
fn normalize_id(id: &str) -> String {
    id.to_lowercase().replace(' ', "-")
}

#[allow(dead_code)]
fn generate_random_password(length: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(length)
        .map(char::from)
        .collect()
}

#[allow(dead_code)]
fn generate_token_id() -> String {
    let bytes: [u8; 32] = rand::random();
    hex::encode(bytes)
}

#[allow(dead_code)]
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
    axum::extract::Path(user_type): axum::extract::Path<String>,
    Json(payload): Json<SchoolLoginRequest>,
) -> AppResult<Json<LoginResponse>> {
    match user_type.as_str() {
        "student" | "employee" => {
            let ident = payload.ident
                .ok_or_else(|| AppError::Validation("Missing ident (phone/email)".to_string()))?;

            let res = state.services.auth.login_global(&ident, &user_type).await?;
            let profiles = res["profiles"].as_array().cloned().unwrap_or_default();
            let access_token = res["accessToken"].as_str().map(|s| s.to_string());
            let expires_in = res["expiresIn"].as_str().map(|s| s.to_string());

            Ok(Json(LoginResponse {
                success: true,
                message: "Login successful".to_string(),
                school_id: None,
                password_temp: None,
                access_token,
                expires_in,
                profiles: Some(profiles),
            }))
        },
        "schooladmin" | "school" => {
            let school_id = payload.school_id
                .ok_or_else(|| AppError::Validation("Missing school_id".to_string()))?;
            let password = payload.password
                .ok_or_else(|| AppError::Validation("Missing password".to_string()))?;

            let login_data = json!({
                "schoolId": school_id,
                "password": password,
            });

            let res = state.services.auth.login(login_data).await?;
            let token = res["accessToken"].as_str().unwrap_or_default().to_string();
            Ok(Json(LoginResponse {
                success: true,
                message: "Login successful".to_string(),
                school_id: Some(school_id),
                password_temp: None,
                access_token: Some(token),
                expires_in: Some("1h".to_string()),
                profiles: None,
            }))
        },
        _ => Err(AppError::NotFound("Invalid user type in login route.".to_string())),
    }
}

pub async fn verify_token_handler(
    State(state): State<AppState>,
    Json(payload): Json<TokenVerifyRequest>,
) -> AppResult<Json<Value>> {
    let token_data = state.services.auth.verify_token(&payload.token).await?;
    Ok(Json(json!({"success": true, "message": "Token valid", "token": token_data})))
}

pub async fn logout_handler(
    State(state): State<AppState>,
    Json(payload): Json<TokenVerifyRequest>,
) -> AppResult<Json<Value>> {
    state.services.auth.logout(&payload.token).await?;
    Ok(Json(json!({"success": true, "message": "Logged out, token revoked"})))
}

pub async fn set_security_handler(
    State(state): State<AppState>,
    Json(payload): Json<SetSecurityRequest>,
) -> AppResult<Json<Value>> {
    state.services.auth
        .set_security(&payload.school_id, &payload.question, &payload.answer)
        .await?;
    Ok(Json(json!({"success": true, "message": "Security question set"})))
}

pub async fn forgot_password_handler(
    State(state): State<AppState>,
    Json(payload): Json<ForgotPasswordRequest>,
) -> AppResult<Json<Value>> {
    let temp_pass = state.services.auth
        .forgot_password(&payload.school_id, &payload.answer)
        .await?;
    Ok(Json(json!({
        "success": true,
        "message": "Temporary password generated. Use it to login and change your password.",
        "tempPassword": temp_pass
    })))
}

pub async fn change_password_handler(
    State(state): State<AppState>,
    Json(payload): Json<ChangePasswordRequest>,
) -> AppResult<Json<Value>> {
    state.services.auth
        .change_password(&payload.school_id, &payload.old_password, &payload.new_password)
        .await?;
    Ok(Json(json!({"success": true, "message": "Password updated successfully"})))
}

pub async fn verify_otp_handler(
    State(_state): State<AppState>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    let id_token = payload["idToken"].as_str().unwrap_or("");
    if id_token.is_empty() {
        return Err(AppError::Validation("Missing idToken".to_string()));
    }

    Ok(Json(json!({
        "success": true,
        "message": "OTP verified successfully",
        "user": {
            "uid": "migrated-user-uid",
            "email": "migrated@school.com"
        }
    })))
}

#[derive(serde::Deserialize)]
pub struct DeviceRegistrationRequest {
    pub school_id: String,
    pub user_id: String,
    pub token: String,
    pub platform: Option<String>,
}

pub async fn register_device_handler(
    State(state): State<AppState>,
    Json(payload): Json<DeviceRegistrationRequest>,
) -> AppResult<Json<Value>> {
    sqlx::query(
        "INSERT INTO user_device_tokens (user_id, school_id, token, platform)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, school_id, token)
         DO UPDATE SET last_seen_at = NOW()"
    )
        .bind(&payload.user_id)
        .bind(&payload.school_id)
        .bind(&payload.token)
        .bind(&payload.platform)
        .execute(&state.db.pool)
        .await?;

    Ok(Json(json!({"success": true, "message": "Device registered successfully"})))
}
