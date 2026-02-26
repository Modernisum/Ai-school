use axum::{
    extract::{Path, State},
    routing::post,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use jsonwebtoken::{encode, Header, EncodingKey};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::AppState;

#[derive(Deserialize)]
pub struct MobileLoginRequest {
    pub ident: String, // Phone number for teachers, Student ID for students
    pub role: String,  // "teacher" or "student"
}

#[derive(Deserialize)]
pub struct MobileVerifyRequest {
    pub ident: String,
    pub role: String,
    pub otp: String,
}

#[derive(Serialize)]
pub struct MobileAuthResponse {
    pub token: String,
    pub user: Value,
}

// ─── Token Generation (Long-lived for WhatsApp-style session) ───────
fn create_long_lived_token(ident: &str, role: &str, school_id: &str) -> String {
    let expiration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() + (10 * 365 * 24 * 60 * 60); // 10 years

    let claims = json!({
        "sub": ident,
        "role": role,
        "schoolId": school_id,
        "exp": expiration
    });

    // In a real app, use the actual JWT secret. Using a dummy one here for the mock.
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "super_secret_key_12345".to_string());
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    ).unwrap_or_else(|_| "failed_to_generate_token".to_string())
}

// ─── LOGIN (Request OTP) ────────────────────────────────────────────────
pub async fn mobile_login(
    Path(school_id): Path<String>,
    State(state): State<AppState>,
    Json(payload): Json<MobileLoginRequest>,
) -> Result<Json<Value>, axum::http::StatusCode> {
    
    // In a real scenario, we'd check if the ident exists in the DB for this school_id.
    // For now, we just pretend we sent an OTP "1234".
    
    // NOTE: A real implementation would query:
    // For role="teacher": SELECT * FROM employees WHERE phone = payload.ident OR alt_phone = payload.ident
    // For role="student": SELECT * FROM students WHERE student_id = payload.ident
    
    Ok(Json(json!({
        "success": true,
        "message": "OTP sent successfully. (Use 1234 for testing)",
        "role": payload.role
    })))
}

// ─── VERIFY OTP (Login Success) ─────────────────────────────────────────
pub async fn mobile_verify(
    Path(school_id): Path<String>,
    State(state): State<AppState>,
    Json(payload): Json<MobileVerifyRequest>,
) -> Result<Json<Value>, axum::http::StatusCode> {
    
    if payload.otp != "1234" {
        return Ok(Json(json!({
            "success": false,
            "message": "Invalid OTP"
        })));
    }

    // Generate WhatsApp-style 10-year token
    let token = create_long_lived_token(&payload.ident, &payload.role, &school_id);

    // Mock User Data Return (In real app, fetch from DB)
    let user_data = json!({
        "ident": payload.ident,
        "role": payload.role,
        "schoolId": school_id,
        "name": if payload.role == "teacher" { "Teacher Demo" } else { "Student Demo" }
    });

    Ok(Json(json!({
        "success": true,
        "token": token,
        "user": user_data
    })))
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/:school_id/mobile/login", post(mobile_login))
        .route("/:school_id/mobile/verify", post(mobile_verify))
}
