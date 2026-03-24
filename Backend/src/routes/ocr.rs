use axum::{
    extract::{Multipart, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::Path;
use uuid::Uuid;
use crate::AppState;
use crate::error::AppResult;

#[derive(Serialize)]
pub struct OcrResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Deserialize)]
pub struct OcrParams {
    #[allow(dead_code)]
    pub engine: Option<String>,
}

pub async fn extract_text(
    State(state): State<AppState>,
    Query(_params): Query<OcrParams>,
    mut multipart: Multipart,
) -> AppResult<Json<OcrResponse>> {
    let mut file_path = String::new();
    let file_id = Uuid::new_v4().to_string();

    while let Some(field) = multipart.next_field().await.map_err(|e| crate::error::AppError::Internal(e.to_string()))? {
        let name = field.name().unwrap_or("").to_string();
        if name == "image" {
            let file_name = field.file_name().unwrap_or("upload.png").to_string();
            let ext = Path::new(&file_name)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("png");
            let temp_path = format!("uploads/temp_{}.{}", file_id, ext);
            let _ = fs::create_dir_all("uploads");
            let data = field.bytes().await.map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
            
            fs::write(&temp_path, data).map_err(|e| crate::error::AppError::Internal(format!("File save error: {}", e)))?;
            file_path = temp_path;
            break;
        }
    }

    if file_path.is_empty() {
        return Ok(Json(OcrResponse {
            success: false,
            error: Some("No image uploaded".into()),
            data: None,
        }));
    }

    let result = state.services.ocr.perform_ocr(&file_path).await;
    
    // Clean up temp file
    let _ = fs::remove_file(&file_path);

    match result {
        Ok(json) => Ok(Json(OcrResponse {
            success: true,
            data: Some(json),
            error: None,
        })),
        Err(e) => Ok(Json(OcrResponse {
            success: false,
            error: Some(format!("OCR error: {}", e)),
            data: None,
        })),
    }
}
