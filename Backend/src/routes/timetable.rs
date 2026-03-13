use crate::logic::timetable_engine::{SubjectRequirement, TimetableEngine};
use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;

/// Request body for generating a timetable
#[derive(Debug, Deserialize)]
pub struct GenerateTimetableRequest {
    /// Unique class identifier
    pub class_id: String,
    /// Human-readable class name (e.g. "Class 10-A")
    pub class_name: String,
    /// Number of periods per school day (default: 8)
    pub periods_per_day: Option<usize>,
    /// Days of week (1=Mon..7=Sun), default: [1,2,3,4,5]
    pub working_days: Option<Vec<usize>>,
    /// Subject assignments that must be scheduled
    pub requirements: Vec<SubjectRequirement>,
}

/// POST /api/school/:schoolId/timetable/generate
/// Generates an automated timetable for a class using constraint-satisfaction.
pub async fn generate_timetable(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<GenerateTimetableRequest>,
) -> impl IntoResponse {
    let engine = TimetableEngine::new(state.db.pool.clone());

    let periods = payload.periods_per_day.unwrap_or(8);
    let days = payload.working_days.unwrap_or_else(|| vec![1, 2, 3, 4, 5]);

    match engine
        .generate_timetable(
            &school_id,
            &payload.class_id,
            &payload.class_name,
            periods,
            days,
            payload.requirements,
        )
        .await
    {
        Ok(result) => Json(json!({
            "success": true,
            "config_id": result.config_id,
            "class_id": result.class_id,
            "class_name": result.class_name,
            "total_slots": result.slots.len(),
            "slots": result.slots,
            "conflicts": result.conflicts,
            "has_conflicts": !result.conflicts.is_empty(),
        }))
        .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// GET /api/school/:schoolId/timetable/:configId
/// Retrieves a previously generated timetable by config ID.
pub async fn get_timetable(
    State(state): State<AppState>,
    Path((school_id, config_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let engine = TimetableEngine::new(state.db.pool.clone());
    match engine.get_timetable(&school_id, &config_id).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// GET /api/school/:schoolId/timetable
/// Lists all timetable configurations for a school.
pub async fn list_timetables(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let engine = TimetableEngine::new(state.db.pool.clone());
    match engine.list_timetable_configs(&school_id).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// DELETE /api/school/:schoolId/timetable/:configId
/// Deletes a generated timetable.
pub async fn delete_timetable(
    State(state): State<AppState>,
    Path((school_id, config_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match sqlx::query("DELETE FROM timetable_slots WHERE school_id = $1 AND config_id = $2")
        .bind(&school_id)
        .bind(&config_id)
        .execute(&state.db.pool)
        .await
    {
        Ok(_) => Json(json!({"success": true, "message": "Timetable deleted"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
