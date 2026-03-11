use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};

pub async fn list_documents(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.document_box.list_documents(&school_id).await {
        Ok(mut list) => {
            // Generate signed URLs for attachments
            for item in list.iter_mut() {
                if let Some(path) = item["file_url"].as_str() {
                    if let Ok(url) = state.storage.generate_download_url(path).await {
                        item["downloadUrl"] = serde_json::json!(url);
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
