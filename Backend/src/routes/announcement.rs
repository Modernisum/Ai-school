use crate::AppState;
use axum::{
    extract::{Path, State},
    Json, Extension,
};
use crate::middleware::rls::TenantContext;
use serde_json::{json, Value};
use crate::error::AppResult;

pub async fn create_announcement(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, type_str, user_id)): Path<(String, String, String)>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    let data = state
        .services
        .resource
        .create_announcement(&school_id, &tenant_ctx.admin_id, &type_str, &user_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}
