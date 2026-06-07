//! AI Monitoring Routes for tracking usage, costs, and performance metrics

use crate::AppState;
use crate::middleware::rls::TenantContext;
use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use serde_json::{json, Value};
use std::collections::HashMap;

/// Verify the authenticated tenant context matches the requested school
fn verify_tenant(tenant_ctx: &TenantContext, school_id: &str) -> Result<(), (axum::http::StatusCode, Json<Value>)> {
    if tenant_ctx.school_id != school_id {
        return Err((
            axum::http::StatusCode::FORBIDDEN,
            Json(json!({"success": false, "error_code": "FORBIDDEN", "message": "Access denied: school ID mismatch"})),
        ));
    }
    Ok(())
}

/// Get AI usage statistics for a school
pub async fn get_school_ai_usage(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    verify_tenant(&tenant_ctx, &school_id)?;
    let start_date = params.get("startDate").map(|s| s.as_str());
    let end_date = params.get("endDate").map(|s| s.as_str());
    let provider_id = params.get("providerId").and_then(|s| s.parse::<i32>().ok());

    let usage = state.services.ai.get_school_usage(&school_id, start_date, end_date, provider_id)
        .await
        .map_err(|e| (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ))?;
    Ok(Json(json!({"success": true, "data": usage})))
}

/// Get AI cost summary for a school
pub async fn get_school_ai_costs(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    verify_tenant(&tenant_ctx, &school_id)?;
    let start_date = params.get("startDate").map(|s| s.as_str());
    let end_date = params.get("endDate").map(|s| s.as_str());

    let cost = state.services.ai.get_school_cost(&school_id, start_date, end_date)
        .await
        .map_err(|e| (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ))?;
    Ok(Json(json!({"success": true, "data": {"total_cost": cost}})))
}

/// Get provider performance metrics
pub async fn get_provider_performance(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    verify_tenant(&tenant_ctx, &school_id)?;
    let provider_id = params.get("providerId").and_then(|s| s.parse::<i32>().ok());
    let days = params.get("days").and_then(|s| s.parse::<i32>().ok()).unwrap_or(30);

    let metrics = state.services.ai.get_provider_performance(&school_id, provider_id, days)
        .await
        .map_err(|e| (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ))?;
    Ok(Json(json!({"success": true, "data": metrics})))
}

/// Get monthly AI usage summary
pub async fn get_monthly_ai_summary(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    verify_tenant(&tenant_ctx, &school_id)?;
    let year = params.get("year").and_then(|s| s.parse::<i32>().ok()).unwrap_or_else(|| chrono::Utc::now().year());
    let month = params.get("month").and_then(|s| s.parse::<i32>().ok()).unwrap_or_else(|| chrono::Utc::now().month() as i32);

    let summary = state.services.ai.get_monthly_summary(Some(&school_id), year, month)
        .await
        .map_err(|e| (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ))?;
    Ok(Json(json!({"success": true, "data": summary})))
}

/// Get AI usage trends (daily/weekly/monthly)
pub async fn get_ai_usage_trends(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    verify_tenant(&tenant_ctx, &school_id)?;
    let period = params.get("period").map(|s| s.as_str()).unwrap_or("monthly");
    let limit = params.get("limit").and_then(|s| s.parse::<i32>().ok()).unwrap_or(30);

    let trends = state.services.ai.get_usage_trends(&school_id, period, limit)
        .await
        .map_err(|e| (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ))?;
    Ok(Json(json!({"success": true, "data": trends})))
}

/// Get top AI operations by usage
pub async fn get_top_ai_operations(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    verify_tenant(&tenant_ctx, &school_id)?;
    let limit = params.get("limit").and_then(|s| s.parse::<i32>().ok()).unwrap_or(10);
    let start_date = params.get("startDate").map(|s| s.as_str());
    let end_date = params.get("endDate").map(|s| s.as_str());

    let operations = state.services.ai.get_top_operations(&school_id, limit, start_date, end_date)
        .await
        .map_err(|e| (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ))?;
    Ok(Json(json!({"success": true, "data": operations})))
}

/// Get AI provider health status
pub async fn get_ai_provider_health(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    verify_tenant(&tenant_ctx, &school_id)?;
    let health = state.services.ai.get_provider_health(&school_id)
        .await
        .map_err(|e| (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ))?;
    Ok(Json(json!({"success": true, "data": health})))
}

/// Get AI cost alerts configuration
pub async fn get_ai_cost_alerts(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    verify_tenant(&tenant_ctx, &school_id)?;
    let alerts = state.services.ai.get_cost_alerts(&school_id)
        .await
        .map_err(|e| (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ))?;
    Ok(Json(json!({"success": true, "data": alerts})))
}

/// Update AI cost alerts configuration
pub async fn update_ai_cost_alerts(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    verify_tenant(&tenant_ctx, &school_id)?;
    let alerts = state.services.ai.update_cost_alerts(&school_id, payload)
        .await
        .map_err(|e| (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ))?;
    Ok(Json(json!({"success": true, "data": alerts})))
}

/// Get real-time AI monitoring dashboard data
pub async fn get_ai_monitoring_dashboard(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    verify_tenant(&tenant_ctx, &school_id)?;
    let dashboard = state.services.ai.get_monitoring_dashboard(&school_id)
        .await
        .map_err(|e| (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ))?;
    Ok(Json(json!({"success": true, "data": dashboard})))
}

/// Get AI usage comparison across providers
pub async fn get_provider_comparison(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    verify_tenant(&tenant_ctx, &school_id)?;
    let start_date = params.get("startDate").map(|s| s.as_str());
    let end_date = params.get("endDate").map(|s| s.as_str());

    let comparison = state.services.ai.get_provider_comparison(&school_id, start_date, end_date)
        .await
        .map_err(|e| (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ))?;
    Ok(Json(json!({"success": true, "data": comparison})))
}

/// Export AI usage report
pub async fn export_ai_usage_report(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    verify_tenant(&tenant_ctx, &school_id)?;
    let start_date = params.get("startDate").map(|s| s.as_str()).unwrap_or("");
    let end_date = params.get("endDate").map(|s| s.as_str()).unwrap_or("");
    let format = params.get("format").map(|s| s.as_str()).unwrap_or("csv");

    let report = state.services.ai.export_usage_report(&school_id, start_date, end_date, format)
        .await
        .map_err(|e| (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ))?;
    Ok(Json(json!({"success": true, "data": report})))
}
