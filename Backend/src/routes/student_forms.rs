use crate::AppState;
use crate::middleware::rls::TenantContext;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Extension, Json,
};
use serde_json::json;
use sqlx::Row;

pub async fn get_form_status(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let rows = sqlx::query(
        "SELECT s.student_id, s.name, s.class_name, s.class_id, s.created_at, \
         s.data->>'formCompleted' as form_completed, \
         s.data->>'documents' as documents \
         FROM students s WHERE s.school_id = $1 ORDER BY s.created_at DESC LIMIT 200"
    )
    .bind(&school_id)
    .fetch_all(&state.db.pool)
    .await;

    match rows {
        Ok(rows) => {
            let students: Vec<serde_json::Value> = rows.iter().map(|r| {
                let docs: Option<String> = r.get("documents");
                let doc_urls: Vec<&str> = docs.as_deref().map(|d| d.split(',').filter(|s| !s.is_empty()).collect()).unwrap_or_default();
                let has_docs = !doc_urls.is_empty();
                let form_done = r.get::<Option<String>, _>("form_completed").is_some();
                json!({
                    "studentId": r.get::<String, _>("student_id"),
                    "name": r.get::<String, _>("name"),
                    "className": r.get::<String, _>("class_name"),
                    "hasDocuments": has_docs,
                    "documentCount": doc_urls.len(),
                    "formCompleted": form_done,
                    "createdAt": r.get::<Option<String>, _>("updated_at").map(|d| d.to_string()),
                })
            }).collect();
            let filled = students.iter().filter(|s| s["formCompleted"] == json!(true)).count();
            Json(json!({"success": true, "data": students, "total": students.len(), "completed": filled, "pending": students.len() - filled})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn auto_fill_form(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let student = sqlx::query(
        "SELECT name, class_name, class_id, data FROM students WHERE school_id = $1 AND student_id = $2"
    )
    .bind(&school_id).bind(&student_id)
    .fetch_optional(&state.db.pool)
    .await;

    match student {
        Ok(Some(row)) => {
            let name: String = row.get("name");
            let class_name: String = row.get("class_name");
            let data: serde_json::Value = row.get("data");

            // Try OCR extraction from stored documents if available
            let docs_str = data["documents"].as_str().unwrap_or("");
            let mut ocr_fields = json!({});
            if !docs_str.is_empty() {
                let doc_url = docs_str.split(',').next().unwrap_or("");
                if let Ok(extracted) = state.services.ocr.extract_from_document(&school_id, doc_url, "aadhaar").await {
                    ocr_fields = extracted["extractedFields"].clone();
                }
            }

            let prefill = json!({
                "studentId": student_id,
                "name": name,
                "className": class_name,
                "aadhaarNumber": ocr_fields["aadhaar_number"].as_str().unwrap_or(""),
                "dateOfBirth": ocr_fields["date_of_birth"].as_str().unwrap_or(data["dateOfBirth"].as_str().unwrap_or("")),
                "fatherName": ocr_fields["father_name"].as_str().unwrap_or(data["fatherName"].as_str().unwrap_or("")),
                "motherName": ocr_fields["mother_name"].as_str().unwrap_or(data["motherName"].as_str().unwrap_or("")),
                "address": ocr_fields["address"].as_str().unwrap_or(data["address"].as_str().unwrap_or("")),
                "gender": ocr_fields["gender"].as_str().unwrap_or(data["gender"].as_str().unwrap_or("")),
                "ocrAvailable": !docs_str.is_empty(),
                "formCompleted": data["formCompleted"].as_bool().unwrap_or(false),
            });
            Json(json!({"success": true, "data": prefill})).into_response()
        }
        Ok(None) => (
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({"success": false, "message": "Student not found"})),
        ).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn mark_form_complete(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, student_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let now = chrono::Utc::now().to_rfc3339();
    match sqlx::query(
        "UPDATE students SET data = jsonb_set(data, '{formCompleted}', $1) WHERE school_id = $2 AND student_id = $3"
    )
    .bind(&json!(now)).bind(&school_id).bind(&student_id)
    .execute(&state.db.pool).await
    {
        Ok(_) => Json(json!({"success": true, "studentId": student_id, "formCompletedAt": now})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}
