use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;

pub async fn list_responsibilities(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .list_responsibilities(&school_id)
        .await
    {
        Ok(list) => Json(json!({"success": true, "data": list})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn create_responsibility(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .create_responsibility(&school_id, payload)
        .await
    {
        Ok(res) => Json(json!({"success": true, "data": res})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn assign_responsibility(
    State(state): State<AppState>,
    Path((school_id, employee_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let responsibility_id = match payload["responsibilityId"].as_str() {
        Some(id) => id,
        None => return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "responsibilityId is required"})),
        ).into_response(),
    };

    match state
        .services
        .responsibility
        .assign_responsibility(&school_id, &employee_id, responsibility_id)
        .await
    {
        Ok(_) => Json(json!({"success": true})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn remove_responsibility(
    State(state): State<AppState>,
    Path((school_id, employee_id, responsibility_id)): Path<(String, String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .remove_responsibility(&school_id, &employee_id, &responsibility_id)
        .await
    {
        Ok(_) => Json(json!({"success": true})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn list_employee_responsibilities(
    State(state): State<AppState>,
    Path((school_id, employee_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .list_employee_responsibilities(&school_id, &employee_id)
        .await
    {
        Ok(mut enriched) => {
            if let Some(obj) = enriched.as_object_mut() {
                obj.insert("success".to_string(), json!(true));
            }
            Json(enriched).into_response()
        },
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
