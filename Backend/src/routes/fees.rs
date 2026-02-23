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
