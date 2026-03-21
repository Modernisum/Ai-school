use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
    http::StatusCode,
};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::AppState;

#[derive(Deserialize)]
pub struct MobileLoginRequest {
    #[allow(dead_code)]
    pub ident: String, // Phone number for teachers, Student ID for students
    pub role: String, // "teacher" or "student"
}

#[derive(Deserialize)]
pub struct MobileVerifyRequest {
    pub ident: String,
    pub role: String, // Deprecated usage, we search both
    pub otp: String,
}

#[derive(Serialize)]
pub struct MobileProfile {
    pub id: String,
    pub name: String,
    pub class_name: String,
    pub user_type: String,
    pub image_url: String,
}

#[derive(Deserialize)]
pub struct MobileSelectProfileRequest {
    pub user_id: String,
    pub user_type: String,
    pub ident: String,
}

#[allow(dead_code)]
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
        .as_secs()
        + (7 * 24 * 60 * 60); // 7 days

    let claims = json!({
        "sub": ident,
        "role": role,
        "schoolId": school_id,
        "exp": expiration
    });

    let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set in .env");
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .unwrap_or_else(|_| "failed_to_generate_token".to_string())
}

// ─── LOGIN (Request OTP) ────────────────────────────────────────────────
pub async fn mobile_login(
    Path(_school_id): Path<String>,
    State(_state): State<AppState>,
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

// ─── VERIFY OTP (Return Matched Profiles) ───────────────────────────────
pub async fn mobile_verify(
    Path(school_id): Path<String>,
    State(state): State<AppState>,
    Json(payload): Json<MobileVerifyRequest>,
) -> Result<Json<Value>, axum::http::StatusCode> {
    if payload.otp != "1234" && payload.otp != "123456" {
        return Ok(Json(json!({
            "success": false,
            "message": "Invalid OTP"
        })));
    }

    let mut profiles = Vec::new();

    // 1. Check Students by contact or alt_contact
    let student_rows = sqlx::query(
        r#"
        SELECT student_id, name, class_name 
        FROM students 
        WHERE school_id = $1 AND (contact = $2 OR alternative_contact = $2)
        "#
    )
    .bind(&school_id)
    .bind(&payload.ident)
    .fetch_all(&state.repos.db_client.pool)
    .await
    .unwrap_or_default();

    for row in student_rows {
        let id: String = sqlx::Row::try_get(&row, "student_id").unwrap_or_else(|_| "".to_string());
        let name: Option<String> = sqlx::Row::try_get(&row, "name").unwrap_or(Some("Unknown Student".to_string()));
        let class_name: String = sqlx::Row::try_get(&row, "class_name").unwrap_or_else(|_| "".to_string());
        
        profiles.push(MobileProfile {
            id,
            name: name.unwrap_or_else(|| "Unknown Student".to_string()),
            class_name,
            user_type: "student".to_string(),
            image_url: "".to_string(),
        });
    }

    // 2. Check Employees by contact in column or JSON
    let employee_rows = sqlx::query(
        r#"
        SELECT employee_id, data->>'name' as name, employee_type 
        FROM employees 
        WHERE school_id = $1 AND (contact = $2 OR data->>'contact' = $2)
        "#
    )
    .bind(&school_id)
    .bind(&payload.ident)
    .fetch_all(&state.repos.db_client.pool)
    .await
    .unwrap_or_default();

    for row in employee_rows {
        let id: String = sqlx::Row::try_get(&row, "employee_id").unwrap_or_else(|_| "".to_string());
        let name: Option<String> = sqlx::Row::try_get(&row, "name").unwrap_or(Some("Unknown Employee".to_string()));
        let employee_type: String = sqlx::Row::try_get(&row, "employee_type").unwrap_or_else(|_| "".to_string());
        
        profiles.push(MobileProfile {
            id,
            name: name.unwrap_or_else(|| "Unknown Employee".to_string()),
            class_name: employee_type,
            user_type: "employee".to_string(),
            image_url: "".to_string(),
        });
    }

    Ok(Json(json!({
        "success": true,
        "profiles": profiles
    })))
}

// ─── SELECT PROFILE (Issue Token) ───────────────────────────────────────
pub async fn mobile_select_profile(
    Path(school_id): Path<String>,
    State(state): State<AppState>,
    Json(payload): Json<MobileSelectProfileRequest>,
) -> Result<Json<Value>, axum::http::StatusCode> {
    // Generate WhatsApp-style 10-year token
    let token = create_long_lived_token(&payload.ident, &payload.user_type, &school_id);

    // Fetch the robust display name
    let mut name = if payload.user_type == "student" {
        "Student Demo".to_string()
    } else {
        "Teacher Demo".to_string()
    };

    if payload.user_type == "student" {
        if let Ok(row) = sqlx::query("SELECT name FROM students WHERE student_id = $1 AND school_id = $2")
            .bind(&payload.user_id)
            .bind(&school_id)
            .fetch_one(&state.repos.db_client.pool)
            .await 
        {
            if let Some(n) = sqlx::Row::try_get::<Option<String>, _>(&row, "name").unwrap_or(None) {
                name = n;
            }
        }
    } else {
        if let Ok(row) = sqlx::query("SELECT data->>'name' as name FROM employees WHERE employee_id = $1 AND school_id = $2")
            .bind(&payload.user_id)
            .bind(&school_id)
            .fetch_one(&state.repos.db_client.pool)
            .await 
        {
            if let Some(n) = sqlx::Row::try_get::<Option<String>, _>(&row, "name").unwrap_or(None) {
                name = n;
            }
        }
    }

    let user_data = json!({
        "ident": payload.ident,
        "role": payload.user_type,
        "schoolId": school_id,
        "id": payload.user_id,
        "name": name
    });

    Ok(Json(json!({
        "success": true,
        "token": token,
        "user": user_data
    })))
}

// ─── FEES (Fetch Student Fees) ──────────────────────────────────────────
pub async fn get_student_fee_mobile(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
) -> Result<Json<Value>, StatusCode> {
    match state.services.operations.get_student_fee(&school_id, &student_id).await {
        Ok(data) => Ok(Json(json!({"success": true, "data": data}))),
        Err(e) => {
            eprintln!("Error fetching mobile fees: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// ─── PAYMENT (Create Razorpay Order) ────────────────────────────────────
#[derive(Deserialize)]
pub struct MobileOrderRequest {
    pub amount: f64,
    pub student_id: String,
    pub fee_id: String,
    pub fee_type: String, // "regular" or "custom"
}

pub async fn create_mobile_order(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<MobileOrderRequest>,
) -> Result<Json<Value>, StatusCode> {
    let key_id = std::env::var("RAZORPAY_KEY_ID").unwrap_or_default();
    let key_secret = std::env::var("RAZORPAY_KEY_SECRET").unwrap_or_default();

    if key_id.is_empty() {
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    let amount_paise = (payload.amount * 100.0) as u64;
    let client = reqwest::Client::new();
    let res = client
        .post("https://api.razorpay.com/v1/orders")
        .basic_auth(&key_id, Some(&key_secret))
        .json(&json!({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": payload.fee_id,
        }))
        .send()
        .await;

    match res {
        Ok(response) => {
            if response.status().is_success() {
                if let Ok(order_data) = response.json::<Value>().await {
                    let order_id = order_data["id"].as_str().unwrap_or("").to_string();

                    // Save to db
                    match state
                        .repos
                        .operations
                        .create_online_transaction(
                            &school_id,
                            &payload.student_id,
                            &payload.fee_type,
                            &payload.fee_id,
                            payload.amount,
                            "INR",
                            &order_id,
                        )
                        .await
                    {
                        Ok(_) => Ok(Json(json!({
                            "success": true,
                            "orderId": order_id,
                            "amount": payload.amount,
                            "key": key_id
                        }))),
                        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
                    }
                } else {
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            } else {
                Err(StatusCode::BAD_REQUEST)
            }
        }
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/:school_id/mobile/login", post(mobile_login))
        .route("/:school_id/mobile/verify", post(mobile_verify))
        .route("/:school_id/mobile/select-profile", post(mobile_select_profile))
        .route("/:school_id/mobile/fees/:student_id", get(get_student_fee_mobile))
        .route("/:school_id/mobile/order", post(create_mobile_order))
}
