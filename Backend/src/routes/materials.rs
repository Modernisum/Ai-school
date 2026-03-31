use crate::AppState;
use axum::{
    extract::{Path, State},
    Json, Extension,
};
use crate::middleware::rls::TenantContext;
use serde_json::{json, Value};
use crate::error::AppResult;


pub async fn list_materials(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> AppResult<Json<Value>> {
    let mut list = state.services.resource.list_materials(&school_id).await?;
    
    // Generate signed URLs for attachments
    for item in list.iter_mut() {
        if let Some(path) = item["attachment_path"].as_str() {
            let url = state.storage.get_public_url(path);
            item["attachmentUrl"] = json!(url);
        }
    }
    Ok(Json(json!({"success": true, "data": list})))
}

pub async fn get_material(
    State(state): State<AppState>,
    Path((school_id, material_id)): Path<(String, String)>,
) -> AppResult<Json<Value>> {
    let material = state.services.resource.get_material(&school_id, &material_id).await?
        .ok_or_else(|| crate::error::AppError::NotFound("Material not found".to_string()))?;
    Ok(Json(json!({"success": true, "data": material})))
}

pub async fn create_material(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    // Validation
    if payload["materialName"].as_str().is_none() {
        return Err(crate::error::AppError::Validation("materialName is required".to_string()).into());
    }

    let res = state.services.resource.create_material(&school_id, &tenant_ctx.admin_id, payload).await?;
    Ok(Json(json!({"success": true, "data": res})))
}

pub async fn update_material(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, material_id)): Path<(String, String)>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    state.services.resource.update_material(&school_id, &tenant_ctx.admin_id, &material_id, payload).await?;
    Ok(Json(json!({"success": true, "message": "Material updated successfully"})))
}

pub async fn delete_material(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, material_id)): Path<(String, String)>,
) -> AppResult<Json<Value>> {
    state.services.resource.delete_material(&school_id, &tenant_ctx.admin_id, &material_id).await?;
    Ok(Json(json!({"success": true, "message": "Material deleted successfully"})))
}

pub async fn buy_material(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, material_id)): Path<(String, String)>,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    state
        .services
        .resource
        .update_material(&school_id, &tenant_ctx.admin_id, &material_id, payload)
        .await?;
    Ok(Json(json!({"success": true, "message": "Material purchase recorded"})))
}

pub async fn materials_dashboard(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> AppResult<Json<Value>> {
    let dashboard = state.services.resource.get_materials_dashboard(&school_id).await?;
    Ok(Json(dashboard))
}

pub async fn get_material_history(
    State(state): State<AppState>,
    Path((school_id, material_id)): Path<(String, String)>,
) -> AppResult<Json<Value>> {
    let history = state.services.resource.get_material_history(&school_id, &material_id).await?;
    Ok(Json(json!({"success": true, "data": history})))
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
