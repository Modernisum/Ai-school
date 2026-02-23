use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};

pub async fn list_complains(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.complain.list_complains(&school_id).await {
        Ok(list) => Json(serde_json::json!({"success": true, "data": list})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn create_complain(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state
        .services
        .complain
        .create_complain(&school_id, payload)
        .await
    {
        Ok(complain) => {
            Json(serde_json::json!({"success": true, "data": complain})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
