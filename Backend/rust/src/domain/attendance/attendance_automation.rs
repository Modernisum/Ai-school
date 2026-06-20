use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;

pub async fn auto_assign_teacher(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let dow = chrono::Utc::now().format("%u").to_string().parse::<i32>().unwrap_or(1);

    match state.repos.attendance.auto_assign_teachers_for_attendance(&school_id, &today, dow).await {
        Ok(assignments) => {
            let unmarked_count = assignments.len();
            Json(json!({"success": true, "date": today, "assignments": assignments, "unmarked_classes": unmarked_count})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}
