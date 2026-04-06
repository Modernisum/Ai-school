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
    
    match state.services.responsibility.list_responsibilities(&school_id, emp_type.clone()).await {
        Ok(mut list) => {
            // Priority Sort: If teacher is requested, put them first
            if let Some(ref et) = emp_type {
                if et == "teacher" {
                    list.sort_by(|a, b| {
                        let a_is_match = a["employeeType"].as_str() == Some("teacher");
                        let b_is_match = b["employeeType"].as_str() == Some("teacher");
                        b_is_match.cmp(&a_is_match)
                    });
                }
            }

            let ids_only = params.get("idsOnly").map(|v| v == "true").unwrap_or(false);
            if ids_only {
                let id_list: Vec<serde_json::Value> = list.into_iter().map(|r| r["responsibilityId"].clone()).collect();
                return Json(json!({"success": true, "data": id_list})).into_response();
            }

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



pub async fn responsibility_analytics(
    State(state): State<AppState>,
    Path((school_id, responsibility_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .get_responsibility_analytics(&school_id, &responsibility_id)
        .await
    {
        Ok(analytics) => Json(json!({"success": true, "data": analytics})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn list_student_responsibilities(
    State(state): State<AppState>,
    Path((school_id, student_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .list_student_responsibilities(&school_id, &student_id)
        .await
    {
        Ok(list) => Json(json!({"success": true, "data": list})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn update_responsibility(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, responsibility_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .update_responsibility(&school_id, &responsibility_id, &tenant_ctx.admin_id, payload)
        .await
    {
        Ok(_) => Json(json!({"success": true, "message": "Responsibility updated successfully"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn get_responsibility_definition(
    State(state): State<AppState>,
    Path((school_id, responsibility_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .get_responsibility(&school_id, &responsibility_id)
        .await
    {
        Ok(Some(res)) => Json(json!({"success": true, "data": res})).into_response(),
        Ok(None) => (
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({"success": false, "message": "Responsibility not found"})),
        ).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}
