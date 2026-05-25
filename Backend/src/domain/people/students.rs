use crate::models::user::CreateStudentRequest;
use crate::AppState;
use axum::{
    extract::{Path, State, Query},
    response::IntoResponse,
    Json, Extension
};
use crate::middleware::rls::TenantContext;
use serde_json::json;
use crate::error::{AppResult, AppError};

/* ════════════ VALIDATION HELPERS ════════════ */

fn validate_create_student(payload: &CreateStudentRequest) -> AppResult<()> {
    // class_name validation (required)
    if payload.class_name.trim().is_empty() {
        return Err(AppError::Validation("className is required and cannot be empty".to_string()));
    }
    if payload.class_name.len() > 100 {
        return Err(AppError::Validation("className cannot exceed 100 characters".to_string()));
    }

    // name validation 
    let name = &payload.name;
    if !name.trim().is_empty() && name.len() > 100 {
        return Err(AppError::Validation("name cannot exceed 100 characters".to_string()));
    }

    // contact validation
    let contact = &payload.contact;
    if !contact.trim().is_empty() && contact.len() > 20 {
        return Err(AppError::Validation("contact cannot exceed 20 characters".to_string()));
    }

    // parentContact validation
    let parent_contact = &payload.parent_contact;
    if !parent_contact.trim().is_empty() && parent_contact.len() > 20 {
        return Err(AppError::Validation("parentContact cannot exceed 20 characters".to_string()));
    }

    // transport validation
    if payload.transport_enabled {
        if payload.transport_radius.is_none() {
            return Err(AppError::Validation("transportRadius is required when transportEnabled is true".to_string()));
        }
    }

    Ok(())
}

fn validate_update_student(payload: &serde_json::Value) -> AppResult<()> {
    // spaceId validation if present
    if let Some(space_id) = payload.get("spaceId").or(payload.get("space_id")) {
        if let Some(space_str) = space_id.as_str() {
            if space_str.trim().is_empty() {
                return Err(AppError::Validation("spaceId cannot be empty".to_string()));
            }
            if space_str.len() > 50 {
                return Err(AppError::Validation("spaceId cannot exceed 50 characters".to_string()));
            }
        }
    }

    // name validation if present
    if let Some(name) = payload.get("name") {
        if let Some(name_str) = name.as_str() {
            if !name_str.trim().is_empty() && name_str.len() > 100 {
                return Err(AppError::Validation("name cannot exceed 100 characters".to_string()));
            }
        }
    }

    // contact validation if present
    if let Some(contact) = payload.get("contact") {
        if let Some(contact_str) = contact.as_str() {
            if contact_str.len() > 20 {
                return Err(AppError::Validation("contact cannot exceed 20 characters".to_string()));
            }
        }
    }

    Ok(())
}

/* ════════════ ROUTE HANDLERS ════════════ */

