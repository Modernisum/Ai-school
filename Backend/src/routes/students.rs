use crate::models::user::{CreateStudentRequest, StudentResponse};
use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;

/* ════════════ VALIDATION HELPERS ════════════ */

fn validate_create_student(payload: &CreateStudentRequest) -> Result<(), String> {
    // className validation (required)
    if payload.class_name.trim().is_empty() {
        return Err("className is required and cannot be empty".to_string());
    }
    if payload.class_name.len() > 50 {
        return Err("className cannot exceed 50 characters".to_string());
    }

    // name validation (optional)
    if let Some(name) = &payload.name {
        if !name.trim().is_empty() && name.len() > 100 {
            return Err("name cannot exceed 100 characters".to_string());
        }
    }

    // contact validation (optional)
    if let Some(contact) = &payload.contact {
        if !contact.trim().is_empty() && contact.len() > 20 {
            return Err("contact cannot exceed 20 characters".to_string());
        }
    }

    // parentContact validation (optional)
    if let Some(parent_contact) = &payload.parent_contact {
        if !parent_contact.trim().is_empty() && parent_contact.len() > 20 {
            return Err("parentContact cannot exceed 20 characters".to_string());
        }
    }

    Ok(())
}

fn validate_update_student(payload: &serde_json::Value) -> Result<(), String> {
    // className validation if present
    if let Some(class_name) = payload.get("className").or(payload.get("class_name")) {
        if let Some(class_str) = class_name.as_str() {
            if class_str.trim().is_empty() {
                return Err("className cannot be empty".to_string());
            }
            if class_str.len() > 50 {
                return Err("className cannot exceed 50 characters".to_string());
            }
        }
    }

    // name validation if present
    if let Some(name) = payload.get("name") {
        if let Some(name_str) = name.as_str() {
            if !name_str.trim().is_empty() && name_str.len() > 100 {
                return Err("name cannot exceed 100 characters".to_string());
            }
        }
    }

    // contact validation if present
    if let Some(contact) = payload.get("contact") {
        if let Some(contact_str) = contact.as_str() {
            if contact_str.len() > 20 {
                return Err("contact cannot exceed 20 characters".to_string());
            }
        }
    }

    Ok(())
}

/* ════════════ ROUTE HANDLERS ════════════ */

pub async fn create_student(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<CreateStudentRequest>,
) -> impl IntoResponse {
    // Validate request payload against user.rs model
    if let Err(validation_error) = validate_create_student(&payload) {
        tracing::warn!("Student creation validation failed: {}", validation_error);
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": validation_error})),
        )
            .into_response();
    }

    let student_data = json!({
        "className": payload.class_name,
        "name": payload.name,
        "gender": payload.gender,
        "dob": payload.dob,
        "contact": payload.contact,
        "address": payload.address,
        "parentName": payload.parent_name,
        "parentContact": payload.parent_contact,
    });

    match state
        .services
        .student
        .create_student(&school_id, student_data)
        .await
    {
        Ok(data) => {
            Json(json!({"success": true, "message": "Student added successfully", "data": data}))
                .into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn list_students(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    tracing::debug!("Fetching students for school_id: {}", school_id);
    match state.services.student.list_students(&school_id).await {
        Ok(students) => Json(json!({"success": true, "data": students})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn get_student(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
) -> impl IntoResponse {
    // Validate student_id
    if student_id.trim().is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "student_id cannot be empty"})),
        )
            .into_response();
    }

    tracing::debug!("Fetching student: {} from school: {}", student_id, school_id);
    match state
        .services
        .student
        .get_student(&school_id, &student_id)
        .await
    {
        Ok(Some(student)) => Json(json!({"success": true, "data": student})).into_response(),
        Ok(None) => (
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({"success": false, "message": "Student not found"})),
        )
            .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn update_student(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    // Validate student_id
    if student_id.trim().is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "student_id cannot be empty"})),
        )
            .into_response();
    }

    // Validate request payload against user.rs model
    if let Err(validation_error) = validate_update_student(&payload) {
        tracing::warn!("Student update validation failed: {}", validation_error);
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": validation_error})),
        )
            .into_response();
    }

    tracing::debug!("Updating student: {} in school: {}", student_id, school_id);
    match state
        .services
        .student
        .update_student(&school_id, &student_id, payload)
        .await
    {
        Ok(_) => Json(json!({"success": true, "message": "Student updated successfully"}))
            .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn delete_student(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
) -> impl IntoResponse {
    // Validate student_id
    if student_id.trim().is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "student_id cannot be empty"})),
        )
            .into_response();
    }

    tracing::warn!("Deleting student: {} from school: {}", student_id, school_id);
    match state
        .services
        .student
        .delete_student(&school_id, &student_id)
        .await
    {
        Ok(_) => Json(json!({"success": true, "message": "Student deleted successfully"}))
            .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
pub async fn list_student_ids(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.student.list_student_ids(&school_id).await {
        Ok(ids) => Json(json!({"success": true, "studentIds": ids})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
