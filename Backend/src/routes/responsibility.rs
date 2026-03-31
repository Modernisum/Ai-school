use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json, Extension,
};
use crate::middleware::rls::TenantContext;
use serde_json::json;

pub async fn list_responsibilities(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let emp_type = params.get("employeeType").cloned();
    let simple = params.get("simple").map(|v| v == "true").unwrap_or(false);
    
    match state.services.responsibility.list_responsibilities(&school_id, emp_type).await {
        Ok(list) => {
            if simple {
                let simple_list: Vec<serde_json::Value> = list.into_iter().map(|r| {
                    json!({
                        "responsibilityId": r["responsibilityId"],
                        "name": r["name"]
                    })
                }).collect();
                return Json(json!({"success": true, "data": simple_list})).into_response();
            }
            Json(json!({"success": true, "data": list})).into_response()
        },
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn create_responsibility(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .create_responsibility(&school_id, &tenant_ctx.admin_id, payload)
        .await
    {
        Ok(res) => Json(json!({"success": true, "data": res})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn assign_responsibility(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, employee_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let responsibility_id = match payload["responsibilityId"].as_str() {
        Some(id) => id,
        None => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(json!({"success": false, "message": "responsibilityId is required"})),
            )
                .into_response()
        }
    };

    match state
        .services
        .responsibility
        .assign_responsibility(&school_id, &employee_id, responsibility_id, &tenant_ctx.admin_id)
        .await
    {
        Ok(_) => Json(json!({"success": true})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn remove_responsibility(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, employee_id, responsibility_id)): Path<(String, String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .remove_responsibility(&school_id, &employee_id, &responsibility_id, &tenant_ctx.admin_id)
        .await
    {
        Ok(_) => Json(json!({"success": true})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn sync_subject_roles(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .sync_subject_roles(&school_id, &tenant_ctx.admin_id)
        .await
    {
        Ok(_) => Json(json!({"success": true, "message": "Roles synced with subjects successfully"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn list_employee_responsibilities(
    State(state): State<AppState>,
    Path((school_id, employee_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .list_employee_responsibilities(&school_id, &employee_id)
        .await
    {
        Ok(mut enriched) => {
            if let Some(obj) = enriched.as_object_mut() {
                obj.insert("success".to_string(), json!(true));
            }
            Json(enriched).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn bulk_assign_responsibility(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let employee_ids = match payload["employeeIds"].as_array() {
        Some(arr) => arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect::<Vec<String>>(),
        None => return (axum::http::StatusCode::BAD_REQUEST, Json(json!({"success": false, "message": "employeeIds array is required"}))).into_response(),
    };
    
    let responsibility_ids = match payload["responsibilityIds"].as_array() {
        Some(arr) => arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect::<Vec<String>>(),
        None => return (axum::http::StatusCode::BAD_REQUEST, Json(json!({"success": false, "message": "responsibilityIds array is required"}))).into_response(),
    };

    let space_ids = payload["spaceIds"].as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect::<Vec<String>>())
        .unwrap_or_default();

    match state
        .services
        .responsibility
        .bulk_assign_responsibilities(&school_id, employee_ids, responsibility_ids, space_ids, &tenant_ctx.admin_id)
        .await
    {
        Ok(_) => Json(json!({"success": true, "message": "Responsibilities assigned in bulk successfully"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
