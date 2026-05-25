use crate::AppState;
use axum::{
    extract::{Path, State},
    Json, Extension,
};
use crate::middleware::rls::TenantContext;
use serde_json::{json, Value};
use crate::error::AppResult;

pub async fn list_reminders(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> AppResult<Json<Value>> {
    let list = state.services.reminder.list_reminders(&school_id).await?;
    Ok(Json(json!({"success": true, "data": list})))
}

#[allow(dead_code)]
pub async fn create_reminder(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    let data = state
        .services
        .reminder
        .create_reminder(&school_id, &tenant_ctx.admin_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}
