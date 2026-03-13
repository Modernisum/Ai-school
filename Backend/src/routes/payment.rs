use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::post,
    Json, Router,
};
use hex;
use hmac::{Hmac, Mac};
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::Sha256;

use crate::AppState;

#[derive(Deserialize)]
pub struct CreateOrderRequest {
    pub amount: f64,
    pub currency: Option<String>,
    pub student_id: String,
    pub fee_type: String, // "regular" or "custom"
    pub fee_id: String,
}

pub async fn create_order(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<CreateOrderRequest>,
) -> impl IntoResponse {
    let key_id = std::env::var("RAZORPAY_KEY_ID").unwrap_or_default();
    let key_secret = std::env::var("RAZORPAY_KEY_SECRET").unwrap_or_default();

    if key_id.is_empty() || key_secret.is_empty() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Payment gateway not configured"})),
        );
    }

    let amount_paise = (payload.amount * 100.0) as u64;
    let currency = payload.currency.unwrap_or_else(|| "INR".to_string());

    let client = reqwest::Client::new();
    let res = client
        .post("https://api.razorpay.com/v1/orders")
        .basic_auth(&key_id, Some(&key_secret))
        .json(&json!({
            "amount": amount_paise,
            "currency": currency,
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
                            &currency,
                            &order_id,
                        )
                        .await
                    {
                        Ok(_) => (
                            StatusCode::OK,
                            Json(
                                json!({"orderId": order_id, "amount": payload.amount, "currency": currency}),
                            ),
                        ),
                        Err(_) => (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            Json(json!({"error": "Failed to save transaction"})),
                        ),
                    }
                } else {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(json!({"error": "Failed to parse gateway response"})),
                    )
                }
            } else {
                (
                    StatusCode::BAD_REQUEST,
                    Json(json!({"error": "Gateway rejected order creation"})),
                )
            }
        }
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Failed to contact payment gateway"})),
        ),
    }
}

pub async fn razorpay_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> impl IntoResponse {
    let webhook_secret = std::env::var("RAZORPAY_WEBHOOK_SECRET").unwrap_or_default();

    let signature = match headers.get("x-razorpay-signature") {
        Some(sig) => sig.to_str().unwrap_or(""),
        None => return (StatusCode::BAD_REQUEST, "Missing signature").into_response(),
    };

    // Verify signature
    let mut mac = match Hmac::<Sha256>::new_from_slice(webhook_secret.as_bytes()) {
        Ok(m) => m,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Invalid MAC setup").into_response(),
    };
    mac.update(&body);
    let expected_sig = hex::encode(mac.finalize().into_bytes());

    if expected_sig != signature {
        return (StatusCode::BAD_REQUEST, "Invalid signature").into_response();
    }

    if let Ok(payload) = serde_json::from_slice::<Value>(&body) {
        if let Some(event) = payload["event"].as_str() {
            if event == "payment.captured" || event == "order.paid" {
                let order_id = payload["payload"]["payment"]["entity"]["order_id"]
                    .as_str()
                    .unwrap_or("");
                let payment_id = payload["payload"]["payment"]["entity"]["id"]
                    .as_str()
                    .unwrap_or("");
                if let Ok(Some(school_id)) = state
                    .repos
                    .operations
                    .complete_online_transaction(order_id, payment_id, signature)
                    .await
                {
                    let webhook_engine =
                        crate::logic::webhook_engine::WebhookEngine::new(state.db.pool.clone());
                    let _ = webhook_engine.trigger(&school_id, "fee.paid", json!({
                            "order_id": order_id,
                            "payment_id": payment_id,
                            "amount": payload["payload"]["payment"]["entity"]["amount"].as_f64().unwrap_or(0.0) / 100.0
                        })).await;
                }
            }
        }
    }

    (StatusCode::OK, "OK").into_response()
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/:schoolId/create-order", post(create_order))
        .route("/webhook", post(razorpay_webhook))
}
