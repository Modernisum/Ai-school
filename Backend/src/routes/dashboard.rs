use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;

pub async fn get_dashboard_overview(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    // 1. Fetch school stats (students, employees, classes count)
    let stats = match state.repos.analytics.get_school_stats(&school_id).await {
        Ok(s) => s,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"success": false, "message": format!("Failed to get school stats: {}", e)})),
            ).into_response();
        }
    };

    // 2. Fetch fee summary
    let fee_summary = match state.repos.analytics.get_fee_summary(&school_id).await {
        Ok(fs) => fs,
        Err(_) => json!({
            "totalRevenueExpected": 0.0,
            "totalCollected": 0.0,
            "totalPending": 0.0,
            "totalDiscount": 0.0
        })
    };

    // 3. Fetch attendance summary for today
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let attendance_summary = match state.repos.analytics.get_attendance_summary(&school_id, &today).await {
        Ok(att) => att,
        Err(_) => json!({
            "student": {"present": 0, "absent": 0, "leave": 0, "holiday": 0},
            "employee": {"present": 0, "absent": 0, "leave": 0, "holiday": 0}
        })
    };

    Json(json!({
        "success": true,
        "data": {
            "totalStudents": stats["totalStudents"].as_i64().unwrap_or(0),
            "totalEmployees": stats["totalEmployees"].as_i64().unwrap_or(0),
            "totalClasses": stats["totalClasses"].as_i64().unwrap_or(0),
            "revenue": fee_summary,
            "attendance": attendance_summary
        }
    })).into_response()
}

pub async fn get_dashboard_stats(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    // Return stats like fee collection rate, etc.
    let fee_summary = match state.repos.analytics.get_fee_summary(&school_id).await {
        Ok(fs) => fs,
        Err(_) => json!({
            "totalRevenueExpected": 0.0,
            "totalCollected": 0.0,
            "totalPending": 0.0,
            "totalDiscount": 0.0
        })
    };

    // Get staff analytics breakdown
    let staff_analytics = match state.repos.analytics.query_staff_analytics(&school_id).await {
        Ok(sa) => sa,
        Err(_) => json!([])
    };

    Json(json!({
        "success": true,
        "data": {
            "revenue": fee_summary,
            "staff": staff_analytics
        }
    })).into_response()
}
