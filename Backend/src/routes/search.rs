use crate::AppState;
use axum::{
    extract::{Query, State},
    response::IntoResponse,
    Json,
};
use sqlx::Row;
use serde::Deserialize;
use serde_json::json;

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: String,
    pub school_id: Option<String>,
}

pub async fn global_search(
    State(state): State<AppState>,
    Query(params): Query<SearchQuery>,
) -> impl IntoResponse {
    let query = format!("%{}%", params.q.to_lowercase());
    
    let mut results = Vec::new();

    // 1. Search Schools (Global for Super Admin, or specific)
    let school_results = if let Some(sid) = &params.school_id {
        sqlx::query("SELECT school_id, school_name FROM schools WHERE school_id = $1 AND (LOWER(school_name) LIKE $2 OR LOWER(school_id) LIKE $2)")
            .bind(sid)
            .bind(&query)
            .fetch_all(&state.db.pool).await
    } else {
        sqlx::query("SELECT school_id, school_name FROM schools WHERE (LOWER(school_name) LIKE $1 OR LOWER(school_id) LIKE $1) LIMIT 5")
            .bind(&query)
            .fetch_all(&state.db.pool).await
    };

    if let Ok(schools) = school_results {
        for s in schools {
            results.push(json!({
                "type": "school",
                "id": s.get::<String, _>("school_id"),
                "title": s.get::<String, _>("school_name"),
                "subtitle": format!("School ID: {}", s.get::<String, _>("school_id")),
                "url": format!("/admin/schools/{}", s.get::<String, _>("school_id"))
            }));
        }
    }

    // 2. Search Students (Requires school_id)
    if let Some(sid) = &params.school_id {
        let students = sqlx::query(
            "SELECT student_id, name, class_name FROM students WHERE school_id = $1 AND (LOWER(name) LIKE $2 OR LOWER(student_id) LIKE $2) LIMIT 10"
        )
        .bind(sid)
        .bind(&query)
        .fetch_all(&state.db.pool).await;

        if let Ok(students) = students {
            for s in students {
                results.push(json!({
                    "type": "student",
                    "id": s.get::<String, _>("student_id"),
                    "title": s.get::<Option<String>, _>("name").unwrap_or_default(),
                    "subtitle": format!("Class: {} | ID: {}", s.get::<String, _>("class_name"), s.get::<String, _>("student_id")),
                    "url": format!("/dashboard/student-profile/{}", s.get::<String, _>("student_id"))
                }));
            }
        }

        // 3. Search Employees
        let employees = sqlx::query(
            "SELECT employee_id, data->>'name' as name, employee_type FROM employees WHERE school_id = $1 AND (LOWER(data->>'name') LIKE $2 OR LOWER(employee_id) LIKE $2) LIMIT 10"
        )
        .bind(sid)
        .bind(&query)
        .fetch_all(&state.db.pool).await;

        if let Ok(employees) = employees {
            for e in employees {
                results.push(json!({
                    "type": "employee",
                    "id": e.get::<String, _>("employee_id"),
                    "title": e.get::<Option<String>, _>("name").unwrap_or_default(),
                    "subtitle": format!("Role: {} | ID: {}", e.get::<String, _>("employee_type"), e.get::<String, _>("employee_id")),
                    "url": format!("/dashboard/employeeprofile/{}", e.get::<String, _>("employee_id"))
                }));
            }
        }
    }

    Json(json!({ "success": true, "data": results }))
}
