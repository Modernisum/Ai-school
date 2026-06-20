use crate::AppState;
use axum::{extract::State, response::IntoResponse, Json};

pub async fn create_topic(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state.services.academic.create_topic(payload).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
