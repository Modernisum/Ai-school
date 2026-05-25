use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use sqlx::Row;
use std::collections::HashMap;

pub async fn get_daily_todo(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let teacher_id = params.get("teacherId").map(|s| s.as_str()).unwrap_or("");
    let date = params.get("date").map(|s| s.as_str()).unwrap_or("");
    if teacher_id.is_empty() || date.is_empty() {
        return (axum::http::StatusCode::BAD_REQUEST, Json(json!({"success": false, "message": "teacherId and date required"}))).into_response();
    }

    let pool = &state.db.pool;
    let rows = sqlx::query(
        "SELECT pp.*, c.name as chapter_name, sc.status as syllabus_status \
         FROM period_plans pp \
         LEFT JOIN chapters c ON c.id = pp.chapter_id \
         LEFT JOIN syllabus_calendar sc ON sc.chapter_id = pp.chapter_id AND sc.school_id = pp.school_id \
         WHERE pp.school_id = $1 AND pp.teacher_id = $2 AND pp.date = $3 \
         ORDER BY pp.period_number"
    )
    .bind(&school_id).bind(teacher_id).bind(date)
    .fetch_all(pool)
    .await;

    match rows {
        Ok(rows) => {
            let plans: Vec<serde_json::Value> = rows.into_iter().map(|r| json!({
                "id": r.get::<i32, _>("id"),
                "periodNumber": r.get::<i32, _>("period_number"),
                "classId": r.get::<String, _>("class_id"),
                "subjectId": r.get::<String, _>("subject_id"),
                "chapterId": r.get::<Option<i32>, _>("chapter_id"),
                "chapterName": r.get::<Option<String>, _>("chapter_name"),
                "topicName": r.get::<Option<String>, _>("topic_name"),
                "status": r.get::<String, _>("status"),
                "teacherNote": r.get::<Option<String>, _>("teacher_note"),
                "syllabusStatus": r.get::<Option<String>, _>("syllabus_status"),
            })).collect();
            Json(json!({"success": true, "date": date, "data": plans})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn get_date_plan(
    State(state): State<AppState>,
    Path((school_id, date)): Path<(String, String)>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut p = params.clone();
    p.insert("date".to_string(), date.clone());
    Box::pin(get_daily_todo(
        State(state),
        Path(school_id.to_string()),
        Query(p),
    ))
    .await
}

pub async fn update_status(
    State(state): State<AppState>,
    Path((school_id, plan_id)): Path<(String, i32)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let pool = &state.db.pool;
    let new_status = payload["status"].as_str().unwrap_or("");
    let teacher_note = payload["teacherNote"].as_str();
    let completed_at = if new_status == "completed" {
        Some(chrono::Utc::now().to_rfc3339())
    } else {
        None
    };

    match sqlx::query(
        "UPDATE period_plans SET status = $1, teacher_note = COALESCE($2, teacher_note), \
         completed_at = COALESCE($3::timestamptz, completed_at) \
         WHERE school_id = $4 AND id = $5"
    )
    .bind(new_status).bind(teacher_note).bind(completed_at)
    .bind(&school_id).bind(plan_id)
    .execute(pool)
    .await
    {
        Ok(_) => Json(json!({"success": true})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn restructure_pending(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let teacher_id = payload["teacherId"].as_str().unwrap_or("");
    let date = payload["date"].as_str().unwrap_or("");
    if teacher_id.is_empty() || date.is_empty() {
        return (axum::http::StatusCode::BAD_REQUEST, Json(json!({"success": false, "message": "teacherId and date required"}))).into_response();
    }

    let planner = crate::logic::ai::SyllabusPlanner::new(state.repos.clone());
    match planner.restructure_syllabus_on_delay(&school_id, teacher_id, date).await {
        Ok(result) => Json(json!(result)).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
