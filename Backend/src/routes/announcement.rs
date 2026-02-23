use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;

pub async fn create_announcement(
    State(state): State<AppState>,
    Path((school_id, type_str, user_id)): Path<(String, String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state
        .services
        .resource
        .create_announcement(&school_id, &type_str, &user_id, payload)
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
