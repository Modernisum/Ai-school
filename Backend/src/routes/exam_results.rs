use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use sqlx::Row;

pub async fn get_student_results(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let pool = &state.db.pool;

    let rows = sqlx::query(
        "SELECT e.id as exam_id, e.name as exam_name, e.quarter, es.subject_id, es.class_id,
                ss.submission_id, ss.status as submission_status,
                agr.overall_score, agr.grade, agr.feedback, agr.teacher_adjusted_score,
                agr.is_finalized, agr.strictness_used
         FROM exams e
         JOIN exam_sections es ON e.id = es.exam_id AND es.school_id = e.school_id
         JOIN student_submissions ss ON ss.exam_id = e.id::text AND ss.school_id = e.school_id
         LEFT JOIN ai_grading_results agr ON ss.submission_id = agr.submission_id
         WHERE e.school_id = $1 AND ss.student_id = $2 AND e.results_published = TRUE
         ORDER BY e.end_date DESC NULLS LAST"
    )
    .bind(&school_id)
    .bind(&student_id)
    .fetch_all(pool)
    .await;

    match rows {
        Ok(rows) => {
            let results: Vec<serde_json::Value> = rows.into_iter().map(|r| {
                json!({
                    "examId": r.get::<i32, _>("exam_id"),
                    "examName": r.get::<String, _>("exam_name"),
                    "quarter": r.get::<Option<String>, _>("quarter"),
                    "subjectId": r.get::<Option<String>, _>("subject_id"),
                    "classId": r.get::<Option<String>, _>("class_id"),
                    "submissionId": r.get::<uuid::Uuid, _>("submission_id").to_string(),
                    "overallScore": r.get::<Option<bigdecimal::BigDecimal>, _>("overall_score").map(|d| d.to_string()),
                    "teacherAdjustedScore": r.get::<Option<bigdecimal::BigDecimal>, _>("teacher_adjusted_score").map(|d| d.to_string()),
                    "grade": r.get::<Option<String>, _>("grade"),
                    "feedback": r.get::<Option<String>, _>("feedback"),
                    "isFinalized": r.get::<Option<bool>, _>("is_finalized").unwrap_or(false),
                    "strictnessUsed": r.get::<Option<String>, _>("strictness_used"),
                })
            }).collect();
            Json(json!({"success": true, "data": results})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
