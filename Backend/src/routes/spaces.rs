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
) -> AppResult<impl IntoResponse> {
    let list = state.services.resource.list_spaces(&school_id).await?;
    Ok(Json(json!({"success": true, "data": list})))
}

// POST /api/spaces/:schoolId/spaces/bulk
pub async fn bulk_import_spaces(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let rows = match payload["spaces"].as_array().or(payload.as_array()) {
        Some(r) => r.clone(),
        None => {
            return Ok(Json(json!({"success": false, "message": "Expected a 'spaces' array"})).into_response());
        }
    };

    let mut success_count = 0usize;
    let mut fail_count = 0usize;
    let mut results = Vec::new();

    for (i, row) in rows.iter().enumerate() {
        let space_name = row
            .get("Space Name")
            .or(row.get("spaceName"))
            .or(row.get("name"))
            .and_then(|v| v.as_str())
            .unwrap_or("Unnamed Space")
            .to_string();

        let space_data = json!({ "name": space_name });
        match state
            .services
            .resource
            .create_space(&school_id, &tenant_ctx.admin_id, space_data)
            .await
        {
            Ok(_) => {
                success_count += 1;
                results.push(json!({"row": i + 1, "status": "success", "spaceName": space_name}));
            }
            Err(e) => {
                fail_count += 1;
                results.push(json!({"row": i + 1, "status": "error", "message": e.to_string()}));
            }
        }
    }

    Ok(Json(json!({
        "success": true,
        "message": format!("{} spaces imported, {} failed", success_count, fail_count),
        "results": results,
        "successCount": success_count,
        "failCount": fail_count,
    })).into_response())
}

pub async fn get_space_categories(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let list = state.services.resource.get_space_categories(&school_id).await?;
    Ok(Json(json!({"success": true, "data": list})))
}

pub async fn create_space_category(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .resource
        .create_space_category(&school_id, &tenant_ctx.admin_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "data": data})))
}

pub async fn delete_category(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, category_id)): Path<(String, i32)>,
) -> AppResult<impl IntoResponse> {
    state
        .services
        .resource
        .delete_space_category(&school_id, &tenant_ctx.admin_id, category_id)
        .await?;
    Ok(Json(json!({"success": true, "message": "Category deleted successfully"})))
}

pub async fn create_space(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .resource
        .create_space(&school_id, &tenant_ctx.admin_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "space": data})))
}

pub async fn update_space(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, space_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    state
        .services
        .resource
        .update_space(&school_id, &tenant_ctx.admin_id, &space_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "message": "Space updated successfully"})))
}

pub async fn delete_space(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, space_id)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    state
        .services
        .resource
        .delete_space(&school_id, &tenant_ctx.admin_id, &space_id)
        .await?;
    Ok(Json(json!({"success": true, "message": "Space deleted successfully"})))
}

pub async fn get_space_details(
    State(state): State<AppState>,
    Path((school_id, space_id)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .resource
        .get_space_details(&school_id, &space_id)
        .await?;
    
    match data {
        Some(d) => Ok(Json(json!({"success": true, "space": d})).into_response()),
        None => Ok((axum::http::StatusCode::NOT_FOUND, Json(json!({"success": false, "message": "Space not found"}))).into_response())
    }
}

pub async fn assign_space_materials(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, space_id)): Path<(String, String)>,
    Json(payload): Json<Vec<serde_json::Value>>,
) -> AppResult<impl IntoResponse> {
    state
        .services
        .resource
        .assign_space_materials(&school_id, &tenant_ctx.admin_id, &space_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "message": "Materials assigned successfully"})))
}

pub async fn assign_space_employees(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, space_id)): Path<(String, String)>,
    Json(payload): Json<Vec<String>>,
) -> AppResult<impl IntoResponse> {
    state
        .services
        .resource
        .assign_space_employees(&school_id, &tenant_ctx.admin_id, &space_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "message": "Employees assigned successfully"})))
}

pub async fn remove_space_employee(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, space_id, employee_id)): Path<(String, String, String)>,
) -> AppResult<impl IntoResponse> {
    state
        .services
        .resource
        .remove_space_employee(&school_id, &tenant_ctx.admin_id, &space_id, &employee_id)
        .await?;
    Ok(Json(json!({"success": true, "message": "Employee removed successfully"})))
}
