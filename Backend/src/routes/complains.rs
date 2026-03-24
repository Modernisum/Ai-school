use crate::AppState;
use axum::{
    extract::{Path, State, Query},
    Json, Extension,
};
use crate::middleware::rls::TenantContext;
use std::collections::HashMap;
use serde_json::{json, Value};
use crate::error::AppResult;

pub async fn list_complains(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> AppResult<Json<Value>> {
    let student_id = params.get("student_id").map(|s| s.as_str());
    let mut list = state.services.complain.list_complains(&school_id, student_id).await?;
    
    // Generate signed URLs for attachments
    for item in list.iter_mut() {
        if let Some(path) = item["attachment_path"].as_str() {
            if let Ok(url) = state.storage.generate_download_url(path).await {
                item["attachmentUrl"] = json!(url);
            }
        }
    }
    Ok(Json(json!({"success": true, "data": list})))
}

pub async fn create_complain(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    let complain = state
        .services
        .complain
        .create_complain(&school_id, &tenant_ctx.admin_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "data": complain})))
}
