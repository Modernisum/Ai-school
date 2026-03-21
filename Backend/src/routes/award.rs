use crate::AppState;
use axum::{
    extract::{Path, State, Query},
    response::IntoResponse,
    Json, Extension,
};
use crate::middleware::rls::TenantContext;
use std::collections::HashMap;

pub async fn list_awards(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let student_id = params.get("student_id").map(|s| s.as_str());
    match state.services.award.list_awards(&school_id, student_id).await {
        Ok(list) => Json(serde_json::json!({"success": true, "data": list})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn create_award(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state
        .services
        .award
        .create_award(&school_id, &tenant_ctx.admin_id, payload)
        .await
    {
        Ok(data) => Json(serde_json::json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
