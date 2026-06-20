use crate::AppState;
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use sqlx::Row;
use serde_json::{json, Value};
use crate::domain::admin::make_admin_service;

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

pub async fn get_admin_dashboard_stats(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let _ = require_admin!(headers, state);

    // Optimized SQL to get global stats
    let stats_query = r#"
        SELECT 
            (SELECT COUNT(*) FROM schools) as school_count,
            (SELECT COUNT(*) FROM students) as student_count,
            (SELECT COUNT(*) FROM employees) as teacher_count,
            (SELECT SUM(wallet_balance) FROM schools) as total_wallet_balance
    "#;

    let stats: (i64, i64, i64, Option<bigdecimal::BigDecimal>) = 
        match sqlx::query_as(stats_query).fetch_one(&state.db.pool).await {
            Ok(s) => s,
            Err(e) => return err_json!(e),
        };

    // Monthly Registration Data (Optimized)
    let registration_data = sqlx::query(
        r#"
        SELECT 
            TO_CHAR(created_at, 'YYYY-MM') as month,
            COUNT(*) as count
        FROM schools
        WHERE created_at > CURRENT_DATE - INTERVAL '1 year'
        GROUP BY month
        ORDER BY month ASC
        "#
    )
    .fetch_all(&state.db.pool)
    .await;

    let chart_data: Vec<Value> = match registration_data {
        Ok(rows) => rows.into_iter().map(|r| {
            json!({
                "month": Row::get::<String, _>(&r, "month"),
                "count": Row::get::<i64, _>(&r, "count")
            })
        }).collect(),
        Err(_) => vec![]
    };

    ok_json!(json!({
        "totals": {
            "schools": stats.0,
            "students": stats.1,
            "teachers": stats.2,
            "wallet": stats.3.unwrap_or_else(|| bigdecimal::BigDecimal::from(0)).to_string()
        },
        "registrations": chart_data
    }))
}

pub async fn get_churn_radar(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.get_churn_radar().await {
        Ok(data) => ok_json!(data),
        Err(e) => err_json!(e),
    }
}

pub async fn get_admin_stats_advanced(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let svc = require_admin!(headers, state);
    match svc.get_admin_stats().await {
        Ok(stats) => ok_json!(stats),
        Err(e) => err_json!(e),
    }
}
