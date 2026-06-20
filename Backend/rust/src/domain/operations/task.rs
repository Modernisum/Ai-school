use crate::AppState;
use crate::models::operations::{TaskFilter, UpdateTaskStatusPayload};
use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};

pub async fn list_tasks(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(filter): Query<TaskFilter>,
) -> impl IntoResponse {
    match state.repos.task.get_tasks(&school_id, filter.start_date.as_deref(), filter.end_date.as_deref()).await {
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
    match state.repos.task.update_task_status(&school_id, &task_id, &payload.status).await {
        Ok(_) => Json(serde_json::json!({"success": true})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn ai_generate_tasks(
    State(_state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let employee_id = match payload["employee_id"].as_str() {
        Some(id) if !id.is_empty() => id,
        _ => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"success": false, "message": "employee_id is required"})),
            )
                .into_response()
        }
    };

    match crate::grpc_client::AiClient::connect().await {
        Ok(ai_client) => {
            let payload_str = serde_json::to_string(&payload).unwrap_or_default();
            match ai_client.generate_tasks(&school_id, &payload_str).await {
                Ok(res) => {
                    if res.success {
                        if let Ok(res_json) = serde_json::from_str::<serde_json::Value>(&res.data_json) {
                            return Json(serde_json::json!({"success": true, "data": res_json})).into_response();
                        }
                    }
                    (
                        axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({"success": false, "message": res.error_message})),
                    ).into_response()
                }
                Err(e) => (
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"success": false, "message": e.to_string()})),
                ).into_response()
            }
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "message": format!("Failed to connect to AI backend: {}", e)})),
        ).into_response()
    }
}

pub async fn ai_reorganize_tasks(
    State(_state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let employee_id = match payload["employee_id"].as_str() {
        Some(id) if !id.is_empty() => id,
        _ => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"success": false, "message": "employee_id is required"})),
            )
                .into_response()
        }
    };

    match crate::grpc_client::AiClient::connect().await {
        Ok(ai_client) => {
            let payload_str = serde_json::to_string(&payload).unwrap_or_default();
            match ai_client.reorganize_tasks(&school_id, &payload_str).await {
                Ok(res) => {
                    if res.success {
                        if let Ok(res_json) = serde_json::from_str::<serde_json::Value>(&res.data_json) {
                            return Json(serde_json::json!({"success": true, "data": res_json})).into_response();
                        }
                    }
                    (
                        axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({"success": false, "message": res.error_message})),
                    ).into_response()
                }
                Err(e) => (
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"success": false, "message": e.to_string()})),
                ).into_response()
            }
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "message": format!("Failed to connect to AI backend: {}", e)})),
        ).into_response()
    }
}
