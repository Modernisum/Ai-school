use axum::{
    extract::{Path, State},
    Json,
};
use crate::AppState;
use serde_json::json;
use sqlx::Row;
use axum::response::IntoResponse;
use http::StatusCode;

pub async fn get_stats(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let mut conn = match state.db.acquire_tenant_connection(&school_id).await {
        Ok(idx) => idx,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    };

    // 1. Basic Counts
    let student_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM students").fetch_one(&mut *conn).await.unwrap_or(0);
    let employee_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM employees").fetch_one(&mut *conn).await.unwrap_or(0);
    let class_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM classes").fetch_one(&mut *conn).await.unwrap_or(0);
    let subject_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM subjects").fetch_one(&mut *conn).await.unwrap_or(0);

    // 2. Today's Attendance
    let present_today: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM attendance WHERE role = 'student' AND date = CURRENT_DATE AND status = 'present'")
        .fetch_one(&mut *conn).await.unwrap_or(0);
    let attendance_percentage = if student_count > 0 { (present_today as f64 / student_count as f64) * 100.0 } else { 0.0 };

    // 3. Pending Items
    let pending_leaves: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM leave_requests WHERE status = 'pending'")
        .fetch_one(&mut *conn).await.unwrap_or(0);
    let pending_complaints: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM complaints WHERE status = 'pending' OR status = 'Open'")
        .fetch_one(&mut *conn).await.unwrap_or(0);
    let upcoming_events: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM events WHERE start_time > NOW()")
        .fetch_one(&mut *conn).await.unwrap_or(0);

    // 4. Revenue Today & Month
    let revenue_today: f64 = sqlx::query_scalar("SELECT COALESCE(SUM((data->>'payAmount')::FLOAT), 0) FROM audit_logs WHERE target_type = 'fee' AND action = 'payment' AND created_at >= CURRENT_DATE")
        .fetch_one(&mut *conn).await.unwrap_or(0.0);
    
    let revenue_month: f64 = sqlx::query_scalar("SELECT COALESCE(SUM((data->>'payAmount')::FLOAT), 0) FROM audit_logs WHERE target_type = 'fee' AND action = 'payment' AND created_at >= date_trunc('month', CURRENT_DATE)")
        .fetch_one(&mut *conn).await.unwrap_or(0.0);

    // 5. System Health
    let active_sessions: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM tokens WHERE school_id = $1 AND status = 'active' AND expires_at > NOW()")
        .bind(&school_id)
        .fetch_one(&state.db.pool).await.unwrap_or(0); // Querying global pool for sessions

    let storage_used_mb: f64 = sqlx::query_scalar::<_, f64>("SELECT COALESCE(SUM(file_size), 0)::FLOAT / (1024.0 * 1024.0) FROM app_files WHERE school_id = $1")
        .bind(&school_id)
        .fetch_one(&state.db.pool).await.unwrap_or(0.0); // Querying global pool for files

    let ai_queries_today: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM tasks WHERE is_ai_generated = true AND created_at >= CURRENT_DATE")
        .fetch_one(&mut *conn).await.unwrap_or(0);

    Json(json!({
        "success": true,
        "data": {
            "total_students": student_count,
            "total_employees": employee_count,
            "total_classes": class_count,
            "total_subjects": subject_count,
            "attendance_percentage": attendance_percentage,
            "pending_leaves": pending_leaves,
            "pending_complaints": pending_complaints,
            "upcoming_events": upcoming_events,
            "revenue_today": revenue_today,
            "revenue_month": revenue_month,
            "active_sessions": active_sessions,
            "storage_used_mb": storage_used_mb,
            "ai_queries_today": ai_queries_today
        }
    })).into_response()
}

