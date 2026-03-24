use crate::middleware::rls::TenantContext;
use crate::AppState;

use axum::{
    extract::{Path, State, Query},
    response::IntoResponse,
    Extension, Json,
};
use serde::Deserialize;
use serde_json::json;
use crate::error::AppResult;

#[derive(Deserialize)]
pub struct PendingFeesQuery {
    #[serde(rename = "minPercentage")]
    pub min_percentage: f64,
    #[serde(rename = "className")]
    pub class_name: Option<String>,
}

pub async fn create_school_fee(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .fee
        .create_school_fee(&school_id, &tenant_ctx.admin_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn get_school_fees(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let data = state.services.fee.get_school_fees(&school_id).await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn get_pending_fees(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(query): Query<PendingFeesQuery>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .fee
        .get_pending_fees(&school_id, query.min_percentage, query.class_name)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn get_student_fee(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .fee
        .get_student_fee(&school_id, &student_id)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn pay_fee(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, student_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .fee
        .pay_fee(&school_id, &student_id, &tenant_ctx.admin_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn add_fee_to_student_route(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, student_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let amount = payload["amount"].as_f64().unwrap_or(0.0);
    let fee_id = payload["feeId"].as_str().unwrap_or("");

    let data = state
        .services
        .fee
        .add_fee_to_student(&school_id, &student_id, amount, fee_id, &tenant_ctx.admin_id)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn apply_discount(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, student_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let discount = payload["discount"].as_f64().unwrap_or(0.0);

    let data = state
        .services
        .fee
        .apply_discount(&school_id, &student_id, discount, &tenant_ctx.admin_id)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}

// ---- Custom Fees ----

pub async fn create_custom_fee(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .fee
        .create_custom_fee(&school_id, &tenant_ctx.admin_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn list_custom_fees(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let data = state.services.fee.list_custom_fees(&school_id).await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn delete_custom_fee(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, fee_id)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    state
        .services
        .fee
        .remove_custom_fee(&school_id, &fee_id, &tenant_ctx.admin_id)
        .await?;
    Ok(Json(json!({"success": true, "message": "Deleted"})))
}

pub async fn apply_custom_fee(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, fee_id)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .fee
        .apply_custom_fee(&school_id, &fee_id, &tenant_ctx.admin_id)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn get_student_profile(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .fee
        .get_student_fee(&school_id, &student_id)
        .await?;
    
    Ok(Json(json!({"success": true, "data": data})).into_response())
}

// ---- Referral Coupons ----

pub async fn create_coupon(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .coupon
        .create_coupon(&school_id, &tenant_ctx.admin_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn list_coupons(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let data = state.services.coupon.list_coupons(&school_id).await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn delete_coupon(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, coupon_id)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    state
        .services
        .coupon
        .remove_coupon(&school_id, &coupon_id, &tenant_ctx.admin_id)
        .await?;
    Ok(Json(json!({"success": true, "message": "Deleted"})))
}

pub async fn block_coupon(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, coupon_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let blocked = payload["blocked"].as_bool().unwrap_or(true);
    state
        .services
        .coupon
        .toggle_block_coupon(&school_id, &coupon_id, &tenant_ctx.admin_id, blocked)
        .await?;
    Ok(Json(json!({"success": true, "message": if blocked { "Blocked" } else { "Unblocked" }})))
}

pub async fn validate_coupon(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let coupon_name = payload["couponName"].as_str().unwrap_or("");
    let data = state
        .services
        .coupon
        .validate_coupon(&school_id, coupon_name)
        .await?;
    
    match data {
        Some(d) => Ok(Json(json!({"success": true, "data": d})).into_response()),
        None => Ok((axum::http::StatusCode::NOT_FOUND, Json(json!({"success": false, "message": "Coupon not found"}))).into_response())
    }
}

pub async fn use_coupon(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, coupon_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let student_id = payload["studentId"].as_str().unwrap_or("");
    let discount = payload["discount"].as_f64().unwrap_or(0.0);
    let data = state
        .services
        .coupon
        .use_coupon(&school_id, &coupon_id, student_id, &tenant_ctx.admin_id, discount)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn generate_fee_reminder(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .fee
        .generate_fee_reminder(&school_id, &student_id)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}
