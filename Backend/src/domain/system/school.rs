use crate::AppState;
use axum::{
    extract::{Path, State},
    Json, Extension,
};
use crate::middleware::rls::TenantContext;
use serde_json::{json, Value};
use crate::error::{AppResult, AppError};

pub async fn get_school_details(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> AppResult<Json<Value>> {
    let filter = params.get("filter").map(|s| s.to_string());
    let details = state.services.school.get_school_details(&school_id, filter).await?;
    Ok(Json(json!({"success": true, "data": details})))
}

pub async fn update_school_self(
    Extension(tenant_ctx): Extension<TenantContext>,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    state.services.school.update_school(&school_id, &tenant_ctx.admin_id, payload).await?;
    Ok(Json(json!({"success": true, "message": "School profile updated successfully"})))
}

pub async fn change_password_self(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    let new_password = payload["newPassword"]
        .as_str()
        .or(payload["password"].as_str())
        .ok_or_else(|| AppError::Validation("newPassword is required".into()))?;

    if new_password.len() < 6 {
        return Err(AppError::Validation("Password must be at least 6 characters".into()));
    }

    state.services.auth.change_password_self(&school_id, new_password).await?;

    Ok(Json(json!({"success": true, "message": "Password updated successfully"})))
}
