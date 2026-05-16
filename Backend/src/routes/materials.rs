use crate::AppState;
use axum::{
    extract::{Path, State, Query},
    Json, Extension,
};
use crate::middleware::rls::TenantContext;
use serde_json::{json, Value};
use crate::error::AppResult;
use crate::models::resource::CreateMaterialRequest;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct MaterialListQuery {
    pub search: Option<String>,
    pub filter: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}


pub async fn list_materials(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(query): Query<MaterialListQuery>,
) -> AppResult<Json<Value>> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    
    let mut response = state.services.resource.list_materials(&school_id, query.search, query.filter, page, limit).await?;
    
    // Generate signed URLs for attachments
    if let Some(list) = response["data"].as_array_mut() {
        for item in list.iter_mut() {
            if let Some(path) = item["attachmentPath"].as_str() {
                let url = state.storage.get_public_url(path);
                item["attachmentUrl"] = json!(url);
            }
        }
    }
    Ok(Json(response))
}

pub async fn get_material(
    State(state): State<AppState>,
    Path((school_id, material_name)): Path<(String, String)>,
) -> AppResult<Json<Value>> {
    let material = state.services.resource.get_material(&school_id, &material_name).await?
        .ok_or_else(|| crate::error::AppError::NotFound("Material not found".to_string()))?;
    Ok(Json(json!({"success": true, "data": material})))
}

pub async fn create_material(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<CreateMaterialRequest>,
) -> AppResult<Json<Value>> {
    let res = state.services.resource.create_material(&school_id, &tenant_ctx.admin_id, serde_json::to_value(payload)?).await?;
    Ok(Json(json!({"success": true, "data": res})))
}

pub async fn update_material(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, material_name)): Path<(String, String)>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    state.services.resource.update_material(&school_id, &tenant_ctx.admin_id, &material_name, payload).await?;
    Ok(Json(json!({"success": true, "message": "Material updated successfully"})))
}

pub async fn delete_material(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, material_name)): Path<(String, String)>,
) -> AppResult<Json<Value>> {
    state.services.resource.delete_material(&school_id, &tenant_ctx.admin_id, &material_name).await?;
    Ok(Json(json!({"success": true, "message": "Material deleted successfully"})))
}

pub async fn buy_material(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, material_name)): Path<(String, String)>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    state
        .services
        .resource
        .update_material(&school_id, &tenant_ctx.admin_id, &material_name, payload)
        .await?;
    Ok(Json(json!({"success": true, "message": "Material purchase recorded"})))
}

pub async fn sell_material(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, material_name)): Path<(String, String)>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    state
        .services
        .resource
        .sell_material(&school_id, &tenant_ctx.admin_id, &material_name, payload)
        .await?;
    Ok(Json(json!({"success": true, "message": "Material distribution recorded"})))
}

// Handlers for dashboard and history have been removed as their functionality
// is now integrated into list_materials and get_material respectively.

pub async fn get_shortage_summary(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> AppResult<Json<Value>> {
    let result = state.services.material_monitor.get_shortage_summary(&school_id).await?;
    Ok(Json(result))
}

pub async fn run_shortage_check(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> AppResult<Json<Value>> {
    let alerts = state.services.material_monitor.check_and_alert_school(&school_id).await?;
    Ok(Json(json!({
        "success": true,
        "alertsCreated": alerts.len(),
        "alerts": alerts,
    })))
}

pub async fn bulk_import_materials(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    let rows = match payload["materials"].as_array().or(payload.as_array()) {
        Some(r) => r.clone(),
        None => {
            return Ok(Json(json!({"success": false, "message": "Expected a 'materials' array"})));
        }
    };

    let mut success_count = 0usize;
    let mut fail_count = 0usize;
    let mut results = Vec::new();

    for (i, row) in rows.iter().enumerate() {
        let mat_data = json!({
            "materialName": row.get("Material Name").or(row.get("materialName")).unwrap_or(&Value::Null),
            "quantity": row.get("Quantity").or(row.get("quantity")).unwrap_or(&Value::Null),
            "unitPrice": row.get("Unit Price").or(row.get("unitPrice")).unwrap_or(&Value::Null),
        });

        match state
            .services
            .resource
            .create_material(&school_id, &tenant_ctx.admin_id, mat_data)
            .await
        {
            Ok(_) => {
                success_count += 1;
                results.push(json!({"row": i + 1, "status": "success"}));
            }
            Err(e) => {
                fail_count += 1;
                results.push(json!({"row": i + 1, "status": "error", "message": e.to_string()}));
            }
        }
    }

    Ok(Json(json!({
        "success": true,
        "message": format!("{} materials imported, {} failed", success_count, fail_count),
        "results": results,
        "successCount": success_count,
        "failCount": fail_count,
    })))
}
