use crate::AppState;

use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json, Extension,
};
use crate::middleware::rls::TenantContext;
use serde_json::json;
use crate::error::AppResult;

pub async fn set_base_salary(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, employee_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    state
        .services
        .payroll
        .set_employee_salary_params(&school_id, &employee_id, &tenant_ctx.admin_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "message": "Salary parameters updated"})))
}

pub async fn get_salary_breakdown(
    State(state): State<AppState>,
    Path((school_id, employee_id)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .payroll
        .get_salary_breakdown(&school_id, &employee_id)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn add_bonus(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, employee_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .payroll
        .add_bonus(&school_id, &employee_id, &tenant_ctx.admin_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn add_aid(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, employee_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .payroll
        .add_aid(&school_id, &employee_id, &tenant_ctx.admin_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn auto_close_month(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, employee_id)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    state
        .services
        .payroll
        .auto_close_month(&school_id, &employee_id, &tenant_ctx.admin_id)
        .await?;
    Ok(Json(json!({"success": true, "message": "Month closed successfully"})))
}

pub async fn record_salary_payment(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, employee_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .payroll
        .add_payment(&school_id, &employee_id, &tenant_ctx.admin_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}
