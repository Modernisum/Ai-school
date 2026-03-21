use crate::AppState;
use crate::middleware::rls::TenantContext;
use axum::{
    extract::{Path, State, Query},
    response::IntoResponse,
    Extension, Json,
};
use std::collections::HashMap;
use serde_json::json;

pub async fn create_exam(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state
        .services
        .academic
        .create_exam(&school_id, &tenant_ctx.admin_id, payload)
        .await
    {
        Ok(data) => Json(data).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn list_exams(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let student_id = params.get("student_id").map(|s| s.as_str());
    match state.services.academic.list_exams(&school_id, student_id).await {
        Ok(list) => Json(json!({"success": true, "data": list})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
