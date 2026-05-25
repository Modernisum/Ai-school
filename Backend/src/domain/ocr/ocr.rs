use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;

pub async fn extract_ocr(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let file_url = match payload["fileUrl"].as_str() {
        Some(url) if !url.is_empty() => url,
        _ => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(json!({"success": false, "message": "fileUrl is required"})),
            )
                .into_response();
        }
    };

    let doc_type = payload["docType"].as_str().unwrap_or("aadhaar");

    match state
        .services
        .ocr
        .extract_from_document(&school_id, file_url, doc_type)
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

pub async fn extract_ocr_batch(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let files = match payload["files"].as_array() {
        Some(files) => files,
        None => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(json!({"success": false, "message": "files array is required"})),
            )
                .into_response();
        }
    };

    let docs: Vec<(String, String)> = files
        .iter()
        .filter_map(|f| {
            let url = f["fileUrl"].as_str()?;
            let doc_type = f["docType"].as_str().unwrap_or("aadhaar");
            Some((url.to_string(), doc_type.to_string()))
        })
        .collect();

    if docs.is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "No valid files in request"})),
        )
            .into_response();
    }

    match state.services.ocr.extract_batch(&school_id, &docs).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
