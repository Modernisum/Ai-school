use crate::models::resource::{CreateSpaceRequest, CreateSpaceCategoryRequest, RemoveSpaceMaterialReq, TransferMaterialRequest};
use crate::AppState;
use crate::domain::operations::responsibility_ws::publish_responsibility_event;
use crate::models::operations::ResponsibilityEvent;

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
    let category_name = payload.name.clone();
    let data = state
        .services
        .resource
        .create_space_category(&school_id, &tenant_ctx.admin_id, &category_name)
        .await?;
    let _ = publish_responsibility_event(
        &school_id,
        ResponsibilityEvent::CategoryCreated {
            category_name,
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    ).await;
    Ok(Json(json!({"success": true, "category": data})))
}

pub async fn delete_space_category(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, category_name)): Path<(String, String)>,
) -> AppResult<impl IntoResponse> {
    state
        .services
        .resource
        .delete_space_category(&school_id, &tenant_ctx.admin_id, &category_name)
        .await?;
    let _ = publish_responsibility_event(
        &school_id,
        ResponsibilityEvent::CategoryDeleted {
            category_name: category_name.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    ).await;
    Ok(Json(json!({"success": true, "message": "Category deleted successfully"})))
}

pub async fn create_space_by_category(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, category)): Path<(String, String)>,
    Json(payload): Json<CreateSpaceRequest>,
) -> AppResult<impl IntoResponse> {
    // Validate category exists
    let categories = state.services.resource.list_space_categories(&school_id).await?;
    if !categories.iter().any(|c| c.to_lowercase() == category.to_lowercase()) {
        return Err(crate::error::AppError::Validation(format!("Space category '{}' does not exist", category)));
    }

    let space_name = payload.space_name.clone();
    let description = payload.description.clone();
    let data = state
        .services
        .resource
        .create_space_by_category(&school_id, &tenant_ctx.admin_id, &category, space_name.clone(), description)
        .await?;
    let _ = publish_responsibility_event(
        &school_id,
        ResponsibilityEvent::SpaceCreated {
            space_name,
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    ).await;
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
    let _ = publish_responsibility_event(
        &school_id,
        ResponsibilityEvent::SpaceUpdated {
            space_name: space_name.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    ).await;
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
    let _ = publish_responsibility_event(
        &school_id,
        ResponsibilityEvent::SpaceDeleted {
            space_name: space_name.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    ).await;
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
    let _ = publish_responsibility_event(
        &school_id,
        ResponsibilityEvent::SpaceUpdated {
            space_name: space_name.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    ).await;
    let _ = publish_responsibility_event(
        &school_id,
        ResponsibilityEvent::MaterialUpdated {
            material_name: "".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    ).await;
    Ok(Json(json!({"success": true, "message": "Materials assigned successfully"})))
}

pub async fn get_space_materials(
    State(state): State<AppState>,
    Path((school_id, space_name)): Path<(String, String)>,
) -> AppResult<Json<serde_json::Value>> {
    let data = state
        .services
        .resource
        .get_space_materials(&school_id, &space_name)
        .await?;

    let list = data["materials"].as_array().cloned().unwrap_or_default();
    let budget = data["budget"].as_f64();

    let mut total_value = 0.0_f64;
    let mut deficit_value = 0.0_f64;
    let mut total_deficits = 0_usize;

    for m in &list {
        let qty = m["quantity"].as_f64().unwrap_or(0.0);
        let price = m["unitPrice"].as_f64().unwrap_or(0.0);
        total_value += qty * price;

        let required = m["requiredCount"].as_f64().unwrap_or(0.0);
        if required > qty {
            let deficit = required - qty;
            deficit_value += deficit * price;
            total_deficits += 1;
        }
    }

    Ok(Json(json!({
        "success": true,
        "materials": list,
        "summary": {
            "totalValue": total_value,
            "deficitValue": deficit_value,
            "deficitCount": total_deficits,
            "totalCount": list.len(),
            "budget": budget,
        }
    })))
}



pub async fn remove_space_material(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, space_name, material_name)): Path<(String, String, String)>,
    Json(payload): Json<RemoveSpaceMaterialReq>,
) -> AppResult<impl IntoResponse> {
    state
        .services
        .resource
        .remove_space_material(&school_id, &tenant_ctx.admin_id, &space_name, &material_name, payload.quantity)
        .await?;
    let _ = publish_responsibility_event(
        &school_id,
        ResponsibilityEvent::SpaceUpdated {
            space_name: space_name.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    ).await;
    let _ = publish_responsibility_event(
        &school_id,
        ResponsibilityEvent::MaterialUpdated {
            material_name: material_name.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    ).await;
    Ok(Json(json!({"success": true, "message": "Material removed from space"})))
}

pub async fn clone_space(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, space_name)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<impl IntoResponse> {
    let new_name = payload["newSpaceName"].as_str()
        .ok_or_else(|| crate::error::AppError::Validation("newSpaceName is required".to_string()))?
        .to_string();
    let new_name_clone = new_name.clone();

    let data = state
        .services
        .resource
        .clone_space(&school_id, &tenant_ctx.admin_id, &space_name, new_name)
        .await?;
    let _ = publish_responsibility_event(
        &school_id,
        ResponsibilityEvent::SpaceCreated {
            space_name: new_name_clone,
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    ).await;
    Ok(Json(json!({"success": true, "space": data})))
}

pub async fn get_all_spaces_materials(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> AppResult<Json<serde_json::Value>> {
    let result = state.services.resource.get_all_spaces_materials(&school_id).await?;
    Ok(Json(result))
}

pub async fn get_space_budget(
    State(state): State<AppState>,
    Path((school_id, space_name)): Path<(String, String)>,
) -> AppResult<Json<serde_json::Value>> {
    let details = state.services.resource.get_space_details(&school_id, &space_name).await?;
    match details {
        Some(d) => Ok(Json(json!({
            "success": true,
            "budget": d.get("budget"),
            "spaceName": space_name,
        }))),
        None => Ok(Json(json!({"success": false, "message": "Space not found"})))
    }
}

pub async fn update_space_budget(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, space_name)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> AppResult<Json<serde_json::Value>> {
    let budget = payload.get("budget").and_then(|v| v.as_f64());
    state.services.resource.update_space_budget(&school_id, &tenant_ctx.admin_id, &space_name, budget).await?;

    let _ = publish_responsibility_event(
        &school_id,
        ResponsibilityEvent::SpaceUpdated {
            space_name: space_name.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    ).await;
    Ok(Json(json!({"success": true, "message": "Budget updated successfully"})))
}



pub async fn transfer_space_material(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, space_name, material_name)): Path<(String, String, String)>,
    Json(payload): Json<TransferMaterialRequest>,
) -> AppResult<impl IntoResponse> {
    let data = state
        .services
        .resource
        .transfer_space_material(&school_id, &tenant_ctx.admin_id, &space_name, &payload.to_space, &material_name, payload.quantity)
        .await?;
    let _ = publish_responsibility_event(
        &school_id,
        ResponsibilityEvent::SpaceUpdated {
            space_name: space_name.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    ).await;
    let _ = publish_responsibility_event(
        &school_id,
        ResponsibilityEvent::SpaceUpdated {
            space_name: payload.to_space.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    ).await;
    let _ = publish_responsibility_event(
        &school_id,
        ResponsibilityEvent::MaterialUpdated {
            material_name: material_name.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        },
    ).await;
    Ok(Json(data))
}

