use crate::middleware::rls::TenantContext;
use crate::AppState;
use crate::models::attendance::{
    HolidayQuery, DateQuery, BulkAttendanceRequest, ClassAttendanceQuery, AttendanceQuery,
    StudentReportQuery, ClassReportQuery, EmployeeReportQuery, CustomReportQuery,
    QrAttendanceRequest, MobileAttendanceRequest, OfflineAttendanceRecord, OfflineSyncRequest,
};

use axum::{
    extract::{Path, State, Query},
    response::IntoResponse,
    Extension, Json,
};
use serde::Deserialize;
use serde_json::json;
use crate::error::AppResult;
use qrcode::QrCode;
use image::Luma;
use base64::Engine as _;
use base64::engine::general_purpose::STANDARD;

const VALID_ROLES: &[&str] = &["student", "employee"];

fn validate_role(role: &str) -> AppResult<()> {
    if VALID_ROLES.contains(&role) {
        Ok(())
    } else {
        Err(format!("Invalid role '{}'. Must be 'student' or 'employee'.", role).into())
    }
}

// POST /:schoolId/:role/:userId/present
pub async fn mark_present(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, role, user_id)): Path<(String, String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    validate_role(&role)?;
    let data = state.services.attendance.mark_attendance(&school_id, &role, &user_id, &tenant_ctx.admin_id, payload).await?;
    Ok(Json(json!({"success": true, "message": "Attendance marked present", "data": data})))
}

// POST /:schoolId/:role/:userId/holiday
pub async fn mark_holiday(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, role, user_id)): Path<(String, String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    validate_role(&role)?;
    let data = state.services.attendance.mark_holiday(&school_id, &role, &user_id, &tenant_ctx.admin_id, payload).await?;
    Ok(Json(json!({"success": true, "message": "Holiday posted", "data": data})))
}

// PUT /:schoolId/:role/:userId/:date
pub async fn update_attendance(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, role, user_id, date)): Path<(String, String, String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    validate_role(&role)?;
    let data = state.services.attendance.update_attendance(&school_id, &role, &user_id, &date, &tenant_ctx.admin_id, payload).await?;
    Ok(Json(json!({"success": true, "message": "Attendance updated", "data": data})))
}

// GET /:schoolId/:role/:userId
pub async fn list_attendance(
    State(state): State<AppState>,
    Path((school_id, role, user_id)): Path<(String, String, String)>,
) -> AppResult<impl IntoResponse> {
    validate_role(&role)?;
    let list = state.services.attendance.list_attendance(&school_id, &role, &user_id).await?;
    Ok(Json(json!({"success": true, "data": list})))
}

// DELETE /:schoolId/:role/:userId/:date
pub async fn delete_attendance(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, role, user_id, date)): Path<(String, String, String, String)>,
) -> AppResult<impl IntoResponse> {
    validate_role(&role)?;
    state.services.attendance.delete_attendance(&school_id, &role, &user_id, &date, &tenant_ctx.admin_id).await?;
    Ok(Json(json!({"success": true, "message": "Attendance deleted successfully"})))
}

