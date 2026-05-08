use crate::routes::api_keys::ApiKeyContext;
use crate::AppState;
use axum::{
    extract::{Extension, Path, Query, State},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;

/* ════════════ SCOPE HELPER ════════════ */

fn has_scope(scopes: &[String], required: &str) -> bool {
    scopes.contains(&required.to_string()) || scopes.contains(&"*".to_string())
}

/* ════════════ QUERY PARAMS ════════════ */

#[derive(Deserialize)]
pub struct StudentSearchParams {
    pub search: Option<String>,
    pub class_name: Option<String>,
    pub section: Option<String>,
    pub status: Option<String>,
    pub page: Option<i32>,
    pub limit: Option<i32>,
}

#[derive(Deserialize)]
pub struct EmployeeSearchParams {
    pub search: Option<String>,
    pub employee_type: Option<String>,
}

/* ════════════ STUDENT ENDPOINTS ════════════ */

/// GET /public/students
/// Returns all students for the school associated with the API key.
pub async fn get_students_public(
    State(state): State<AppState>,
    Extension(ctx): Extension<ApiKeyContext>,
) -> impl IntoResponse {
    if !has_scope(&ctx.scopes, "read:students") {
        return (
            axum::http::StatusCode::FORBIDDEN,
            Json(json!({"success": false, "message": "Missing required scope: read:students"})),
        )
            .into_response();
    }

    match state.services.student.list_students(&ctx.school_id).await {
        Ok(students) => Json(json!({"success": true, "data": students})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// GET /public/students/search
/// Search/filter students with pagination.
pub async fn search_students_public(
    State(state): State<AppState>,
    Extension(ctx): Extension<ApiKeyContext>,
    Query(q): Query<StudentSearchParams>,
) -> impl IntoResponse {
    if !has_scope(&ctx.scopes, "read:students") {
        return (
            axum::http::StatusCode::FORBIDDEN,
            Json(json!({"success": false, "message": "Missing required scope: read:students"})),
        )
            .into_response();
    }

    let page = q.page.unwrap_or(1).max(1);
    let limit = q.limit.unwrap_or(20).max(1).min(100);

    match state
        .services
        .student
        .list_students_paginated(
            &ctx.school_id,
            page,
            limit,
            q.class_name.as_deref(),
            q.section.as_deref(),
            q.status.as_deref(),
            q.search.as_deref(),
        )
        .await
    {
        Ok((students, total_count)) => {
            let total_pages = ((total_count as f64) / (limit as f64)).ceil() as i64;
            Json(json!({
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
            }))
            .into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// GET /public/students/:studentId
/// Get a single student by ID.
pub async fn get_student_public(
    State(state): State<AppState>,
    Extension(ctx): Extension<ApiKeyContext>,
    Path(student_id): Path<String>,
) -> impl IntoResponse {
    if !has_scope(&ctx.scopes, "read:students") {
        return (
            axum::http::StatusCode::FORBIDDEN,
            Json(json!({"success": false, "message": "Missing required scope: read:students"})),
        )
            .into_response();
    }

    if student_id.trim().is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "student_id cannot be empty"})),
        )
            .into_response();
    }

    match state
        .services
        .student
        .get_student(&ctx.school_id, &student_id)
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

/* ════════════ EMPLOYEE ENDPOINTS ════════════ */

/// GET /public/employees
/// Returns all employees for the school associated with the API key.
pub async fn get_employees_public(
    State(state): State<AppState>,
    Extension(ctx): Extension<ApiKeyContext>,
) -> impl IntoResponse {
    if !has_scope(&ctx.scopes, "read:employees") {
        return (
            axum::http::StatusCode::FORBIDDEN,
            Json(json!({"success": false, "message": "Missing required scope: read:employees"})),
        )
            .into_response();
    }

    match state.services.employee.list_employees(&ctx.school_id).await {
        Ok(employees) => Json(json!({"success": true, "data": employees})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// GET /public/employees/search
/// Search/filter employees.
pub async fn search_employees_public(
    State(state): State<AppState>,
    Extension(ctx): Extension<ApiKeyContext>,
    Query(q): Query<EmployeeSearchParams>,
) -> impl IntoResponse {
    if !has_scope(&ctx.scopes, "read:employees") {
        return (
            axum::http::StatusCode::FORBIDDEN,
            Json(json!({"success": false, "message": "Missing required scope: read:employees"})),
        )
            .into_response();
    }

    // Fetch all employees then filter in-memory since there's no paginated employee endpoint
    match state.services.employee.list_employees(&ctx.school_id).await {
        Ok(employees) => {
            let mut filtered = employees;

            // Filter by search term (name, phone, employee_id)
            if let Some(ref search) = q.search {
                let pattern = search.to_lowercase();
                filtered = filtered
                    .into_iter()
                    .filter(|e| {
                        let name_match = e
                            .get("name")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_lowercase().contains(&pattern))
                            .unwrap_or(false);
                        let phone_match = e
                            .get("phone")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_lowercase().contains(&pattern))
                            .unwrap_or(false);
                        let id_match = e
                            .get("employeeId")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_lowercase().contains(&pattern))
                            .unwrap_or(false);
                        name_match || phone_match || id_match
                    })
                    .collect();
            }

            // Filter by employee type
            if let Some(ref emp_type) = q.employee_type {
                let pattern = emp_type.to_lowercase();
                filtered = filtered
                    .into_iter()
                    .filter(|e| {
                        e.get("employeeType")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_lowercase() == pattern)
                            .unwrap_or(false)
                    })
                    .collect();
            }

            Json(json!({"success": true, "data": filtered, "total": filtered.len()}))
                .into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// GET /public/employees/:employeeId
/// Get a single employee by ID.
pub async fn get_employee_public(
    State(state): State<AppState>,
    Extension(ctx): Extension<ApiKeyContext>,
    Path(employee_id): Path<String>,
) -> impl IntoResponse {
    if !has_scope(&ctx.scopes, "read:employees") {
        return (
            axum::http::StatusCode::FORBIDDEN,
            Json(json!({"success": false, "message": "Missing required scope: read:employees"})),
        )
            .into_response();
    }

    if employee_id.trim().is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "employee_id cannot be empty"})),
        )
            .into_response();
    }

    match state
        .services
        .employee
        .get_employee(&ctx.school_id, &employee_id)
        .await
    {
        Ok(Some(employee)) => Json(json!({"success": true, "data": employee})).into_response(),
        Ok(None) => (
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({"success": false, "message": "Employee not found"})),
        )
            .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/* ════════════ CLASSES ENDPOINT ════════════ */

/// GET /public/classes
/// List all classes for the school.
pub async fn get_classes_public(
    State(state): State<AppState>,
    Extension(ctx): Extension<ApiKeyContext>,
) -> impl IntoResponse {
    if !has_scope(&ctx.scopes, "read:students") {
        return (
            axum::http::StatusCode::FORBIDDEN,
            Json(json!({"success": false, "message": "Missing required scope: read:students"})),
        )
            .into_response();
    }

    match state.repos.academic.get_classes(&ctx.school_id).await {
        Ok(classes) => Json(json!({"success": true, "data": classes})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/* ════════════ ATTENDANCE ENDPOINT ════════════ */

/// GET /public/attendance/:date
pub async fn get_attendance_public(
    State(state): State<AppState>,
    Extension(ctx): Extension<ApiKeyContext>,
    axum::extract::Path(date): axum::extract::Path<String>,
) -> impl IntoResponse {
    if !has_scope(&ctx.scopes, "read:attendance") {
        return (
            axum::http::StatusCode::FORBIDDEN,
            Json(json!({"success": false, "message": "Missing required scope: read:attendance"})),
        )
            .into_response();
    }

    use sqlx::Row;
    match sqlx::query(
        "SELECT user_id, role, status, reason FROM attendance WHERE school_id = $1 AND date = $2",
    )
    .bind(&ctx.school_id)
    .bind(&date)
    .fetch_all(&state.db.pool)
    .await
    {
        Ok(rows) => {
            let data: Vec<_> = rows
                .iter()
                .map(|r| {
                    json!({
                        "user_id": r.get::<String, _>("user_id"),
                        "role": r.get::<String, _>("role"),
                        "status": r.get::<String, _>("status"),
                        "reason": r.get::<Option<String>, _>("reason")
                    })
                })
                .collect();
            Json(json!({"success": true, "date": date, "attendance": data})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
