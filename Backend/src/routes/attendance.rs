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
