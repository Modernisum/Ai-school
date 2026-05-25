use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde_json::json;

/// POST /api/ai/:schoolId/query — Send a query to the AI
pub async fn query_ai(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let query = payload["query"].as_str().unwrap_or("");
    if query.is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "Query cannot be empty"})),
        )
            .into_response();
    }

    match state.services.ai.post_query(&school_id, payload).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// POST /api/ai/:schoolId/tasks/generate — Generate weekly tasks for an employee
pub async fn ai_generate_tasks(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let employee_id = match payload["employee_id"].as_str() {
        Some(id) if !id.is_empty() => id,
        _ => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(json!({"success": false, "message": "employee_id is required"})),
            )
                .into_response()
        }
    };

    match state.services.ai.generate_employee_tasks(&school_id, employee_id).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// POST /api/ai/:schoolId/tasks/reorganize — Reorganize pending AI tasks
pub async fn ai_reorganize_tasks(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let employee_id = match payload["employee_id"].as_str() {
        Some(id) if !id.is_empty() => id,
        _ => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(json!({"success": false, "message": "employee_id is required"})),
            )
                .into_response()
        }
    };

    match state.services.ai.reorganize_tasks(&school_id, employee_id).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// POST /api/ai/:schoolId/exam/generate — Generate exam questions
pub async fn ai_generate_exam(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state.services.ai.generate_exam_questions(&school_id, &payload).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

// ── AI Configuration Routes ─────────────────────────────────────────────

/// GET /api/ai/config/:schoolId — Get school AI configuration
pub async fn get_ai_config(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.ai_config.get_school_ai_config(&school_id).await {
        Ok(config) => Json(json!({"success": true, "data": config})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// PUT /api/ai/config/:schoolId — Update school AI configuration
pub async fn update_ai_config(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state.services.ai_config.update_school_ai_config(&school_id, payload).await {
        Ok(config) => Json(json!({"success": true, "data": config})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// DELETE /api/ai/config/:schoolId/:providerId — Delete school AI config
pub async fn delete_ai_config(
    State(state): State<AppState>,
    Path((school_id, provider_id)): Path<(String, i32)>,
) -> impl IntoResponse {
    match state.services.ai_config.delete_school_ai_config(&school_id, provider_id).await {
        Ok(deleted) => Json(json!({"success": true, "deleted": deleted})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

// ── AI Health & Stats Routes ─────────────────────────────────────────────

/// GET /api/ai/health/:schoolId — Check AI provider health for a school
pub async fn ai_health_check(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.embedding.get_provider_health(&school_id).await {
        Ok(health) => Json(json!({"success": true, "data": health})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// POST /api/ai/embedding/:schoolId — Generate embedding for text
pub async fn generate_embedding(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let text = match payload["text"].as_str() {
        Some(t) if !t.is_empty() => t,
        _ => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(json!({"success": false, "message": "text is required"})),
            )
                .into_response()
        }
    };

    match state.services.embedding.generate_embedding(&school_id, text).await {
        Ok(embedding) => Json(json!({"success": true, "data": embedding})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// POST /api/ai/embedding/:schoolId/search — Search documents by embedding
pub async fn search_documents(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let query = match payload["query"].as_str() {
        Some(q) if !q.is_empty() => q,
        _ => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(json!({"success": false, "message": "query is required"})),
            )
                .into_response()
        }
    };
    let limit = payload["limit"].as_u64().unwrap_or(5) as usize;

    match state.services.embedding.search_similar_documents(&school_id, query, limit).await {
        Ok(results) => Json(json!({"success": true, "data": results})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

// ── Router ───────────────────────────────────────────────────────────────

pub fn ai_routes() -> Router<AppState> {
    Router::new()
        // Query & generation endpoints
        .route("/:schoolId/query", post(query_ai))
        .route("/:schoolId/tasks/generate", post(ai_generate_tasks))
        .route("/:schoolId/tasks/reorganize", post(ai_reorganize_tasks))
        .route("/:schoolId/exam/generate", post(ai_generate_exam))
        // Config endpoints
        .route("/config/:schoolId", get(get_ai_config))
        .route("/config/:schoolId", put(update_ai_config))
        .route("/config/:schoolId/:providerId", delete(delete_ai_config))
        // Health & stats
        .route("/health/:schoolId", get(ai_health_check))
        // Embedding endpoints
        .route("/embedding/:schoolId", post(generate_embedding))
        .route("/embedding/:schoolId/search", post(search_documents))
}
