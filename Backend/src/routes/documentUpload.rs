use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};

pub async fn upload_document(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state
        .services
        .document_box
        .upload_document(&school_id, payload)
        .await
    {
        Ok(data) => Json(serde_json::json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
