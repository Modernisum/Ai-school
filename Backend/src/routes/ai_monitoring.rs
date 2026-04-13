//! AI Monitoring Routes for tracking usage, costs, and performance metrics
//! 
//! This module provides endpoints for:
//! - AI usage statistics per school and provider
//! - Cost tracking and billing analytics
//! - Performance metrics and health checks
//! - Real-time monitoring dashboard data

use crate::{
    AppState,
    error::AppResult,
    extractors::{TenantContext, TenantExtractor},
};
use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};
use std::collections::HashMap;

/// Get AI usage statistics for a school
pub async fn get_school_ai_usage(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let start_date = params.get("startDate").map(|s| s.as_str());
    let end_date = params.get("endDate").map(|s| s.as_str());
    let provider_id = params.get("providerId").and_then(|s| s.parse::<i32>().ok());
    
    match state.services.ai.get_school_usage(&school_id, start_date, end_date, provider_id).await {
        Ok(usage) => Json(json!({"success": true, "data": usage})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// Get AI cost summary for a school
pub async fn get_school_ai_costs(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let start_date = params.get("startDate").map(|s| s.as_str());
    let end_date = params.get("endDate").map(|s| s.as_str());
    
    match state.services.ai.get_school_cost(&school_id, start_date, end_date).await {
        Ok(cost) => Json(json!({"success": true, "data": {"total_cost": cost}})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// Get provider performance metrics
pub async fn get_provider_performance(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let provider_id = params.get("providerId").and_then(|s| s.parse::<i32>().ok());
    let days = params.get("days").and_then(|s| s.parse::<i32>().ok()).unwrap_or(30);
    
    match state.services.ai.get_provider_performance(&school_id, provider_id, days).await {
        Ok(metrics) => Json(json!({"success": true, "data": metrics})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// Get monthly AI usage summary
pub async fn get_monthly_ai_summary(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let year = params.get("year").and_then(|s| s.parse::<i32>().ok()).unwrap_or_else(|| {
        chrono::Utc::now().year()
    });
    let month = params.get("month").and_then(|s| s.parse::<i32>().ok()).unwrap_or_else(|| {
        chrono::Utc::now().month() as i32
    });
    
    match state.services.ai.get_monthly_summary(Some(&school_id), year, month).await {
        Ok(summary) => Json(json!({"success": true, "data": summary})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// Get AI usage trends (daily/weekly/monthly)
pub async fn get_ai_usage_trends(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let period = params.get("period").map(|s| s.as_str()).unwrap_or("monthly");
    let limit = params.get("limit").and_then(|s| s.parse::<i32>().ok()).unwrap_or(30);
    
    match state.services.ai.get_usage_trends(&school_id, period, limit).await {
        Ok(trends) => Json(json!({"success": true, "data": trends})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// Get top AI operations by usage
pub async fn get_top_ai_operations(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let limit = params.get("limit").and_then(|s| s.parse::<i32>().ok()).unwrap_or(10);
    let start_date = params.get("startDate").map(|s| s.as_str());
    let end_date = params.get("endDate").map(|s| s.as_str());
    
    match state.services.ai.get_top_operations(&school_id, limit, start_date, end_date).await {
        Ok(operations) => Json(json!({"success": true, "data": operations})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// Get AI provider health status
pub async fn get_ai_provider_health(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.ai.get_provider_health(&school_id).await {
        Ok(health) => Json(json!({"success": true, "data": health})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// Get AI cost alerts configuration
pub async fn get_ai_cost_alerts(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.ai.get_cost_alerts(&school_id).await {
        Ok(alerts) => Json(json!({"success": true, "data": alerts})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// Update AI cost alerts configuration
pub async fn update_ai_cost_alerts(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    match state.services.ai.update_cost_alerts(&school_id, payload).await {
        Ok(alerts) => Json(json!({"success": true, "data": alerts})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// Get real-time AI monitoring dashboard data
pub async fn get_ai_monitoring_dashboard(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.ai.get_monitoring_dashboard(&school_id).await {
        Ok(dashboard) => Json(json!({"success": true, "data": dashboard})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// Get AI usage comparison across providers
pub async fn get_provider_comparison(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let start_date = params.get("startDate").map(|s| s.as_str());
    let end_date = params.get("endDate").map(|s| s.as_str());
    
    match state.services.ai.get_provider_comparison(&school_id, start_date, end_date).await {
        Ok(comparison) => Json(json!({"success": true, "data": comparison})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// Export AI usage report
pub async fn export_ai_usage_report(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let start_date = params.get("startDate").map(|s| s.as_str()).unwrap_or("");
    let end_date = params.get("endDate").map(|s| s.as_str()).unwrap_or("");
    let format = params.get("format").map(|s| s.as_str()).unwrap_or("csv");
    
    match state.services.ai.export_usage_report(&school_id, start_date, end_date, format).await {
        Ok(report) => {
            let content_type = match format {
                "csv" => "text/csv",
                "json" => "application/json",
                "pdf" => "application/pdf",
                _ => "text/csv",
            };
            
            let headers = [
                (axum::http::header::CONTENT_TYPE, content_type),
                (axum::http::header::CONTENT_DISPOSITION, 
                 &format!("attachment; filename=\"ai_usage_report_{}_{}_{}.{}\"", 
                         school_id, start_date, end_date, format)),
            ];
            
            (headers, report).into_response()
        },
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

use axum::extract::Extension;