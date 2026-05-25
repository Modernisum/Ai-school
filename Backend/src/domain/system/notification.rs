use crate::AppState;
use crate::error::AppResult;
use crate::middleware::rls::TenantContext;
use axum::{
    extract::{Path, Query, State, Extension},
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};

#[derive(Deserialize)]
pub struct ListQuery {
    pub category: Option<String>,
    pub unread_only: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn list_notifications(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(query): Query<ListQuery>,
) -> AppResult<Json<Value>> {
    let list = state.services.notification.list_notifications(
        &school_id,
        Some(&tenant_ctx.admin_id),
        query.category.as_deref(),
        query.unread_only.unwrap_or(false),
        query.limit.unwrap_or(50),
        query.offset.unwrap_or(0),
    ).await?;
    Ok(Json(json!({"success": true, "data": list})))
}

pub async fn get_unread_count(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
) -> AppResult<Json<Value>> {
    let count = state.services.notification.get_unread_count(&school_id, &tenant_ctx.admin_id).await?;
    Ok(Json(json!({"success": true, "data": {"count": count}})))
}

pub async fn create_notification(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    let user_id = payload["userId"].as_str();
    let category = payload["category"].as_str().unwrap_or("general");
    let severity = payload["severity"].as_str().unwrap_or("info");
    let title = payload["title"].as_str().unwrap_or("");
    let message = payload["message"].as_str().unwrap_or("");
    let data = payload.get("data").cloned().unwrap_or(json!({}));

    let notif = state.services.notification.create_notification(
        &school_id, user_id, category, severity, title, message, data,
    ).await?;

    let _ = state.repos.audit.log_action(
        &school_id,
        &tenant_ctx.admin_id,
        "NOTIFICATION",
        &notif["id"].as_i64().map(|id| id.to_string()).unwrap_or_default(),
        "CREATE",
        notif.clone(),
    ).await;

    Ok(Json(json!({"success": true, "data": notif})))
}

pub async fn mark_read(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, notification_id)): Path<(String, i64)>,
) -> AppResult<Json<Value>> {
    state.services.notification.mark_read(&school_id, notification_id, &tenant_ctx.admin_id).await?;
    Ok(Json(json!({"success": true, "data": {"markedRead": notification_id}})))
}

pub async fn mark_all_read(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
) -> AppResult<Json<Value>> {
    state.services.notification.mark_all_read(&school_id, &tenant_ctx.admin_id).await?;
    Ok(Json(json!({"success": true, "data": {"markedAllRead": true}})))
}

pub async fn delete_notification(
    State(state): State<AppState>,
    Path((school_id, notification_id)): Path<(String, i64)>,
) -> AppResult<Json<Value>> {
    state.services.notification.delete_notification(&school_id, notification_id).await?;
    Ok(Json(json!({"success": true, "data": {"deleted": notification_id}})))
}

pub fn router() -> axum::Router<AppState> {
    use axum::routing::{delete, get, post};
    axum::Router::new()
        .route("/", get(list_notifications).post(create_notification))
        .route("/unread-count", get(get_unread_count))
        .route("/mark-all-read", post(mark_all_read))
        .route("/:notification_id/read", post(mark_read))
        .route("/:notification_id", delete(delete_notification))
}