// GET /:schoolId/student/date/:date — all present student IDs for a given date
pub async fn list_attendance_by_date(
    State(state): State<AppState>,
    Path((school_id, date)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    let ids = state.services.attendance.list_attendance_by_date(&school_id, &date).await?;
    Ok(Json(json!({"success": true, "date": date, "presentIds": ids})))
}

// ─── School-level Holiday CRUD ────────────────────────────────────────────────



pub async fn list_school_holidays(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(q): Query<HolidayQuery>,
) -> AppResult<impl IntoResponse> {
    let data = state.services.attendance.list_school_holidays(&school_id, q.month, q.year).await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn get_holiday_detail(
    State(state): State<AppState>,
    Path((school_id, holiday_id)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    let data = state.services.attendance.get_holiday_detail(&school_id, &holiday_id).await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn create_school_holiday(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let res = state.services.attendance.create_school_holiday(&school_id, payload).await?;
    Ok(Json(json!({"success": true, "data": res})))
}

pub async fn delete_school_holiday(
    State(state): State<AppState>,
    Path((school_id, holiday_id)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    state.services.attendance.delete_school_holiday(&school_id, &holiday_id).await?;
    Ok(Json(json!({"success":true})))
}



pub async fn check_school_holiday(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(q): Query<DateQuery>,
) -> AppResult<impl IntoResponse> {
    let res = state.services.attendance.check_school_holiday(&school_id, &q.date).await?;
    Ok(Json(res))
}

// Bulk attendance operations



// POST /:schoolId/bulk-attendance
pub async fn bulk_mark_attendance(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<BulkAttendanceRequest>,
) -> AppResult<impl IntoResponse> {
    validate_role(&payload.role)?;
    
    let result = state.services.attendance.bulk_mark_attendance(
        &school_id,
        &payload.role,
        &tenant_ctx.admin_id,
        &payload.date,
        payload.class_name.as_deref(),
        payload.attendances,
    ).await?;
    
    Ok(Json(result))
}



// GET /:schoolId/class-attendance
pub async fn get_class_attendance(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(q): Query<ClassAttendanceQuery>,
) -> AppResult<impl IntoResponse> {
    let result = state.services.attendance.get_class_attendance(
        &school_id,
        &q.class_name,
        &q.date,
    ).await?;
    
    Ok(Json(serde_json::json!({
        "success": true,
        "data": result
    })))
}

// ==================== ATTENDANCE REPORT ENDPOINTS ====================



// GET /api/operations/attendance/:schoolId/
pub async fn get_school_attendance(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(q): Query<AttendanceQuery>,
) -> AppResult<impl IntoResponse> {
    let result = state.services.attendance_analytics.get_advanced_attendance_stats(
        &school_id,
        q,
    ).await?;
    
    Ok(Json(json!({
        "success": true,
        "data": result
    })))
}



// GET /:schoolId/reports/student
pub async fn get_student_report(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(q): Query<StudentReportQuery>,
) -> AppResult<impl IntoResponse> {
    let report = state.services.attendance_analytics.get_student_report(
        &school_id,
        &q.student_id,
        &q.start_date,
        &q.end_date,
    ).await?;
    
    Ok(Json(json!({
        "success": true,
        "data": report
    })))
}



// GET /:schoolId/reports/class
pub async fn get_class_report(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(q): Query<ClassReportQuery>,
) -> AppResult<impl IntoResponse> {
    let report = state.services.attendance_analytics.get_class_report(
        &school_id,
        &q.class_name,
        &q.start_date,
        &q.end_date,
    ).await?;
    
    Ok(Json(json!({
        "success": true,
        "data": report
    })))
}



// GET /:schoolId/reports/employee
pub async fn get_employee_report(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(q): Query<EmployeeReportQuery>,
) -> AppResult<impl IntoResponse> {
    // Note: get_employee_report method needs to be implemented in the service
    // For now, we'll return a placeholder response
    Ok(Json(json!({
        "success": true,
        "message": "Employee report endpoint - implementation pending",
        "data": {
            "employee_id": q.employee_id,
            "period": {
                "start_date": q.start_date,
                "end_date": q.end_date
            }
        }
    })))
}



// POST /:schoolId/reports/custom
pub async fn generate_custom_report(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<CustomReportQuery>,
) -> AppResult<impl IntoResponse> {
    let filters = payload.filters.unwrap_or_else(|| json!({}));
    
    // Note: generate_custom_report method needs to be implemented in the service
    // For now, we'll return a placeholder response
    Ok(Json(json!({
        "success": true,
        "message": "Custom report generation endpoint - implementation pending",
        "data": {
            "report_type": payload.report_type,
            "period": {
                "start_date": payload.start_date,
                "end_date": payload.end_date
            },
            "filters": filters
        }
    })))
}

// ==================== MOBILE ATTENDANCE ENDPOINTS ====================



// POST /:schoolId/qr-attendance
pub async fn generate_qr_attendance(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<QrAttendanceRequest>,
) -> AppResult<impl IntoResponse> {
    if payload.school_id != school_id {
        return Err("School ID mismatch".into());
    }

    let result = state.services.attendance.create_qr_token(
        &school_id,
        payload.class_id.as_deref(),
        &tenant_ctx.admin_id,
        payload.expires_in_minutes.unwrap_or(30),
    ).await?;

    // Generate QR code image
    let qr_data = format!("attendance://{}/{}?token={}&expires={}",
        &school_id,
        payload.class_id.clone().unwrap_or_else(|| "default".to_string()),
        result["token"].as_str().unwrap_or(""),
        chrono::DateTime::parse_from_rfc3339(result["expires_at"].as_str().unwrap_or("")).map(|dt| dt.timestamp()).unwrap_or(0)
    );

    let qrcode = QrCode::new(qr_data.as_bytes()).map_err(|e| format!("QR generation failed: {}", e))?;
    let image = qrcode.render::<Luma<u8>>().build();
    let mut png_bytes = std::io::Cursor::new(Vec::new());
    image.write_to(&mut png_bytes, image::ImageFormat::Png).map_err(|e| format!("PNG encoding failed: {}", e))?;
    let base64_image = STANDARD.encode(png_bytes.into_inner());

    Ok(Json(json!({
        "success": true,
        "data": {
            "qr_code": base64_image,
            "token": result["token"],
            "expires_at": result["expires_at"],
            "class_id": payload.class_id,
            "session_id": payload.session_id
        }
    })))
}



// POST /:schoolId/mobile-attendance
pub async fn mobile_mark_attendance(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<MobileAttendanceRequest>,
) -> AppResult<impl IntoResponse> {
    let result = state.services.attendance.verify_qr_and_mark(
        &school_id,
        &payload.token,
        &payload.user_id,
        &payload.role,
        &tenant_ctx.admin_id,
        payload.latitude,
        payload.longitude,
        payload.accuracy,
    ).await?;

    Ok(Json(json!({
        "success": true,
        "message": "Attendance marked successfully via mobile",
        "data": result["data"],
        "location_verified": result["location_verified"],
        "distance_meters": result["distance_meters"]
    })))
}

// ==================== OFFLINE SYNC ENDPOINT ====================






// POST /:schoolId/offline-sync
pub async fn offline_sync_attendance(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<OfflineSyncRequest>,
) -> AppResult<impl IntoResponse> {
    let mut results = Vec::new();
    
    for record in payload.records {
        // Validate role
        if let Err(e) = validate_role(&record.role) {
            results.push(json!({
                "user_id": record.user_id,
                "date": record.date,
                "success": false,
                "error": e.to_string()
            }));
            continue;
        }
        
        // Build attendance payload
        let mut attendance_payload = json!({
            "date": record.date,
            "status": record.status,
        });
        
        if let Some(in_time) = record.in_time {
            attendance_payload["in_time"] = serde_json::Value::String(in_time);
        }
        if let Some(out_time) = record.out_time {
            attendance_payload["out_time"] = serde_json::Value::String(out_time);
        }
        if let Some(reason) = record.reason {
            attendance_payload["reason"] = serde_json::Value::String(reason);
        }
        if let Some(location) = record.location {
            attendance_payload["location"] = location;
        }
        
        // Try to mark attendance
        let result = state.services.attendance.mark_attendance(
            &school_id,
            &record.role,
            &record.user_id,
            &tenant_ctx.admin_id,
            attendance_payload.clone(),
        ).await;
        
        match result {
            Ok(data) => {
                results.push(json!({
                    "user_id": record.user_id,
                    "date": record.date,
                    "success": true,
                    "data": data
                }));
            }
            Err(e) => {
                results.push(json!({
                    "user_id": record.user_id,
                    "date": record.date,
                    "success": false,
                    "error": e.to_string()
                }));
            }
        }
    }
    
    Ok(Json(json!({
        "success": true,
        "message": format!("Processed {} records", results.len()),
        "results": results,
        "device_id": payload.device_id,
        "sync_timestamp": payload.sync_timestamp
    })))
}
