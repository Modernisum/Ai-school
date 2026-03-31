use crate::AppState;
use axum::{
    extract::{Path, State, Query},
    response::IntoResponse,
    Json,
};
use std::collections::HashMap;

pub async fn list_documents(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let student_id = params.get("student_id").map(|s| s.as_str());
    match state.services.document_box.list_documents(&school_id, student_id).await {
        Ok(mut list) => {
            // Generate signed URLs for attachments
            for item in list.iter_mut() {
                if let Some(path) = item["file_url"].as_str() {
                    let url = state.storage.get_public_url(path);
                    item["downloadUrl"] = serde_json::json!(url);
                }
            }
            Json(serde_json::json!({"success": true, "data": list})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
