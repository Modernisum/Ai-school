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
        "SELECT s.student_id, s.name, s.class_name, s.created_at, s.updated_at, \
         s.data->>'formCompleted' as form_completed, \
         (SELECT string_agg(file_url, ',') FROM document_box WHERE school_id = s.school_id AND user_id = s.student_id) as documents \
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
                let updated_at: Option<chrono::DateTime<chrono::Utc>> = r.get("updated_at");
                json!({
                    "studentId": r.get::<String, _>("student_id"),
                    "name": r.get::<String, _>("name"),
                    "className": r.get::<String, _>("class_name"),
                    "hasDocuments": has_docs,
                    "documentCount": doc_urls.len(),
                    "formCompleted": form_done,
                    "createdAt": updated_at.map(|d| d.to_rfc3339()),
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
        "SELECT name, class_name, data, dob, gender, father_name, mother_name, address_line1, aadhaar_number, \
         (SELECT string_agg(file_url, ',') FROM document_box WHERE school_id = $1 AND user_id = $2) as documents \
         FROM students WHERE school_id = $1 AND student_id = $2"
    )
    .bind(&school_id).bind(&student_id)
    .fetch_optional(&state.db.pool)
    .await;

    match student {
        Ok(Some(row)) => {
            let name: String = row.get("name");
            let class_name: String = row.get("class_name");
            let data: serde_json::Value = row.get("data");
            let docs_str: String = row.get::<Option<String>, _>("documents").unwrap_or_default();

            let db_dob: Option<String> = row.get("dob");
            let db_gender: Option<String> = row.get("gender");
            let db_father: Option<String> = row.get("father_name");
            let db_mother: Option<String> = row.get("mother_name");
            let db_address: Option<String> = row.get("address_line1");
            let db_aadhaar: Option<String> = row.get("aadhaar_number");

            // Try OCR extraction from stored documents if available
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
                "aadhaarNumber": ocr_fields["aadhaar_number"].as_str()
                    .or(db_aadhaar.as_deref())
                    .unwrap_or(""),
                "dateOfBirth": ocr_fields["date_of_birth"].as_str()
                    .or(db_dob.as_deref())
                    .or(data["dateOfBirth"].as_str())
                    .unwrap_or(""),
                "fatherName": ocr_fields["father_name"].as_str()
                    .or(db_father.as_deref())
                    .or(data["fatherName"].as_str())
                    .unwrap_or(""),
                "motherName": ocr_fields["mother_name"].as_str()
                    .or(db_mother.as_deref())
                    .or(data["motherName"].as_str())
                    .unwrap_or(""),
                "address": ocr_fields["address"].as_str()
                    .or(db_address.as_deref())
                    .or(data["address"].as_str())
                    .unwrap_or(""),
                "gender": ocr_fields["gender"].as_str()
                    .or(db_gender.as_deref())
                    .or(data["gender"].as_str())
                    .unwrap_or(""),
                "ocrAvailable": !docs_str.is_empty(),
                "formCompleted": data["formCompleted"].as_bool().unwrap_or(data["formCompleted"].is_string()),
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
