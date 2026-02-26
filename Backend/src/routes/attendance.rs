use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use chrono::{Datelike, Local};
use serde::Deserialize;
use serde_json::json;
use sqlx::Row;
use uuid::Uuid;

const VALID_ROLES: &[&str] = &["student", "employee"];

fn validate_role(role: &str) -> Result<(), String> {
    if VALID_ROLES.contains(&role) {
        Ok(())
    } else {
        Err(format!("Invalid role '{}'. Must be 'student' or 'employee'.", role))
    }
}

// POST /:schoolId/:role/:userId/present
pub async fn mark_present(
    State(state): State<AppState>,
    Path((school_id, role, user_id)): Path<(String, String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    if let Err(e) = validate_role(&role) {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": e})),
        ).into_response();
    }

    let date = payload["date"]
        .as_str()
        .unwrap_or(&Local::now().format("%Y-%m-%d").to_string())
        .to_string();

    if let Ok(Some(reason)) = is_holiday_check(&state, &school_id, &date, &user_id, &role).await {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": format!("Cannot mark attendance on a holiday: {}", reason)})),
        ).into_response();
    }

    match state
        .services
        .operations
        .mark_attendance(&school_id, &role, &user_id, payload)
        .await
    {
        Ok(data) => Json(json!({"success": true, "message": "Attendance marked present", "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

// POST /:schoolId/:role/:userId/holiday
pub async fn mark_holiday(
    State(state): State<AppState>,
    Path((school_id, role, user_id)): Path<(String, String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    if let Err(e) = validate_role(&role) {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": e})),
        ).into_response();
    }

    let date = payload["date"].as_str().filter(|s| !s.is_empty());
    if let Some(d) = date {
        if let Ok(Some(reason)) = is_holiday_check(&state, &school_id, d, &user_id, &role).await {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(json!({"success": false, "message": format!("This day is already a school-wide holiday: {}", reason)})),
            ).into_response();
        }
    }

    match state
        .services
        .operations
        .mark_holiday(&school_id, &role, &user_id, payload)
        .await
    {
        Ok(data) => Json(json!({"success": true, "message": "Holiday posted", "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

// PUT /:schoolId/:role/:userId/:date
pub async fn update_attendance(
    State(state): State<AppState>,
    Path((school_id, role, user_id, date)): Path<(String, String, String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    if let Err(e) = validate_role(&role) {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": e})),
        ).into_response();
    }

    if let Ok(Some(reason)) = is_holiday_check(&state, &school_id, &date, &user_id, &role).await {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": format!("Cannot modify attendance on a holiday: {}", reason)})),
        ).into_response();
    }

    match state
        .services
        .operations
        .update_attendance(&school_id, &role, &user_id, &date, payload)
        .await
    {
        Ok(data) => Json(json!({"success": true, "message": "Attendance updated", "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

// GET /:schoolId/:role/:userId
pub async fn list_attendance(
    State(state): State<AppState>,
    Path((school_id, role, user_id)): Path<(String, String, String)>,
) -> impl IntoResponse {
    if let Err(e) = validate_role(&role) {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": e})),
        ).into_response();
    }
    match state
        .services
        .operations
        .list_attendance(&school_id, &role, &user_id)
        .await
    {
        Ok(list) => Json(json!({"success": true, "data": list})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

// DELETE /:schoolId/:role/:userId/:date
pub async fn delete_attendance(
    State(state): State<AppState>,
    Path((school_id, role, user_id, date)): Path<(String, String, String, String)>,
) -> impl IntoResponse {
    if let Err(e) = validate_role(&role) {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": e})),
        ).into_response();
    }
    match state
        .services
        .operations
        .delete_attendance(&school_id, &role, &user_id, &date)
        .await
    {
        Ok(()) => Json(json!({"success": true, "message": "Attendance deleted successfully"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

// GET /:schoolId/student/date/:date — all present student IDs for a given date
pub async fn list_attendance_by_date(
    State(state): State<AppState>,
    axum::extract::Path((school_id, date)): axum::extract::Path<(String, String)>,
) -> impl IntoResponse {
    use sqlx::Row;
    match sqlx::query(
        "SELECT user_id FROM attendance WHERE school_id = $1 AND role = 'student' AND date = $2"
    )
    .bind(&school_id)
    .bind(&date)
    .fetch_all(&state.db.pool)
    .await
    {
        Ok(rows) => {
            let ids: Vec<String> = rows
                .into_iter()
                .filter_map(|r| r.try_get::<String, _>("user_id").ok())
                .collect();
            Json(json!({"success": true, "date": date, "presentIds": ids})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

// ─── School-level Holiday CRUD ────────────────────────────────────────────────

// GET /api/operations/attendance/:schoolId/holidays
pub async fn list_school_holidays(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let _ = ensure_holidays_table(&state).await;
    match sqlx::query(
        "SELECT id,title,description,from_date,to_date,classes,exempt_employees,exempt_students,created_at \
         FROM school_holidays WHERE school_id=$1 ORDER BY from_date ASC"
    )
    .bind(&school_id)
    .fetch_all(&state.db.pool)
    .await
    {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows.into_iter().map(|r| json!({
                "id": r.try_get::<String,_>("id").unwrap_or_default(),
                "title": r.try_get::<String,_>("title").unwrap_or_default(),
                "description": r.try_get::<String,_>("description").unwrap_or_default(),
                "fromDate": r.try_get::<String,_>("from_date").unwrap_or_default(),
                "toDate": r.try_get::<String,_>("to_date").unwrap_or_default(),
                "classes": r.try_get::<serde_json::Value,_>("classes").unwrap_or(json!([])),
                "exemptEmployees": r.try_get::<serde_json::Value,_>("exempt_employees").unwrap_or(json!([])),
                "exemptStudents": r.try_get::<serde_json::Value,_>("exempt_students").unwrap_or(json!([])),
                "createdAt": r.try_get::<String,_>("created_at").unwrap_or_default(),
            })).collect();
            Json(json!({"success":true,"data":data})).into_response()
        }
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success":false,"message":e.to_string()}))).into_response(),
    }
}

// POST /api/operations/attendance/:schoolId/holidays
pub async fn create_school_holiday(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let _ = ensure_holidays_table(&state).await;
    let from_date = match payload["fromDate"].as_str().filter(|s| !s.is_empty()) {
        Some(d) => d.to_string(),
        None => return (axum::http::StatusCode::BAD_REQUEST, Json(json!({"success":false,"message":"fromDate required"}))).into_response(),
    };
    let id = Uuid::new_v4().to_string();
    let title = payload["title"].as_str().unwrap_or("Holiday").to_string();
    let description = payload["description"].as_str().unwrap_or("").to_string();
    let to_date = payload["toDate"].as_str().unwrap_or(&from_date).to_string();
    let classes = payload["classes"].clone();
    let exempt_employees = payload["exemptEmployees"].clone();
    let exempt_students = payload["exemptStudents"].clone();
    let created_at = Local::now().format("%Y-%m-%d").to_string();

    match sqlx::query(
        "INSERT INTO school_holidays (id,school_id,title,description,from_date,to_date,classes,exempt_employees,exempt_students,created_at) \
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)"
    )
    .bind(&id).bind(&school_id).bind(&title).bind(&description)
    .bind(&from_date).bind(&to_date).bind(&classes).bind(&exempt_employees).bind(&exempt_students).bind(&created_at)
    .execute(&state.db.pool).await
    {
        Ok(_) => Json(json!({"success":true,"data":{"id":id,"title":title,"fromDate":from_date,"toDate":to_date}})).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success":false,"message":e.to_string()}))).into_response(),
    }
}

// DELETE /api/operations/attendance/:schoolId/holidays/:holidayId
pub async fn delete_school_holiday(
    State(state): State<AppState>,
    Path((school_id, holiday_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match sqlx::query("DELETE FROM school_holidays WHERE id=$1 AND school_id=$2")
        .bind(&holiday_id).bind(&school_id)
        .execute(&state.db.pool).await
    {
        Ok(_) => Json(json!({"success":true})).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success":false,"message":e.to_string()}))).into_response(),
    }
}

// GET /api/operations/attendance/:schoolId/holidays/check?date=YYYY-MM-DD
#[derive(Deserialize)]
pub struct DateQuery { pub date: String }

pub async fn check_school_holiday(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(q): Query<DateQuery>,
) -> impl IntoResponse {
    // Sunday is always a holiday
    if let Ok(d) = chrono::NaiveDate::parse_from_str(&q.date, "%Y-%m-%d") {
        if d.weekday() == chrono::Weekday::Sun {
            return Json(json!({"success":true,"isHoliday":true,"isSunday":true,"reason":"Sunday"})).into_response();
        }
    }
    let _ = ensure_holidays_table(&state).await;
    match sqlx::query(
        "SELECT id,title FROM school_holidays WHERE school_id=$1 AND from_date<=$2 AND to_date>=$2 LIMIT 1"
    )
    .bind(&school_id).bind(&q.date)
    .fetch_optional(&state.db.pool).await
    {
        Ok(Some(r)) => Json(json!({"success":true,"isHoliday":true,"isSunday":false,
            "holidayId": r.try_get::<String,_>("id").unwrap_or_default(),
            "reason": r.try_get::<String,_>("title").unwrap_or_default()})).into_response(),
        Ok(None) => Json(json!({"success":true,"isHoliday":false})).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success":false,"message":e.to_string()}))).into_response(),
    }
}

async fn ensure_holidays_table(state: &AppState) -> Result<(), sqlx::Error> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS school_holidays (
            id TEXT PRIMARY KEY, school_id TEXT NOT NULL,
            title TEXT NOT NULL, description TEXT DEFAULT '',
            from_date TEXT NOT NULL, to_date TEXT NOT NULL,
            classes JSONB DEFAULT '[]',
            exempt_employees JSONB DEFAULT '[]',
            exempt_students JSONB DEFAULT '[]',
            created_at TEXT NOT NULL
        )"
    ).execute(&state.db.pool).await?;
    Ok(())
}

async fn is_holiday_check(
    state: &AppState,
    school_id: &str,
    date: &str,
    user_id: &str,
    role: &str,
) -> Result<Option<String>, sqlx::Error> {
    // 1. Sunday check
    if let Ok(d) = chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d") {
        if d.weekday() == chrono::Weekday::Sun {
            return Ok(Some("Sunday".to_string()));
        }
    }

    // 2. Database check
    let _ = ensure_holidays_table(state).await;
    let row = sqlx::query(
        "SELECT title, exempt_employees, exempt_students FROM school_holidays \
         WHERE school_id = $1 AND from_date <= $2 AND to_date >= $2 LIMIT 1"
    )
    .bind(school_id)
    .bind(date)
    .fetch_optional(&state.db.pool)
    .await?;

    if let Some(r) = row {
        let title: String = r.get("title");
        let exempt_employees: serde_json::Value = r.get("exempt_employees");
        let exempt_students: serde_json::Value = r.get("exempt_students");

        // Check if user_id is in exempt lists based on role
        let is_exempt = if role == "employee" {
            if let Some(arr) = exempt_employees.as_array() {
                arr.iter().any(|v| v.as_str() == Some(user_id))
            } else { false }
        } else if role == "student" {
            if let Some(arr) = exempt_students.as_array() {
                arr.iter().any(|v| v.as_str() == Some(user_id))
            } else { false }
        } else {
            false
        };

        if !is_exempt {
            return Ok(Some(title));
        }
    }

    Ok(None)
}
