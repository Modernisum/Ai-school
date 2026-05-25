use crate::logic::timetable_engine::TimetableEngine;
use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::collections::HashMap;

pub async fn generate_options(
    State(state): State<AppState>,
    Path(class_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let school_id = payload["schoolId"].as_str().unwrap_or("").to_string();
    let class_name = payload["className"].as_str().unwrap_or("").to_string();
    if school_id.is_empty() {
        return (axum::http::StatusCode::BAD_REQUEST, Json(json!({"success": false, "message": "schoolId required in body"}))).into_response();
    }
    let engine = TimetableEngine::new(state.db.pool.clone());
    let periods = payload["periodsPerDay"].as_i64().unwrap_or(8) as usize;
    let days: Vec<usize> = payload["workingDays"].as_array()
        .map(|a| a.iter().filter_map(|v| v.as_i64().map(|v| v as usize)).collect())
        .unwrap_or_else(|| vec![1, 2, 3, 4, 5]);
    let count = payload["optionCount"].as_i64().unwrap_or(4).max(2).min(6) as usize;

    match engine
        .generate_multi_option(
            &school_id, &class_id, &class_name,
            periods, days, vec![], None, None, None, 40, 10, count,
        )
        .await
    {
        Ok(options) => {
            let list: Vec<serde_json::Value> = options.into_iter().map(|(score, tt)| json!({
                "score": score,
                "configId": tt.config_id,
                "classId": tt.class_id,
                "className": tt.class_name,
                "conflictCount": tt.conflicts.len(),
                "hasConflicts": !tt.conflicts.is_empty(),
            })).collect();
            (axum::http::StatusCode::OK, Json(json!({"success": true, "options": list}))).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn issue_box(
    State(state): State<AppState>,
    Path((school_id, config_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let engine = TimetableEngine::new(state.db.pool.clone());
    match engine.validate_issue_box(&school_id, &config_id).await {
        Ok(report) => Json(json!({"success": true, "data": report})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn view_filtered(
    State(state): State<AppState>,
    Path((school_id, config_id)): Path<(String, String)>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let view_type = params.get("type").map(|s| s.as_str()).unwrap_or("global");
    let engine = TimetableEngine::new(state.db.pool.clone());
    match engine.get_timetable(&school_id, &config_id).await {
        Ok(mut data) => {
            if let Some(slots) = data.get_mut("slots").and_then(|s| s.as_array_mut()) {
                match view_type {
                    "teachers" => slots.retain(|s| s.get("teacher_id").and_then(|t| t.as_str()).is_some_and(|t| !t.is_empty())),
                    "non-teachers" => slots.retain(|s| s.get("teacher_id").and_then(|t| t.as_str()).map_or(true, |t| t.is_empty())),
                    _ => {}
                }
            }
            Json(json!({"success": true, "viewType": view_type, "data": data})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn suggest_substitute(
    State(state): State<AppState>,
    Path((school_id, space_id, responsibility_id, day, period)): Path<(String, String, String, usize, usize)>,
) -> impl IntoResponse {
    let engine = TimetableEngine::new(state.db.pool.clone());
    match engine.find_best_substitute(&school_id, &space_id, &responsibility_id, day, period).await {
        Ok(candidates) => {
            let ranked: Vec<serde_json::Value> = candidates.into_iter().enumerate().map(|(i, c)| {
                let mut obj = c.clone();
                obj["rank"] = json!(i + 1);
                obj
            }).collect();
            Json(json!({"success": true, "data": ranked, "totalCandidates": ranked.len()})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}
