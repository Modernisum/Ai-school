use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json, Extension,
};
use crate::middleware::rls::TenantContext;
use serde_json::{json, Value};
use crate::error::AppResult;

pub async fn create_event(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    let data = state.services.resource.create_event(&school_id, &tenant_ctx.admin_id, payload).await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn list_events(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> AppResult<Json<Value>> {
    let events = state.services.resource.list_events(&school_id).await?;
    Ok(Json(json!({"success": true, "data": events})))
}

pub async fn update_event(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, event_id)): Path<(String, i32)>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    state.services.resource.update_event(&school_id, &tenant_ctx.admin_id, event_id, payload).await?;
    Ok(Json(json!({"success": true})))
}

pub async fn delete_event(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, event_id)): Path<(String, i32)>,
) -> AppResult<Json<Value>> {
    state.services.resource.delete_event(&school_id, &tenant_ctx.admin_id, event_id).await?;
    Ok(Json(json!({"success": true})))
}
