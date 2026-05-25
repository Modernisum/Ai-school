use crate::logic::ai::SyllabusPlanner;
use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use sqlx::Row;

pub async fn plot_annual(
    State(state): State<AppState>,
    Path((school_id, responsibility_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let planner = SyllabusPlanner::new(state.repos.clone());
    let academic_year = payload["academicYear"].as_i64().unwrap_or(2026) as i32;
    // We assume class_id (space_id) can be derived from the responsibility or is in payload
    let space_id = payload["spaceId"].as_str().unwrap_or("general");
    match planner
        .annual_syllabus_plot(&school_id, space_id, &responsibility_id, academic_year)
        .await
    {
        Ok(data) => Json(json!(data)).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn micro_plan_periods(
    State(state): State<AppState>,
    Path((school_id, responsibility_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let planner = SyllabusPlanner::new(state.repos.clone());
    let from_date = payload["fromDate"].as_str().unwrap_or("");
    let to_date = payload["toDate"].as_str().unwrap_or("");
    let space_id = payload["spaceId"].as_str().unwrap_or("general");
    match planner
        .micro_plan_period_level(&school_id, space_id, &responsibility_id, from_date, to_date)
        .await
    {
        Ok(data) => Json(json!(data)).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn get_syllabus(
    State(state): State<AppState>,
    Path((school_id, responsibility_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let pool = &state.db.pool;
    let rows = sqlx::query(
        "SELECT sc.*, c.name as chapter_name FROM syllabus_calendar sc \
         JOIN chapters c ON c.id = sc.chapter_id \
         WHERE sc.school_id = $1 AND (sc.subject_id = $2 OR sc.responsibility_id = $2) ORDER BY sc.quarter, sc.planned_start_date"
    )
    .bind(&school_id).bind(&responsibility_id)
    .fetch_all(pool)
    .await;

    match rows {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows.into_iter().map(|r| {
                json!({
                    "id": r.get::<i32, _>("id"),
                    "chapterId": r.get::<i32, _>("chapter_id"),
                    "chapterName": r.get::<String, _>("chapter_name"),
                    "quarter": r.get::<Option<String>, _>("quarter"),
                    "plannedStartDate": r.get::<Option<String>, _>("planned_start_date").map(|d| d.to_string()),
                    "plannedEndDate": r.get::<Option<String>, _>("planned_end_date").map(|d| d.to_string()),
                    "actualStartDate": r.get::<Option<String>, _>("actual_start_date").map(|d| d.to_string()),
                    "actualEndDate": r.get::<Option<String>, _>("actual_end_date").map(|d| d.to_string()),
                    "periodCount": r.get::<Option<i32>, _>("period_count").unwrap_or(0),
                    "status": r.get::<String, _>("status"),
                })
            }).collect();
            Json(json!({"success": true, "data": data})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn update_chapter_plan(
    State(state): State<AppState>,
    Path((school_id, chapter_id)): Path<(String, i32)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let pool = &state.db.pool;
    let status = payload["status"].as_str();
    let actual_start = payload["actualStartDate"].as_str();
    let actual_end = payload["actualEndDate"].as_str();

    let res = sqlx::query(
        "UPDATE syllabus_calendar SET \
         status = COALESCE($1, status), \
         actual_start_date = COALESCE($2::date, actual_start_date), \
         actual_end_date = COALESCE($3::date, actual_end_date) \
         WHERE school_id = $4 AND id = $5"
    )
    .bind(status).bind(actual_start).bind(actual_end)
    .bind(&school_id).bind(chapter_id)
    .execute(pool)
    .await;

    match res {
        Ok(_) => Json(json!({"success": true})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn quarter_report(
    State(state): State<AppState>,
    Path((school_id, quarter)): Path<(String, String)>,
) -> impl IntoResponse {
    let pool = &state.db.pool;
    let rows = sqlx::query(
        "SELECT sc.*, c.name as chapter_name FROM syllabus_calendar sc \
         JOIN chapters c ON c.id = sc.chapter_id \
         WHERE sc.school_id = $1 AND sc.quarter = $2 ORDER BY sc.planned_start_date"
    )
    .bind(&school_id).bind(&quarter)
    .fetch_all(pool)
    .await;

    match rows {
        Ok(rows) => {
            let total = rows.len();
            let completed = rows.iter().filter(|r| r.get::<String, _>("status") == "completed").count();
            let delayed = rows.iter().filter(|r| r.get::<String, _>("status") == "delayed").count();
            let data: Vec<serde_json::Value> = rows.into_iter().map(|r| {
                json!({
                    "id": r.get::<i32, _>("id"),
                    "chapterId": r.get::<i32, _>("chapter_id"),
                    "chapterName": r.get::<String, _>("chapter_name"),
                    "status": r.get::<String, _>("status"),
                    "plannedStartDate": r.get::<Option<String>, _>("planned_start_date").map(|d| d.to_string()),
                    "plannedEndDate": r.get::<Option<String>, _>("planned_end_date").map(|d| d.to_string()),
                })
            }).collect();
            Json(json!({"success": true, "quarter": quarter, "total": total, "completed": completed, "delayed": delayed, "data": data})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
