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
    verify(candidate, stored).unwrap_or(false)
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
                school_name: None,
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

            let school_name = sqlx::query_scalar::<_, String>("SELECT school_name FROM schools WHERE school_id = $1")
                .bind(&school_id)
                .fetch_optional(&state.db.pool)
                .await?
                .unwrap_or_else(|| "School Admin".to_string());

            Ok(Json(LoginResponse {
                success: true,
                message: "Login successful".to_string(),
                school_id: Some(school_id),
                school_name: Some(school_name),
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
    headers: axum::http::HeaderMap,
    body: axum::body::Bytes,
) -> AppResult<Json<Value>> {
    let token = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .map(|s| s.to_string())
        .or_else(|| {
            serde_json::from_slice::<TokenVerifyRequest>(&body)
                .map(|p| p.token)
                .ok()
        })
        .ok_or_else(|| AppError::Validation("Missing token".to_string()))?;

    let token_data = state.services.auth.verify_token(&token).await?;
    Ok(Json(json!({"success": true, "message": "Token valid", "token": token_data})))
}

pub async fn logout_handler(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    body: axum::body::Bytes,
) -> AppResult<Json<Value>> {
    let token = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .map(|s| s.to_string())
        .or_else(|| {
            serde_json::from_slice::<TokenVerifyRequest>(&body)
                .map(|p| p.token)
                .ok()
        })
        .ok_or_else(|| AppError::Validation("Missing token".to_string()))?;

    state.services.auth.logout(&token).await?;
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
    State(state): State<AppState>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    let id_token = payload["idToken"]
        .as_str()
        .or_else(|| payload["otp"].as_str()) // Allow fallback to otp field if sent directly as token representation
        .unwrap_or("");
    if id_token.is_empty() {
        return Err(AppError::Validation("Missing idToken".to_string()));
    }

    // Validate against stored tokens or JWT
    let token_data = state.services.auth.verify_token(id_token).await?;
    Ok(Json(json!({
        "success": true,
        "message": "OTP verified successfully",
        "user": {
            "uid": token_data["sub"].as_str().unwrap_or("unknown"),
            "email": token_data["sub"].as_str().unwrap_or("unknown")
        }
    })))
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceRegistrationRequest {
    #[serde(alias = "school_id")]
    pub school_id: Option<String>,
    #[serde(alias = "user_id")]
    pub user_id: Option<String>,
    #[serde(alias = "fcm_token")]
    pub token: Option<String>,
    #[serde(alias = "device_type")]
    pub platform: Option<String>,
    #[serde(alias = "device_id")]
    pub device_id: Option<String>,
}

pub async fn register_device_handler(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<DeviceRegistrationRequest>,
) -> AppResult<Json<Value>> {
    let token = payload.token
        .or(payload.device_id)
        .ok_or_else(|| AppError::Validation("Missing device token (token or device_id)".to_string()))?;

    let platform = payload.platform;

    let mut school_id = payload.school_id;
    let mut user_id = payload.user_id;

    if school_id.is_none() || user_id.is_none() {
        let auth_header = headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|h| h.to_str().ok())
            .and_then(|h| h.strip_prefix("Bearer "))
            .ok_or_else(|| AppError::Validation("Missing authorization token to resolve user identity".to_string()))?;

        let token_data = state.services.auth.verify_token(auth_header).await?;
        if let Some(sid) = token_data["schoolId"].as_str() {
            if school_id.is_none() {
                school_id = Some(sid.to_string());
            }
            if user_id.is_none() {
                user_id = Some("admin".to_string());
            }
        } else {
            let role = token_data["role"].as_str().unwrap_or("student");
            let ident = token_data["sub"].as_str().unwrap_or("");
            if !ident.is_empty() {
                let matches = state.repos.global_user.find_by_identifier(ident).await?;
                let matched_user = matches.into_iter().find(|m| m["userType"] == role);
                if let Some(user) = matched_user {
                    if school_id.is_none() {
                        school_id = user["schoolId"].as_str().map(|s| s.to_string());
                    }
                    if user_id.is_none() {
                        user_id = user["userId"].as_str().map(|s| s.to_string());
                    }
                }
            }
        }
    }

    let final_school_id = school_id.ok_or_else(|| AppError::Validation("Could not resolve schoolId".to_string()))?;
    let final_user_id = user_id.ok_or_else(|| AppError::Validation("Could not resolve userId".to_string()))?;

    sqlx::query(
        "INSERT INTO user_device_tokens (user_id, school_id, token, platform)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, school_id, token)
         DO UPDATE SET last_seen_at = NOW()"
    )
        .bind(&final_user_id)
        .bind(&final_school_id)
        .bind(&token)
        .bind(&platform)
        .execute(&state.db.pool)
        .await?;

    Ok(Json(json!({"success": true, "message": "Device registered successfully"})))
}

pub async fn select_profile_handler(
    State(state): State<AppState>,
    axum::extract::Path(school_id): axum::extract::Path<String>,
    Json(payload): Json<SelectProfileRequest>,
) -> AppResult<Json<Value>> {
    if payload.ident.trim().is_empty() || payload.user_id.trim().is_empty() || payload.user_type.trim().is_empty() {
        return Err(AppError::Validation("ident, user_id, and user_type cannot be empty".to_string()));
    }

    let max_hours = sqlx::query_scalar::<_, i32>("SELECT session_duration_hours FROM schools WHERE school_id = $1")
        .bind(&school_id)
        .fetch_optional(&state.db.pool)
        .await?
        .unwrap_or(720); // Default to 30 days (720 hours)

    let secret = std::env::var("JWT_SECRET")
        .expect("JWT_SECRET environment variable must be set");
    let expiration = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::hours(max_hours as i64))
        .expect("valid timestamp")
        .timestamp();

    #[derive(serde::Serialize, serde::Deserialize)]
    struct JWTClaims {
        sub: String,
        role: String,
        exp: usize,
    }

    let claims = JWTClaims {
        sub: payload.ident.clone(),
        role: payload.user_type.clone(),
        exp: expiration as usize,
    };

    let token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &claims,
        &jsonwebtoken::EncodingKey::from_secret(secret.as_ref()),
    )
    .map_err(|e| AppError::Internal(format!("JWT Error: {}", e)))?;

    sqlx::query(
        "INSERT INTO user_activity_logs (phone, user_type, action, metadata) VALUES ($1, $2, 'select-profile', $3)",
    )
    .bind(&payload.ident)
    .bind(&payload.user_type)
    .bind(json!({ "app": payload.user_type, "schoolId": school_id, "userId": payload.user_id, "timestamp": chrono::Utc::now() }))
    .execute(&state.db.pool)
    .await?;

    Ok(Json(json!({
        "success": true,
        "token": token
    })))
}

