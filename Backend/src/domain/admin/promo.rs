use crate::AppState;
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};
use std::str::FromStr;
use crate::domain::admin::make_admin_service;

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
    let discount_percentage_str = payload["discountPercentage"].as_str().unwrap_or("0");
    let expires_at_str = payload["expiresAt"].as_str();

    if code.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"success":false,"message":"Promo code must not be empty"})),
        )
            .into_response();
    }

    let credit_amount = match credit_amount_str.parse::<bigdecimal::BigDecimal>() {
        Ok(amt) => amt,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"success":false,"message":"Invalid credit amount format"})),
            )
                .into_response();
        }
    };

    let discount_percentage = match discount_percentage_str.parse::<bigdecimal::BigDecimal>() {
        Ok(amt) => amt,
        Err(_) => bigdecimal::BigDecimal::from_str("0.00").unwrap(),
    };

    let expires_at = expires_at_str.and_then(|s| s.parse::<chrono::DateTime<chrono::Utc>>().ok());

    match svc
        .create_promo_code(
            code,
            credit_amount,
            free_days,
            discount_percentage,
            expires_at,
            max_uses,
        )
        .await
    {
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

pub async fn get_promo_usage(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(promo_id): Path<i32>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.get_promo_usage(promo_id).await {
        Ok(data) => ok_json!(data),
        Err(e) => err_json!(e),
    }
}

pub async fn apply_promo_to_school(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    let code = payload["code"].as_str().unwrap_or("");
    if code.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"success":false,"message":"Promo code required"})),
        )
            .into_response();
    }
    match svc.apply_promo_code(&school_id, code).await {
        Ok(result) => ok_json!(result),
        Err(e) => err_json!(e),
    }
}
