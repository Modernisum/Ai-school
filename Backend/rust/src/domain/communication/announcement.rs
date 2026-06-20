use crate::AppState;
use axum::{
    extract::{Path, State},
    Json, Extension,
    http::StatusCode,
};
use crate::middleware::rls::TenantContext;
use serde_json::{json, Value};
use crate::error::{AppError, AppResult};

pub async fn create_announcement(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, type_str, user_id)): Path<(String, String, String)>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    let role = payload.get("role").and_then(|v| v.as_str()).unwrap_or("ADMIN");
    
    // Role-based validations
    if role == "TEACHER" {
        let class_id = payload.get("classId").and_then(|v| v.as_str());
        let subject_id = payload.get("subjectId").and_then(|v| v.as_str());
        
        if let (Some(cid), Some(sid)) = (class_id, subject_id) {
            // Get space details
            let space = state.repos.resource.get_space_details(&school_id, cid).await?
                .ok_or_else(|| AppError::Validation(format!("Space '{}' does not exist", cid)))?;
            let class_name = space["spaceName"].as_str().or(space["name"].as_str()).unwrap_or("");

            // Get responsibility details
            let resp = state.services.responsibility.get_responsibility(&school_id, sid).await?
                .ok_or_else(|| AppError::Validation(format!("Responsibility '{}' does not exist", sid)))?;
            let subject_name = resp["name"].as_str().unwrap_or("");

            // Validate responsibility mapping: Teacher must be assigned to this responsibility
            let responsibilities = state.services.responsibility.get_employee_responsibilities(&school_id, &user_id).await?;

            let has_access = responsibilities.iter().any(|r| {
                if let Some(r_id) = r.get("responsibilityId").and_then(|v| v.as_str()) {
                    r_id == sid
                } else {
                    false
                }
            });

            if !has_access {
                return Err(AppError::Forbidden(format!(
                    "Teacher is not mapped to this responsibility: '{} - {}'",
                    subject_name, class_name
                )));
            }
        }
 else {
            return Err(AppError::Validation("classId and subjectId are required for TEACHER announcements".to_string()));
        }
    } else if role != "ADMIN" {
        return Err(AppError::Validation("Invalid role".to_string()));
    }

    // Step 2: Create the announcement
    let data = state
        .services
        .resource
        .create_announcement(&school_id, &tenant_ctx.admin_id, &type_str, &user_id, payload.clone())
        .await?;

    // Step 3: Trigger notifications (Targeted to class students if classId is specified)
    if let Some(title) = payload.get("title").and_then(|v| v.as_str()) {
        if let Some(content) = payload.get("content").and_then(|v| v.as_str()) {
            let class_id = payload.get("classId").and_then(|v| v.as_str());
            let mut is_notification_sent = false;

            if let Some(cid) = class_id {
                if let Ok(Some(space)) = state.repos.resource.get_space_details(&school_id, cid).await {
                    if let Some(class_name) = space["spaceName"].as_str().or(space["name"].as_str()) {
                        if let Ok(students) = state.repos.student.get_students_by_class(&school_id, class_name, None).await {
                            for student in students {
                                if let Some(student_id) = student["studentId"].as_str() {
                                    let _ = state.services.notification.create_notification(
                                        &school_id,
                                        Some(student_id),
                                        "ANNOUNCEMENT",
                                        "INFO",
                                        title,
                                        content,
                                        data.clone()
                                    ).await;
                                }
                            }
                            is_notification_sent = true;
                        }
                    }
                }
            }

            if !notification_sent {
                // Global broadcast if no class targeted or lookup failed
                let _ = state.services.notification.create_notification(
                    &school_id, 
                    None, 
                    "ANNOUNCEMENT", 
                    "INFO", 
                    title, 
                    content, 
                    data.clone()
                ).await;
            }
        }
    }

    Ok(Json(json!({"success": true, "data": data})))
}
