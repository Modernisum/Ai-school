use crate::AppState;
use axum::{
    extract::{State, Extension},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use crate::routes::api_keys::ApiKeyContext;

/// GET /api/v1/public/students
/// Returns student list for the school associated with the API key.
pub async fn get_students_public(
    State(state): State<AppState>,
    Extension(ctx): Extension<ApiKeyContext>,
) -> impl IntoResponse {
    // Check for scope
    if !ctx.scopes.contains(&"read:students".to_string()) && !ctx.scopes.contains(&"*".to_string()) {
        return (
            axum::http::StatusCode::FORBIDDEN,
            Json(json!({"success": false, "message": "Missing required scope: read:students"})),
        ).into_response();
    }

    match state.services.student.list_students(&ctx.school_id).await {
        Ok(students) => Json(json!({"success": true, "data": students})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// GET /api/v1/public/attendance/:date
pub async fn get_attendance_public(
    State(state): State<AppState>,
    Extension(ctx): Extension<ApiKeyContext>,
    axum::extract::Path(date): axum::extract::Path<String>,
) -> impl IntoResponse {
    if !ctx.scopes.contains(&"read:attendance".to_string()) && !ctx.scopes.contains(&"*".to_string()) {
        return (
            axum::http::StatusCode::FORBIDDEN,
            Json(json!({"success": false, "message": "Missing required scope: read:attendance"})),
        ).into_response();
    }

    use sqlx::Row;
    match sqlx::query(
        "SELECT user_id, role, status, remarks FROM attendance WHERE school_id = $1 AND date = $2"
    )
    .bind(&ctx.school_id)
    .bind(&date)
    .fetch_all(&state.db.pool)
    .await {
        Ok(rows) => {
            let data: Vec<_> = rows.iter().map(|r| {
                json!({
                    "user_id": r.get::<String, _>("user_id"),
                    "role": r.get::<String, _>("role"),
                    "status": r.get::<String, _>("status"),
                    "remarks": r.get::<Option<String>, _>("remarks")
                })
            }).collect();
            Json(json!({"success": true, "date": date, "attendance": data})).into_response()
        },
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}
