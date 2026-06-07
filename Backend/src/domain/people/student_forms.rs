use crate::AppState;
use crate::middleware::rls::TenantContext;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Extension, Json,
};
use serde_json::json;

pub async fn get_form_status(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.repos.student.get_form_status(&school_id).await {
        Ok(students) => {
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
    match state.repos.student.get_form_autofill_data(&school_id, &student_id).await {
        Ok(Some(student)) => {
            let name = student["name"].as_str().unwrap_or("");
            let class_name = student["className"].as_str().unwrap_or("");
            let data = &student["data"];
            let docs_str = student["documents"].as_str().unwrap_or("");

            let db_dob = student["dob"].as_str();
            let db_gender = student["gender"].as_str();
            let db_father = student["fatherName"].as_str();
            let db_mother = student["motherName"].as_str();
            let db_address = student["address"].as_str();
            let db_aadhaar = student["aadhaar"].as_str();

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
                    .or(db_aadhaar)
                    .unwrap_or(""),
                "dateOfBirth": ocr_fields["date_of_birth"].as_str()
                    .or(db_dob)
                    .or(data["dateOfBirth"].as_str())
                    .unwrap_or(""),
                "fatherName": ocr_fields["father_name"].as_str()
                    .or(db_father)
                    .or(data["fatherName"].as_str())
                    .unwrap_or(""),
                "motherName": ocr_fields["mother_name"].as_str()
                    .or(db_mother)
                    .or(data["motherName"].as_str())
                    .unwrap_or(""),
                "address": ocr_fields["address"].as_str()
                    .or(db_address)
                    .or(data["address"].as_str())
                    .unwrap_or(""),
                "gender": ocr_fields["gender"].as_str()
                    .or(db_gender)
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
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path((school_id, student_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let now = chrono::Utc::now().to_rfc3339();
    match state.repos.student.mark_form_complete(&school_id, &student_id, &now).await {
        Ok(_) => Json(json!({"success": true, "studentId": student_id, "formCompletedAt": now})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}
