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
use std::str::FromStr;

// ─── Helper: extract and verify admin token ───────────────────────────

fn extract_admin_token(headers: &HeaderMap) -> Option<String> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|s| s.to_string())
}

fn make_admin_service(state: &AppState) -> AdminService {
    AdminService {
        db: state.db.clone(),
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

// ─── Billing Routes ──────────────────────────────────────────────────────

pub async fn process_refund(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    let amount_str = payload["amount"].as_str().unwrap_or("0");
    let description = payload["description"].as_str().unwrap_or("Manual adjustment");
    
    let amount = match amount_str.parse::<bigdecimal::BigDecimal>() {
        Ok(amt) => amt,
        Err(_) => return err_json!("Invalid amount format"),
    };
    
    match svc.process_refund(&school_id, amount, description).await {
        Ok(result) => ok_json!(result),
        Err(e) => err_json!(e),
    }
}

pub async fn get_wallet_ledger(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.get_wallet_ledger(&school_id).await {
        Ok(data) => ok_json!(data),
        Err(e) => err_json!(e),
    }
}
