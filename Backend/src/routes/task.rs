use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};

pub async fn list_tasks(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.task.list_tasks(&school_id).await {
        Ok(list) => Json(serde_json::json!({"success": true, "data": list})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