pub async fn create_student(
    State(state): State<AppState>,
    Extension(t_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<CreateStudentRequest>,
) -> AppResult<impl IntoResponse> {
    // Validate request payload
    validate_create_student(&payload)?;

    let student_data = json!({
        "spaceId": payload.space_id,
        "className": payload.class_name,
        "name": payload.name,
        "gender": payload.gender,
        "dob": payload.dob,
        "contact": payload.contact,
        "alternativeContact": payload.alternative_contact,
        "email": payload.email,
        "aadhaarNumber": payload.aadhaar_number,
        "fatherName": payload.father_name,
        "motherName": payload.mother_name,
        "addressLine1": payload.address_line1,
        "addressCountryId": payload.address_country_id,
        "addressCountryCode": payload.address_country_code,
        "addressPhoneCode": payload.address_phone_code,
        "addressStateId": payload.address_state_id,
        "addressState": payload.address_state,
        "addressDistrict": payload.address_district,
        "addressCity": payload.address_city,
        "addressPincode": payload.address_pincode,
        "tcNumber": payload.tc_number,
        "admissionDate": payload.admission_date,
        "roomNumber": payload.room_number,
        "transportEnabled": payload.transport_enabled,
        "transportRadius": payload.transport_radius,
        "studentType": payload.student_type,
        "enrolledSubjects": payload.enrolled_subjects,
        "totalFees": payload.total_fee,
        "selectedSubjects": payload.selected_subjects,
        "profileImageUrl": payload.profile_image_url,
        "bloodGroup": payload.blood_group,
        "caste": payload.caste,
        "medicalHistory": payload.medical_history,
        "allergies": payload.allergies,
        "emergencyContact": payload.emergency_contact,
    });

    let data = state.services.student
        .create_student(&school_id, &t_ctx.admin_id, student_data)
        .await?;

    let webhook_engine = crate::logic::webhook_engine::WebhookEngine::new(state.db.pool.clone());
    let _ = webhook_engine
        .trigger(
            &school_id,
            "student.enrolled",
            json!({
                "student_id": data["studentId"],
                "name": payload.name,
                "space": payload.space_id
            }),
        )
        .await;

    Ok((
        axum::http::StatusCode::CREATED,
        Json(json!({"success": true, "message": "Student added successfully", "data": data}))
    ))
}

#[allow(dead_code)]
pub async fn bulk_create_students(
    State(state): State<AppState>,
    Extension(t_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<Vec<serde_json::Value>>,
) -> AppResult<impl IntoResponse> {
    let data = state.services.student
        .bulk_create_students(&school_id, &t_ctx.admin_id, payload)
        .await?;
        
    Ok(Json(json!({"success": true, "message": "Bulk import completed", "data": data})))
}

pub async fn list_students(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    tracing::debug!("Fetching students for school_id: {}", school_id);
    let students = state.services.student.list_students(&school_id).await?;
    Ok(Json(json!({"success": true, "data": students})))
}

#[derive(serde::Deserialize)]
pub struct StudentListQuery {
    pub section: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct StudentPaginatedQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub space_id: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
}

pub async fn list_students_by_space(
    State(state): State<AppState>,
    Path((school_id, space_id)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    tracing::debug!(
        "Fetching students for space: {} in school: {}",
        space_id,
        school_id
    );
    let students = state.services.student
        .list_students_by_space(&school_id, &space_id)
        .await?;
    Ok(Json(json!({"success": true, "data": students})))
}

pub async fn get_student(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    if student_id.trim().is_empty() {
        return Err(AppError::Validation("student_id cannot be empty".to_string()));
    }

    tracing::debug!("Fetching student: {} from school: {}", student_id, school_id);
    let student = state.services.student.get_student(&school_id, &student_id).await?;
    
    match student {
        Some(s) => Ok(Json(json!({"success": true, "data": s}))),
        None => Err(AppError::NotFound("Student not found".to_string())),
    }
}

pub async fn update_student(
    State(state): State<AppState>,
    Extension(t_ctx): Extension<TenantContext>,
    Path((school_id, student_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    if student_id.trim().is_empty() {
        return Err(AppError::Validation("student_id cannot be empty".to_string()));
    }

    validate_update_student(&payload)?;

    tracing::debug!("Updating student: {} in school: {}", student_id, school_id);
    state.services.student
        .update_student(&school_id, &student_id, &t_ctx.admin_id, payload)
        .await?;
        
    Ok(Json(json!({"success": true, "message": "Student updated successfully"})))
}

pub async fn delete_student(
    State(state): State<AppState>,
    Extension(t_ctx): Extension<TenantContext>,
    Path((school_id, student_id)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    if student_id.trim().is_empty() {
        return Err(AppError::Validation("student_id cannot be empty".to_string()));
    }

    tracing::warn!("Deleting student: {} from school: {}", student_id, school_id);
    state.services.student.delete_student(&school_id, &student_id, &t_ctx.admin_id).await?;
    
    Ok(Json(json!({"success": true, "message": "Student deleted successfully"})))
}

pub async fn list_student_ids(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let ids = state.services.student.list_student_ids(&school_id).await?;
    Ok(Json(json!({"success": true, "studentIds": ids})))
}

pub async fn list_students_paginated(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(q): Query<StudentPaginatedQuery>,
) -> AppResult<impl IntoResponse> {
    let page = q.page.unwrap_or(1).max(1);
    let limit = q.limit.unwrap_or(20).max(1).min(100);
    
    let space_id = q.space_id.as_deref();
    let status = q.status.as_deref();
    let search = q.search.as_deref();
    
    tracing::debug!(
        "Fetching paginated students for school_id: {}, page: {}, limit: {}, space: {:?}, status: {:?}, search: {:?}",
        school_id, page, limit, space_id, status, search
    );
    
    let (students, total_count) = state.services.student
        .list_students_paginated(&school_id, page, limit, space_id, status, search)
        .await?;
    
    let total_pages = ((total_count as f64) / (limit as f64)).ceil() as i64;
    
    Ok(Json(json!({
        "success": true,
        "data": students,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "totalPages": total_pages,
            "hasNext": page < total_pages as i32,
            "hasPrev": page > 1
        }
    })))
}

// POST /api/students/:schoolId/bulk
pub async fn bulk_import_students(
    State(state): State<AppState>,
    Extension(t_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let rows = match payload["students"].as_array().or(payload.as_array()) {
        Some(r) => r.clone(),
        None => return Err(AppError::Validation("Expected a 'students' array".to_string())),
    };

    let mut results = Vec::new();
    let mut success_count = 0usize;
    let mut fail_count = 0usize;

    for (i, row) in rows.iter().enumerate() {
        let class_val = row.get("Space Name")
            .or(row.get("spaceId"))
            .or(row.get("className"))
            .or(row.get("class"))
            .or(row.get("class_name"))
            .unwrap_or(&serde_json::Value::Null);

        let student_data = json!({
            "spaceId": class_val,
            "className": class_val,
            "name": row.get("Name").or(row.get("name")).unwrap_or(&serde_json::Value::Null),
            "gender": row.get("Gender").or(row.get("gender")).unwrap_or(&serde_json::Value::Null),
            "dob": row.get("dob").or(row.get("DOB")).or(row.get("dateOfBirth")).or(row.get("date_of_birth")).unwrap_or(&serde_json::Value::Null),
            "contact": row.get("Contact").or(row.get("contact")).or(row.get("phone")).or(row.get("Phone")).or(row.get("phone_number")).unwrap_or(&serde_json::Value::Null),
            "alternativeContact": row.get("Alternative Contact").or(row.get("alternative_contact")).or(row.get("alternativeContact")).unwrap_or(&serde_json::Value::Null),
            "email": row.get("Email").or(row.get("email")).unwrap_or(&serde_json::Value::Null),
            "aadhaarNumber": row.get("Aadhaar Number").or(row.get("aadhaarNumber")).or(row.get("aadhaar_number")).or(row.get("aadhaar")).unwrap_or(&serde_json::Value::Null),
            "fatherName": row.get("Father Name").or(row.get("fatherName")).or(row.get("father_name")).unwrap_or(&serde_json::Value::Null),
            "motherName": row.get("Mother Name").or(row.get("motherName")).or(row.get("mother_name")).unwrap_or(&serde_json::Value::Null),
            "addressLine1": row.get("Address").or(row.get("address")).or(row.get("addressLine1")).or(row.get("address_line1")).unwrap_or(&serde_json::Value::Null),
            "addressCity": row.get("City").or(row.get("city")).or(row.get("addressCity")).or(row.get("address_city")).unwrap_or(&serde_json::Value::Null),
            "addressState": row.get("State").or(row.get("state")).or(row.get("addressState")).or(row.get("address_state")).unwrap_or(&serde_json::Value::Null),
            "addressPincode": row.get("Pincode").or(row.get("pincode")).or(row.get("addressPincode")).or(row.get("address_pincode")).unwrap_or(&serde_json::Value::Null),
            "admissionDate": row.get("Admission Date").or(row.get("admissionDate")).or(row.get("admission_date")).unwrap_or(&serde_json::Value::Null),
            "roomNumber": row.get("Room Number").or(row.get("roomNumber")).or(row.get("room_number")).unwrap_or(&serde_json::Value::Null),
            "studentType": row.get("Student Type").or(row.get("studentType")).or(row.get("student_type")).or(row.get("type")).unwrap_or(&serde_json::Value::Null),
            "bloodGroup": row.get("Blood Group").or(row.get("bloodGroup")).or(row.get("blood_group")).unwrap_or(&serde_json::Value::Null),
            "caste": row.get("Caste").or(row.get("caste")).unwrap_or(&serde_json::Value::Null),
            "emergencyContact": row.get("Emergency Contact").or(row.get("emergencyContact")).or(row.get("emergency_contact")).unwrap_or(&serde_json::Value::Null),
        });

        match state.services.student.create_student(&school_id, &t_ctx.admin_id, student_data).await {
            Ok(created) => {
                success_count += 1;
                results.push(json!({"row": i + 1, "status": "success", "studentId": created["studentId"]}));
            }
            Err(e) => {
                fail_count += 1;
                results.push(json!({"row": i + 1, "status": "error", "message": e.to_string()}));
            }
        }
    }

    Ok(Json(json!({
        "success": true,
        "message": format!("{} students imported, {} failed", success_count, fail_count),
        "results": results,
        "successCount": success_count,
        "failCount": fail_count,
    })))
}

pub async fn validate_student(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    state.services.student.validate_student_data(&school_id, payload).await?;
    Ok(Json(json!({"success": true, "message": "Data is valid"})))
}
