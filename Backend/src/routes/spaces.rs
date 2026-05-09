use crate::models::resource::{CreateSpaceRequest, CreateSpaceCategoryRequest};
use crate::AppState;

use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json, Extension,
};
use crate::middleware::rls::TenantContext;
use serde_json::json;
use crate::error::AppResult;

pub async fn list_spaces(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> AppResult<impl IntoResponse> {
    let category = params.get("category").map(|s| s.as_str());
    let simple = params.get("simple").map(|v| v == "true").unwrap_or(false);
    
    let list = state.services.resource.list_spaces(&school_id, category).await?;
    
    if simple {
        let simple_list: Vec<serde_json::Value> = list.into_iter().map(|s| {
            json!({
                "name": s["name"]
            })
        }).collect();
        return Ok(Json(json!({"success": true, "data": simple_list})));
    }
    
    Ok(Json(json!({"success": true, "data": list})))
}

pub async fn list_space_categories(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let list = state.services.resource.list_space_categories(&school_id).await?;
    Ok(Json(json!({"success": true, "categories": list})))
}

pub async fn create_space_category(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<CreateSpaceCategoryRequest>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .resource
        .create_space_category(&school_id, &tenant_ctx.admin_id, &payload.name)
        .await?;
    Ok(Json(json!({"success": true, "category": data})))
}

pub async fn create_space_by_category(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, category)): Path<(String, String)>,
    Json(payload): Json<CreateSpaceRequest>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .resource
        .create_space_by_category(&school_id, &tenant_ctx.admin_id, &category, payload.space_name)
        .await?;
    Ok(Json(json!({"success": true, "space": data})))
}

pub async fn update_space(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, space_name)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    state
        .services
        .resource
        .update_space(&school_id, &tenant_ctx.admin_id, &space_name, payload)
        .await?;
    Ok(Json(json!({"success": true, "message": "Space updated successfully"})))
}

pub async fn delete_space(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, space_name)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    state
        .services
        .resource
        .delete_space(&school_id, &tenant_ctx.admin_id, &space_name)
        .await?;
    Ok(Json(json!({"success": true, "message": "Space deleted successfully"})))
}

pub async fn get_space_details(
    State(state): State<AppState>,
    Path((school_id, space_name)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .resource
        .get_space_details(&school_id, &space_name)
        .await?;
    
    match data {
        Some(d) => Ok(Json(json!({"success": true, "space": d})).into_response()),
        None => Ok((axum::http::StatusCode::NOT_FOUND, Json(json!({"success": false, "message": "Space not found"}))).into_response())
    }
}

pub async fn assign_space_materials(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, space_name)): Path<(String, String)>,
    Json(payload): Json<Vec<serde_json::Value>>,
) -> AppResult<impl IntoResponse> {
    state
        .services
        .resource
        .assign_space_materials(&school_id, &tenant_ctx.admin_id, &space_name, payload)
        .await?;
    Ok(Json(json!({"success": true, "message": "Materials assigned successfully"})))
}

