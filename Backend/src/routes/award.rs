use crate::AppState;
use axum::{
    extract::{Path, State, Query},
    response::IntoResponse,
    Json,
};
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
