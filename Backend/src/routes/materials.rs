use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;

pub async fn list_materials(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.resource.list_materials(&school_id).await {
        Ok(list) => Json(json!({"success": true, "data": list})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn buy_material(
    State(state): State<AppState>,
    Path((school_id, material_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state
        .services
        .resource
        .update_material(&school_id, &material_id, payload)
        .await
    {
        Ok(_) => {
            Json(json!({"success": true, "message": "Material purchase recorded"})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
