use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;

#[derive(Deserialize)]
pub struct PendingFeesQuery {
    #[serde(rename = "minPercentage")]
    pub min_percentage: f64,
    #[serde(rename = "className")]
    pub class_name: Option<String>,
}

pub async fn create_school_fee(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state
        .services
        .operations
        .create_school_fee(&school_id, payload)
        .await
    {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn get_school_fees(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.operations.get_school_fees(&school_id).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn get_pending_fees(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    axum::extract::Query(query): axum::extract::Query<PendingFeesQuery>,
) -> impl IntoResponse {
    match state
        .services
        .operations
        .get_pending_fees(&school_id, query.min_percentage, query.class_name)
        .await
    {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn get_student_fee(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .operations
        .get_student_fee(&school_id, &student_id)
        .await
    {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
pub async fn pay_fee(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let amount = payload["amount"].as_i64().unwrap_or(0);
    match state
        .services
        .operations
        .pay_fee(&school_id, &student_id, amount)
        .await
    {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn add_fee_to_student_route(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let amount = payload["amount"].as_f64().unwrap_or(0.0);
    let fee_id = payload["feeId"].as_str().unwrap_or("");

    match state
        .services
        .operations
        .add_fee_to_student(&school_id, &student_id, amount, fee_id)
        .await
    {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn apply_discount(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let discount = payload["discount"].as_f64().unwrap_or(0.0);
    match state
        .services
        .operations
        .apply_discount(&school_id, &student_id, discount)
        .await
    {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

// ---- Custom Fees ----

pub async fn create_custom_fee(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state.services.operations.create_custom_fee(&school_id, payload).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success": false, "message": e.to_string()}))).into_response(),
    }
}

pub async fn list_custom_fees(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.operations.list_custom_fees(&school_id).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success": false, "message": e.to_string()}))).into_response(),
    }
}

pub async fn delete_custom_fee(
    State(state): State<AppState>,
    Path((school_id, fee_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state.services.operations.remove_custom_fee(&school_id, &fee_id).await {
        Ok(_) => Json(json!({"success": true, "message": "Deleted"})).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success": false, "message": e.to_string()}))).into_response(),
    }
}

pub async fn apply_custom_fee(
    State(state): State<AppState>,
    Path((school_id, fee_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state.services.operations.apply_custom_fee(&school_id, &fee_id).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success": false, "message": e.to_string()}))).into_response(),
    }
}

pub async fn get_student_profile(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state.services.operations.get_student_profile(&school_id, &student_id).await {
        Ok(Some(data)) => Json(json!({"success": true, "data": data})).into_response(),
        Ok(None) => (axum::http::StatusCode::NOT_FOUND, Json(json!({"success": false, "message": "Student not found"}))).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success": false, "message": e.to_string()}))).into_response(),
    }
}

// ---- Referral Coupons ----

pub async fn create_coupon(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state.services.operations.create_coupon(&school_id, payload).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (axum::http::StatusCode::BAD_REQUEST, Json(json!({"success": false, "message": e.to_string()}))).into_response(),
    }
}

pub async fn list_coupons(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.operations.list_coupons(&school_id).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success": false, "message": e.to_string()}))).into_response(),
    }
}

pub async fn delete_coupon(
    State(state): State<AppState>,
    Path((school_id, coupon_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state.services.operations.remove_coupon(&school_id, &coupon_id).await {
        Ok(_) => Json(json!({"success": true, "message": "Deleted"})).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success": false, "message": e.to_string()}))).into_response(),
    }
}

pub async fn block_coupon(
    State(state): State<AppState>,
    Path((school_id, coupon_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let blocked = payload["blocked"].as_bool().unwrap_or(true);
    match state.services.operations.toggle_block_coupon(&school_id, &coupon_id, blocked).await {
        Ok(_) => Json(json!({"success": true, "message": if blocked { "Blocked" } else { "Unblocked" }})).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success": false, "message": e.to_string()}))).into_response(),
    }
}

pub async fn validate_coupon(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let coupon_name = payload["couponName"].as_str().unwrap_or("");
    match state.services.operations.validate_coupon(&school_id, coupon_name).await {
        Ok(Some(data)) => Json(json!({"success": true, "data": data})).into_response(),
        Ok(None) => (axum::http::StatusCode::NOT_FOUND, Json(json!({"success": false, "message": "Coupon not found"}))).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success": false, "message": e.to_string()}))).into_response(),
    }
}

pub async fn use_coupon(
    State(state): State<AppState>,
    Path((school_id, coupon_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let student_id = payload["studentId"].as_str().unwrap_or("");
    let discount = payload["discount"].as_f64().unwrap_or(0.0);
    match state.services.operations.use_coupon(&school_id, &coupon_id, student_id, discount).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success": false, "message": e.to_string()}))).into_response(),
    }
}
