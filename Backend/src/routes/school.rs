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
) -> AppResult<Json<Value>> {
    let details = state.services.school.get_school_details(&school_id).await?;
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

    let hashed = bcrypt::hash(new_password, 10).map_err(|e| AppError::Internal(e.to_string()))?;

    sqlx::query("UPDATE auth SET password = $1, updated_at = NOW() WHERE school_id = $2")
        .bind(&hashed)
        .bind(&school_id)
        .execute(&state.db.pool)
        .await?;

    Ok(Json(json!({"success": true, "message": "Password updated successfully"})))
}
