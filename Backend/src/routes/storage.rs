use crate::AppState;
use axum::{
    extract::{Query, State},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct SignedUrlRequest {
    pub file_name: String,
    pub content_type: String,
    pub folder: Option<String>, // e.g. "materials", "complains"
}

/// GET /api/storage/upload-url
/// Returns a signed URL for direct client upload to GCS.
pub async fn get_upload_url(
    State(state): State<AppState>,
    Query(payload): Query<SignedUrlRequest>,
) -> impl IntoResponse {
    let folder = payload.folder.unwrap_or_else(|| "uploads".to_string());
    let object_name = format!("{}/{}-{}", folder, Uuid::new_v4(), payload.file_name);

    match state
        .storage
        .generate_upload_url(&object_name, &payload.content_type)
        .await
    {
        Ok(url) => Json(json!({
            "success": true,
            "uploadUrl": url,
            "objectPath": object_name
        }))
        .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// GET /api/storage/download-url?path=folder/file
pub async fn get_download_url(
    State(state): State<AppState>,
    Query(params): Query<serde_json::Value>,
) -> impl IntoResponse {
    let path = match params["path"].as_str() {
        Some(p) => p,
        None => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                "Missing path parameter",
            )
                .into_response()
        }
    };

    match state.storage.generate_download_url(path).await {
        Ok(url) => Json(json!({
            "success": true,
            "downloadUrl": url
        }))
        .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
