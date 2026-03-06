use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;

pub async fn set_base_salary(
    State(state): State<AppState>,
    Path((school_id, employee_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state
        .services
        .operations
        .set_employee_salary_params(&school_id, &employee_id, payload)
        .await
    {
        Ok(_) => {
            Json(json!({"success": true, "message": "Salary parameters updated"})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn get_salary_breakdown(
    State(state): State<AppState>,
    Path((school_id, employee_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state.services.operations.get_salary_breakdown(&school_id, &employee_id).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn add_bonus(
    State(state): State<AppState>,
    Path((school_id, employee_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state.services.operations.add_bonus(&school_id, &employee_id, payload).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn add_aid(
    State(state): State<AppState>,
    Path((school_id, employee_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state.services.operations.add_aid(&school_id, &employee_id, payload).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
