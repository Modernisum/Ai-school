use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use sqlx::Row;

pub async fn auto_assign_teacher(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let dow = chrono::Utc::now().format("%u").to_string().parse::<i32>().unwrap_or(1);

    // Find classes that have NO attendance marked today
    let classes = sqlx::query(
        "SELECT DISTINCT c.id, c.name FROM classes c \
         WHERE c.school_id = $1 \
         AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.school_id = c.school_id \
            AND a.date = $2::date AND a.role = 'student' \
            AND a.user_id IN (SELECT student_id FROM students WHERE class_name = c.name AND school_id = c.school_id))"
    )
    .bind(&school_id).bind(&today)
    .fetch_all(&state.db.pool)
    .await;

    let mut assignments = Vec::new();

    match classes {
        Ok(rows) => {
            for row in &rows {
                let class_id: String = row.get("id");
                let class_name: String = row.get("name");

                // Find first period teacher from timetable
                let teacher = sqlx::query(
                    "SELECT ts.teacher_id FROM timetable_slots ts \
                     JOIN timetable_configs tc ON tc.config_id = ts.config_id AND tc.school_id = ts.school_id \
                     WHERE ts.school_id = $1 AND ts.class_id = $2 AND ts.day_of_week = $3 \
                     AND ts.period_number = 1 AND tc.status = 'APPROVED' \
                     AND ts.teacher_id IS NOT NULL AND ts.teacher_id != '' \
                     LIMIT 1"
                )
                .bind(&school_id).bind(&class_id).bind(dow)
                .fetch_optional(&state.db.pool)
                .await;

                if let Ok(Some(trow)) = teacher {
                    let teacher_id: String = trow.get("teacher_id");
                    assignments.push(json!({
                        "classId": class_id,
                        "className": class_name,
                        "teacherId": teacher_id,
                        "status": "assigned"
                    }));
                } else {
                    assignments.push(json!({
                        "classId": class_id,
                        "className": class_name,
                        "teacherId": null,
                        "status": "no_teacher_found"
                    }));
                }
            }
            Json(json!({"success": true, "date": today, "assignments": assignments, "unmarked_classes": rows.len()})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}
