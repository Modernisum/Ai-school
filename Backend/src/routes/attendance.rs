use crate::middleware::rls::TenantContext;
use crate::AppState;

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

#[derive(Deserialize)]
pub struct HolidayQuery {
    pub month: Option<i32>,
    pub year: Option<i32>,
}

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

#[derive(Deserialize)]
pub struct DateQuery {
    pub date: String,
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

#[derive(Deserialize)]
pub struct BulkAttendanceRequest {
    pub date: String,
    pub role: String,
    pub class_name: Option<String>,
    pub attendances: Vec<serde_json::Value>,
}

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

#[derive(Deserialize)]
pub struct ClassAttendanceQuery {
    pub class_name: String,
    pub date: String,
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

#[derive(Deserialize, Debug)]
pub struct AttendanceQuery {
    pub date: Option<String>,
    pub period: Option<String>, // day, week, month, year
    pub incoming_after: Option<String>,
    pub outgoing_before: Option<String>,
    pub user_type: Option<String>,
    pub class_name: Option<String>,
    pub space_name: Option<String>,
    pub user_ids: Option<String>, // comma separated
    pub fields: Option<String>,   // comma separated fields to return (e.g., "user_id,name,image_url")
}

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

#[derive(Deserialize)]
pub struct StudentReportQuery {
    pub student_id: String,
    pub start_date: String,
    pub end_date: String,
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

#[derive(Deserialize)]
pub struct ClassReportQuery {
    pub class_name: String,
    pub start_date: String,
    pub end_date: String,
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

#[derive(Deserialize)]
pub struct EmployeeReportQuery {
    pub employee_id: String,
    pub start_date: String,
    pub end_date: String,
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

#[derive(Deserialize)]
pub struct CustomReportQuery {
    pub report_type: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default)]
    pub filters: Option<serde_json::Value>,
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

#[derive(Deserialize)]
pub struct QrAttendanceRequest {
    pub school_id: String,
    pub class_id: Option<String>,
    pub session_id: Option<String>,
    pub expires_in_minutes: Option<u32>,
}

// POST /:schoolId/qr-attendance
pub async fn generate_qr_attendance(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<QrAttendanceRequest>,
) -> AppResult<impl IntoResponse> {
    // Validate school_id matches path
    if payload.school_id != school_id {
        return Err("School ID mismatch".into());
    }
    
    // Generate a unique token for this attendance session
    let token = uuid::Uuid::new_v4().to_string();
    let expires_in = payload.expires_in_minutes.unwrap_or(30);
    let expires_at = chrono::Utc::now() + chrono::Duration::minutes(expires_in as i64);

    // Persist the token to database
    let _ = sqlx::query(
        "INSERT INTO attendance_qr_tokens (school_id, class_id, token, expires_at, created_by) VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(&school_id).bind(&payload.class_id).bind(&token).bind(expires_at)
    .bind(&tenant_ctx.admin_id)
    .execute(&state.db.pool).await;
    
    // Create QR code data
    let qr_data = format!("attendance://{}/{}?token={}&expires={}",
        &school_id,
        payload.class_id.clone().unwrap_or_else(|| "default".to_string()),
        token,
        expires_at.timestamp()
    );
    
    // Generate QR code
    let qrcode = QrCode::new(qr_data.as_bytes()).map_err(|e| format!("QR generation failed: {}", e))?;
    let image = qrcode.render::<Luma<u8>>().build();
    
    // Convert to PNG bytes
    let mut png_bytes = std::io::Cursor::new(Vec::new());
    image.write_to(&mut png_bytes, image::ImageFormat::Png)
        .map_err(|e| format!("PNG encoding failed: {}", e))?;
    
    // Encode as base64
    let base64_image = STANDARD.encode(png_bytes.into_inner());
    
    Ok(Json(json!({
        "success": true,
        "data": {
            "qr_code": base64_image,
            "token": token,
            "expires_at": expires_at.to_rfc3339(),
            "class_id": payload.class_id,
            "session_id": payload.session_id
        }
    })))
}

#[derive(Deserialize)]
pub struct MobileAttendanceRequest {
    pub token: String,
    pub user_id: String,
    pub role: String,
    pub latitude: f64,
    pub longitude: f64,
    pub device_id: Option<String>,
    pub accuracy: Option<f64>,
}

// POST /:schoolId/mobile-attendance
pub async fn mobile_mark_attendance(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<MobileAttendanceRequest>,
) -> AppResult<impl IntoResponse> {
    // Validate token against stored QR tokens
    let token_valid = sqlx::query(
        "SELECT id FROM attendance_qr_tokens WHERE token = $1 AND school_id = $2 AND is_used = FALSE AND expires_at > NOW()"
    )
    .bind(&payload.token).bind(&school_id)
    .fetch_optional(&state.db.pool)
    .await
    .map_err(|_| "Database error".to_string())?;

    if token_valid.is_none() {
        return Err("Invalid, expired or already used token".into());
    }

    // Mark token as used
    let _ = sqlx::query(
        "UPDATE attendance_qr_tokens SET is_used = TRUE, used_by = $1, used_at = NOW() WHERE token = $2"
    )
    .bind(&payload.user_id).bind(&payload.token)
    .execute(&state.db.pool).await;

    // GPS location verification — read from school config
    let config_row = sqlx::query(
        "SELECT data FROM system_config WHERE key = 'school_location' LIMIT 1"
    )
    .fetch_optional(&state.db.pool)
    .await
    .map_err(|_| "Config read error".to_string())?;

    let (school_lat, school_lon) = if let Some(row) = config_row {
        let data: serde_json::Value = sqlx::Row::get(&row, "data");
        (data["latitude"].as_f64().unwrap_or(0.0), data["longitude"].as_f64().unwrap_or(0.0))
    } else {
        (0.0, 0.0)
    };

    let max_distance_meters = 500.0;
    
    let distance = haversine_distance(
        payload.latitude, payload.longitude,
        school_lat, school_lon
    );
    
    if distance > max_distance_meters {
        return Err(format!("Location verification failed. You are {} meters away from the school (max {} meters).", distance, max_distance_meters).into());
    }
    
    // Mark attendance using existing service
    let attendance_payload = json!({
        "date": chrono::Utc::now().format("%Y-%m-%d").to_string(),
        "in_time": chrono::Utc::now().format("%H:%M").to_string(),
        "status": "present",
        "reason": "Mobile attendance via QR code",
        "location": {
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "accuracy": payload.accuracy
        }
    });
    
    let data = state.services.attendance.mark_attendance(
        &school_id,
        &payload.role,
        &payload.user_id,
        &tenant_ctx.admin_id,
        attendance_payload,
    ).await?;
    
    Ok(Json(json!({
        "success": true,
        "message": "Attendance marked successfully via mobile",
        "data": data,
        "location_verified": true,
        "distance_meters": distance
    })))
}

// Haversine distance calculation (in meters)
fn haversine_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let r = 6371000.0; // Earth radius in meters
    let phi1 = lat1.to_radians();
    let phi2 = lat2.to_radians();
    let delta_phi = (lat2 - lat1).to_radians();
    let delta_lambda = (lon2 - lon1).to_radians();
    
    let a = (delta_phi / 2.0).sin().powi(2) +
            phi1.cos() * phi2.cos() * (delta_lambda / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    
    r * c
}

// ==================== OFFLINE SYNC ENDPOINT ====================

#[derive(Deserialize)]
pub struct OfflineAttendanceRecord {
    pub user_id: String,
    pub role: String,
    pub date: String,
    pub status: String,
    pub in_time: Option<String>,
    pub out_time: Option<String>,
    pub reason: Option<String>,
    pub location: Option<serde_json::Value>,
    pub device_id: Option<String>,
    pub sync_timestamp: Option<i64>,
}

#[derive(Deserialize)]
pub struct OfflineSyncRequest {
    pub records: Vec<OfflineAttendanceRecord>,
    pub device_id: String,
    pub sync_timestamp: i64,
}

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
