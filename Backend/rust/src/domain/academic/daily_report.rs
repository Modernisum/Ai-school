use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Extension, Json,
};
use crate::middleware::rls::TenantContext;
use serde_json::json;
use sqlx::Row;
use std::collections::HashMap;

pub async fn submit_daily_report(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let pool = &state.db.pool;
    let teacher_id = &tenant_ctx.admin_id;
    let report_date = payload["reportDate"].as_str().unwrap_or("");
    let summary = payload["summary"].as_str().unwrap_or("");
    let completed_periods = payload["completedPeriods"].as_i64().unwrap_or(0) as i32;
    let total_periods = payload["totalPeriods"].as_i64().unwrap_or(0) as i32;
    let pending_topics = &payload["pendingTopics"];

    match sqlx::query(
        "INSERT INTO daily_teacher_reports (school_id, teacher_id, report_date, status, summary, \
         pending_topics, completed_periods, total_periods, submitted_at) \
         VALUES ($1, $2, $3, 'submitted', $4, $5, $6, $7, NOW()) \
         ON CONFLICT (school_id, teacher_id, report_date) DO UPDATE SET \
         status = 'submitted', summary = EXCLUDED.summary, \
         pending_topics = EXCLUDED.pending_topics, \
         completed_periods = EXCLUDED.completed_periods, submitted_at = NOW()"
    )
    .bind(&school_id).bind(teacher_id).bind(report_date)
    .bind(summary).bind(pending_topics).bind(completed_periods).bind(total_periods)
    .execute(pool).await
    {
        Ok(_) => Json(json!({"success": true, "message": "Daily report submitted"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn get_report(
    State(state): State<AppState>,
    Path((school_id, date)): Path<(String, String)>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let pool = &state.db.pool;
    let teacher_id = params.get("teacherId").map(|s| s.as_str()).unwrap_or("");

    match if teacher_id.is_empty() {
        sqlx::query("SELECT * FROM daily_teacher_reports WHERE school_id = $1 AND report_date = $2")
            .bind(&school_id).bind(&date).fetch_all(pool).await
    } else {
        sqlx::query("SELECT * FROM daily_teacher_reports WHERE school_id = $1 AND teacher_id = $2 AND report_date = $3")
            .bind(&school_id).bind(teacher_id).bind(&date).fetch_all(pool).await
    } {
        Ok(rows) => {
            let list: Vec<serde_json::Value> = rows.into_iter().map(|r| json!({
                "id": r.get::<i32, _>("id"),
                "teacherId": r.get::<String, _>("teacher_id"),
                "reportDate": r.get::<Option<String>, _>("report_date").map(|d| d.to_string()),
                "status": r.get::<String, _>("status"),
                "summary": r.get::<Option<String>, _>("summary"),
                "completedPeriods": r.get::<Option<i32>, _>("completed_periods").unwrap_or(0),
                "totalPeriods": r.get::<Option<i32>, _>("total_periods").unwrap_or(0),
            })).collect();
            Json(json!({"success": true, "data": list})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn missed_reports(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let pool = &state.db.pool;
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    match sqlx::query(
        "SELECT pp.teacher_id, COUNT(*) as total_periods \
         FROM period_plans pp \
         LEFT JOIN daily_teacher_reports dtr ON dtr.teacher_id = pp.teacher_id AND dtr.report_date = pp.date \
         WHERE pp.school_id = $1 AND pp.date = $2 AND dtr.id IS NULL \
         GROUP BY pp.teacher_id"
    )
    .bind(&school_id).bind(&today).fetch_all(pool).await
    {
        Ok(rows) => {
            let list: Vec<serde_json::Value> = rows.into_iter().map(|r| json!({
                "teacherId": r.get::<String, _>("teacher_id"),
                "missedPeriods": r.get::<Option<i64>, _>("total_periods").unwrap_or(0),
            })).collect();
            Json(json!({"success": true, "date": today, "data": list, "missedCount": list.len()})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}
