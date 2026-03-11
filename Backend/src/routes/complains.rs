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
        Ok(mut list) => {
            // Generate signed URLs for attachments
            for item in list.iter_mut() {
                if let Some(path) = item["attachment_path"].as_str() {
                    if let Ok(url) = state.storage.generate_download_url(path).await {
                        item["attachmentUrl"] = serde_json::json!(url);
                    }
                }
            }
            Json(serde_json::json!({"success": true, "data": list})).into_response()
        },
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
