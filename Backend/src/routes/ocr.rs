use axum::{
    extract::{Multipart, Query, State},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json;
use std::fs;
use std::path::Path;
use std::process::Command;
use uuid::Uuid;

#[derive(Serialize)]
pub struct OcrResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Deserialize)]
pub struct OcrParams {
    pub engine: Option<String>,
}

use crate::AppState;

pub async fn extract_text(
    State(state): State<AppState>,
    Query(params): Query<OcrParams>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let ocr_repo = &state.repos.ocr;

    // Save temp file (same as before or moved to repo)
    // For now, keeping the multipart handling here but calling process_ocr
    // Ideally the repo should handle the logic or we just wrap it.

    let engine = params.engine.unwrap_or("paddleocr".to_string());
    let mut file_path = String::new();
    let file_id = Uuid::new_v4().to_string();

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or("").to_string();
        if name == "image" {
            tracing::info!("OCR Route: Receiving image field...");
            let file_name = field.file_name().unwrap_or("upload.png").to_string();
            let ext = Path::new(&file_name)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("png");
            let temp_path = format!("uploads/temp_{}.{}", file_id, ext);
            let _ = fs::create_dir_all("uploads");
            let data = field.bytes().await.unwrap_or_default();
            tracing::info!(
                "OCR Route: Received {} bytes. Saving to {}...",
                data.len(),
                temp_path
            );
            if let Err(e) = fs::write(&temp_path, data) {
                return Json(OcrResponse {
                    success: false,
                    error: Some(format!("File save error: {}", e)),
                    data: None,
                });
            }
            file_path = temp_path;
            break;
        }
    }

    if file_path.is_empty() {
        tracing::warn!("OCR Route: No image field found in multipart request.");
        return Json(OcrResponse {
            success: false,
            error: Some("No image uploaded".into()),
            data: None,
        });
    }

    tracing::info!("OCR Route: Calling OCR pipeline for {}...", file_path);

    match state.services.ocr.perform_ocr(&file_path).await {
        Ok(json) => Json(OcrResponse {
            success: true,
            data: Some(json),
            error: None,
        }),
        Err(e) => Json(OcrResponse {
            success: false,
            error: Some(format!("OCR error: {}", e)),
            data: None,
        }),
    }
}
