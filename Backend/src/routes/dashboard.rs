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

    // 2. Today's Attendance
    let present_today: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM attendance WHERE role = 'student' AND date = CURRENT_DATE AND status = 'present'")
        .fetch_one(&mut *conn).await.unwrap_or(0);
    let attendance_percentage = if student_count > 0 { (present_today as f64 / student_count as f64) * 100.0 } else { 0.0 };

    // 3. Pending Complaints
    let open_complaints: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM complaints WHERE status = 'pending' OR status = 'Open'")
        .fetch_one(&mut *conn).await.unwrap_or(0);

    // 4. Fees Analytics
    let fee_stats = sqlx::query("SELECT SUM(total_fees) as total, SUM(pending_amount) as pending, SUM(discount) as discount FROM student_fees")
        .fetch_one(&mut *conn).await;
    
    use bigdecimal::{BigDecimal, Zero};
    let (total_revenue, pending_revenue, discount_revenue) = match fee_stats {
        Ok(r) => {
            let t: BigDecimal = r.get::<Option<BigDecimal>, _>("total").unwrap_or_else(BigDecimal::zero);
            let p: BigDecimal = r.get::<Option<BigDecimal>, _>("pending").unwrap_or_else(BigDecimal::zero);
            let d: BigDecimal = r.get::<Option<BigDecimal>, _>("discount").unwrap_or_else(BigDecimal::zero);
            (t, p, d)
        },
        Err(_) => (BigDecimal::zero(), BigDecimal::zero(), BigDecimal::zero())
    };

    // 5. Tasks & Detailed Risks
    let active_tasks: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM tasks WHERE status != 'completed'")
        .fetch_one(&mut *conn).await.unwrap_or(0);
    
    let high_risk_rows = sqlx::query(
        "SELECT s.name, p.risk_score, p.risk_factors 
         FROM student_risk_profiles p
         JOIN students s ON p.student_id = s.student_id AND p.school_id = s.school_id
         WHERE p.risk_score > 70
         ORDER BY p.risk_score DESC
         LIMIT 5"
    )
    .fetch_all(&mut *conn)
    .await;

    let high_risk_students = match &high_risk_rows {
        Ok(rows) => rows.len() as i64,
        Err(_) => 0
    };

    let detailed_risks: Vec<serde_json::Value> = match high_risk_rows {
        Ok(rows) => rows.into_iter().map(|r| {
            json!({
                "name": r.get::<String, _>("name"),
                "score": r.get::<i32, _>("risk_score"),
                "factors": r.get::<serde_json::Value, _>("risk_factors")
            })
        }).collect(),
        Err(_) => vec![]
    };

    Json(json!({
        "success": true,
        "data": {
            "counts": {
                "totalStudents": student_count,
                "totalEmployees": employee_count,
                "totalClasses": class_count,
                "openComplaints": open_complaints,
                "activeTasks": active_tasks,
                "highRiskStudents": high_risk_students,
                "detailedRisks": detailed_risks
            },
            "attendance": {
                "presentToday": present_today,
                "percentage": attendance_percentage
            },
            "revenue": {
                "total": total_revenue.to_string(),
                "paid": (&total_revenue - &pending_revenue).to_string(),
                "pending": pending_revenue.to_string(),
                "discount": discount_revenue.to_string()
            }
        }
    })).into_response()
}
