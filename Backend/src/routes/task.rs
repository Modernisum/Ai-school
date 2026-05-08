use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct TaskFilter {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateTaskStatusPayload {
    pub status: String,
}

pub async fn list_tasks(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(filter): Query<TaskFilter>,
) -> impl IntoResponse {
    match state.services.task.list_tasks(&school_id, filter.start_date.as_deref(), filter.end_date.as_deref()).await {
        Ok(list) => Json(serde_json::json!({"success": true, "data": list})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn update_task_status(
    State(state): State<AppState>,
    Path((school_id, task_id)): Path<(String, String)>,
    Json(payload): Json<UpdateTaskStatusPayload>,
) -> impl IntoResponse {
    match state.services.task.update_task_status(&school_id, &task_id, &payload.status).await {
        Ok(_) => Json(serde_json::json!({"success": true})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
