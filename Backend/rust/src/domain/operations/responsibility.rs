use crate::AppState;
use axum::{
    extract::{Path, State, Query, Multipart},
    response::IntoResponse,
    Json, Extension,
};
use crate::middleware::rls::TenantContext;
use crate::domain::operations::responsibility_ws::publish_responsibility_event;
use crate::models::operations::ResponsibilityEvent;
use crate::services::responsibility::notifications::ResponsibilityNotificationService;
use serde_json::{json, Value};
use std::collections::HashMap;
use chrono::Utc;

pub async fn list_responsibilities(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let emp_type = params.get("employeeType").cloned();
    let simple = params.get("simple").map(|v| v == "true").unwrap_or(false);
    let paginated = params.get("paginated").map(|v| v == "true").unwrap_or(false);
    
    if paginated {
        let page = params.get("page").and_then(|v| v.parse::<i32>().ok()).unwrap_or(1);
        let limit = params.get("limit").and_then(|v| v.parse::<i32>().ok()).unwrap_or(20);
        
        match state.services.responsibility.list_responsibilities_paginated(&school_id, emp_type, page, limit).await {
            Ok(result) => {
                let mut response = json!({"success": true});
                if let Some(data) = result.get("data") {
                    response["data"] = data.clone();
                }
                if let Some(pagination) = result.get("pagination") {
                    response["pagination"] = pagination.clone();
                }
                Json(response).into_response()
            }
            Err(e) => {
                (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success": false, "message": e.to_string()}))).into_response()
            }
        }
    } else {
        match state.services.responsibility.list_responsibilities(&school_id, emp_type.clone()).await {
            Ok(mut list) => {
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
            }
            Err(e) => {
                (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"success": false, "message": e.to_string()}))).into_response()
            }
        }
    }
}

/// GET /schools/{schoolId}/responsibility/spaces/{spaceId}/financial-overview
/// Get financial overview for a specific space
pub async fn get_space_financial_overview(
    State(state): State<AppState>,
    Path((school_id, space_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state.services.responsibility.get_space_financial_overview(&school_id, &space_id).await {
        Ok(data) => Json(json!({
            "success": true,
            "data": data
        })).into_response(),
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()}))).into_response(),
    }
}

/// GET /schools/{schoolId}/responsibility/alerts/missing-responsibilities
/// Find spaces missing required responsibilities
pub async fn get_missing_responsibility_alerts(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.repos.responsibility.get_missing_responsibility_alerts(&school_id).await {
        Ok(alerts) => {
            Json(json!({ "success": true, "data": alerts, "total": alerts.len() })).into_response()
        }
        Err(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()}))).into_response(),
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
        Ok(res) => {
            // Publish responsibility created event
            let _ = publish_responsibility_event(&school_id, ResponsibilityEvent::Updated {
                responsibility_id: res["responsibilityId"].as_str().unwrap_or("").to_string(),
                field: "created".to_string(),
                old_value: serde_json::Value::Null,
                new_value: res.clone(),
                updated_by: tenant_ctx.admin_id.clone(),
                timestamp: chrono::Utc::now().to_rfc3339(),
            }).await;
            
            Json(json!({"success": true, "data": res})).into_response()
        },
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

pub async fn overview_analytics(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let time_range = params.get("timeRange").unwrap_or(&"30d".to_string()).clone();
    
    match state
        .services
        .responsibility
        .get_overview_analytics(&school_id, &time_range)
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

pub async fn export_responsibilities_csv(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .export_responsibilities_csv(&school_id)
        .await
    {
        Ok(csv_data) => {
            let headers = [
                ("Content-Type", "text/csv"),
                ("Content-Disposition", "attachment; filename=\"responsibilities.csv\""),
            ];
            (headers, csv_data).into_response()
        },
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn import_responsibilities_csv(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let mut csv_content = String::new();
    
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or("");
        if name == "file" {
            if let Ok(content) = field.text().await {
                csv_content = content;
            }
        }
    }
    
    match state
        .services
        .responsibility
        .import_responsibilities_csv(&school_id, &tenant_ctx.admin_id, &csv_content)
        .await
    {
        Ok(count) => Json(json!({"success": true, "count": count})).into_response(),
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

/// GET /schools/{schoolId}/employees/{employeeId}/responsibilities
/// List all responsibilities assigned to an employee
pub async fn list_employee_responsibilities(
    State(state): State<AppState>,
    Path((school_id, employee_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state.services.responsibility.get_employee_responsibilities(&school_id, &employee_id).await {
        Ok(list) => Json(json!({"success": true, "data": list})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// GET /schools/{schoolId}/spaces/{spaceId}/responsibilities
/// List all responsibilities assigned to a space with mandatory/optional classification
pub async fn list_space_responsibilities(
    State(state): State<AppState>,
    Path((school_id, space_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state.services.responsibility.list_space_responsibilities(&school_id, &space_id).await {
        Ok(list) => Json(json!({"success": true, "data": list})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// GET /schools/{schoolId}/responsibilities/search
/// Search responsibilities by name with pagination
pub async fn search_responsibilities(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let search_q = params.get("q").cloned().unwrap_or_default();
    let page = params.get("page").and_then(|v| v.parse::<i32>().ok()).unwrap_or(1);
    let limit = params.get("limit").and_then(|v| v.parse::<i32>().ok()).unwrap_or(20);
    let offset = (page - 1) * limit;
    
    if search_q.is_empty() {
        let empty: Vec<Value> = Vec::new();
        return Json(json!({
            "success": true,
            "data": empty,
            "pagination": { "page": page, "limit": limit, "total": 0, "pages": 0 }
        })).into_response();
    }
    
    let pattern = format!("%{}%", search_q.replace('%', "\\%").replace('_', "\\_"));
    
    match state.repos.responsibility.search_responsibilities(&school_id, &pattern, limit, offset).await {
        Ok((data, total)) => {
            let pages = ((total as f64) / (limit as f64)).ceil() as i32;
            Json(json!({
                "success": true,
                "data": data,
                "pagination": { "page": page, "limit": limit, "total": total, "pages": pages }
            })).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// POST /schools/{schoolId}/responsibilities/{responsibilityId}/bulk-assign
/// Bulk assign responsibility to multiple employees
pub async fn bulk_assign_responsibility(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, responsibility_id)): Path<(String, String)>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let employee_ids = payload["employeeIds"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_else(Vec::new);
    
    let space_ids = payload["spaceIds"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_else(Vec::new);
    
    if employee_ids.is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "employeeIds array is required"})),
        ).into_response();
    }
    
    // Build updates: each employee gets the same space_ids
    let updates: Vec<(String, Vec<String>)> = employee_ids.iter()
        .map(|emp_id| (emp_id.clone(), space_ids.clone()))
        .collect();
    
    match state.services.responsibility.bulk_update_responsibility(
        &school_id,
        &responsibility_id,
        &tenant_ctx.admin_id,
        updates,
    ).await {
        Ok((count, warnings)) => {
            // Get responsibility name for notifications
            let responsibility_name = match state.services.responsibility.list_responsibilities(&school_id, None).await {
                Ok(list) => {
                    list.iter()
                        .find(|r| r["responsibilityId"].as_str() == Some(&responsibility_id))
                        .and_then(|r| r["name"].as_str())
                        .unwrap_or("Unknown Responsibility")
                        .to_string()
                }
                Err(_) => "Unknown Responsibility".to_string(),
            };
            
            // Create notification service
            let notification_service = ResponsibilityNotificationService::new(
                state.repos.clone(),
                std::sync::Arc::new(crate::logic::EmailService::new())
            );
            
            // Send bulk assignment notifications
            let _ = notification_service.send_bulk_update_notification(
                &school_id,
                &responsibility_id,
                &responsibility_name,
                &employee_ids,
                "assigned",
                &tenant_ctx.admin_id,
            ).await;
            
            // Publish bulk assignment event
            let _ = publish_responsibility_event(&school_id, ResponsibilityEvent::BulkUpdate {
                responsibility_id: responsibility_id.clone(),
                update_type: "bulk_assign".to_string(),
                affected_count: count as i32,
                performed_by: tenant_ctx.admin_id.clone(),
                timestamp: Utc::now().to_rfc3339(),
            }).await;
            
            Json(json!({
                "success": true,
                "message": format!("Bulk assignment completed for {} employees", count),
                "warnings": warnings
            })).into_response()
        },
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// DELETE /schools/{schoolId}/responsibilities/{responsibilityId}/bulk-remove
/// Bulk remove responsibility from multiple employees
pub async fn bulk_remove_responsibility(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, responsibility_id)): Path<(String, String)>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let employee_ids = payload["employeeIds"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_else(Vec::new);
    
    if employee_ids.is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "employeeIds array is required"})),
        ).into_response();
    }
    
    // Perform the actual DB removal for each employee
    let mut success_count: usize = 0;
    for emp_id in &employee_ids {
        match state.repos.responsibility.remove_responsibility(&school_id, emp_id, &responsibility_id).await {
            Ok(_) => success_count += 1,
            Err(_) => {} // Skip individual failures, continue with rest
        }
    }
    
    // Get responsibility name for notifications
    let responsibility_name = match state.services.responsibility.list_responsibilities(&school_id, None).await {
        Ok(list) => {
            list.iter()
                .find(|r| r["responsibilityId"].as_str() == Some(&responsibility_id))
                .and_then(|r| r["name"].as_str())
                .unwrap_or("Unknown Responsibility")
                .to_string()
        }
        Err(_) => "Unknown Responsibility".to_string(),
    };
    
    // Create notification service
    let notification_service = ResponsibilityNotificationService::new(
        state.repos.clone(),
        std::sync::Arc::new(crate::logic::EmailService::new())
    );
    
    // Send bulk removal notifications
    let _ = notification_service.send_bulk_update_notification(
        &school_id,
        &responsibility_id,
        &responsibility_name,
        &employee_ids,
        "removed",
        &tenant_ctx.admin_id,
    ).await;
    
    // Publish bulk removal event
    let _ = publish_responsibility_event(&school_id, ResponsibilityEvent::BulkUpdate {
        responsibility_id: responsibility_id.clone(),
        update_type: "bulk_remove".to_string(),
        affected_count: success_count as i32,
        performed_by: tenant_ctx.admin_id.clone(),
        timestamp: Utc::now().to_rfc3339(),
    }).await;
    
    Json(json!({
        "success": true,
        "message": format!("Bulk removal completed for {} employees", success_count)
    })).into_response()
}

/// PUT /schools/{schoolId}/responsibilities/{responsibilityId}/bulk-update
/// Bulk update responsibility for multiple employees
pub async fn bulk_update_responsibility(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, responsibility_id)): Path<(String, String)>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let updates = payload["updates"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| {
            Some((
                v["employeeId"].as_str()?.to_string(),
                v["spaceIds"].as_array()?.iter().filter_map(|s| s.as_str().map(String::from)).collect::<Vec<_>>()
            ))
        }).collect::<Vec<_>>())
        .unwrap_or_else(Vec::new);
    
    if updates.is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": "updates array is required"})),
        ).into_response();
    }
    
    match state
        .services
        .responsibility
        .bulk_update_responsibility(&school_id, &responsibility_id, &tenant_ctx.admin_id, updates)
        .await
    {
        Ok((count, warnings)) => Json(json!({
            "success": true,
            "message": format!("Bulk update completed for {} employees", count),
            "warnings": warnings
        })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// GET /schools/{schoolId}/responsibilities/{responsibilityId}/history
/// Get assignment history for a responsibility
pub async fn get_responsibility_history(
    State(state): State<AppState>,
    Path((school_id, responsibility_id)): Path<(String, String)>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let limit = params.get("limit")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(50);
    
    match state
        .services
        .responsibility
        .get_assignment_history(&school_id, Some(&responsibility_id), None, limit)
        .await
    {
        Ok(history) => Json(json!({
            "success": true,
            "data": {
                "responsibilityId": responsibility_id,
                "assignments": history
            }
        })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// GET /schools/{schoolId}/responsibilities/{responsibilityId}/versions
/// Get version history for a responsibility
pub async fn get_responsibility_versions(
    State(state): State<AppState>,
    Path((school_id, responsibility_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .get_responsibility_versions(&school_id, &responsibility_id)
        .await
    {
        Ok(versions) => Json(json!({
            "success": true,
            "data": {
                "responsibilityId": responsibility_id,
                "versions": versions
            }
        })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// POST /schools/{schoolId}/responsibilities/{responsibilityId}/rollback/{version}
/// Rollback responsibility to a specific version
pub async fn rollback_responsibility(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, responsibility_id, version)): Path<(String, String, i32)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .rollback_responsibility(&school_id, &responsibility_id, version, &tenant_ctx.admin_id)
        .await
    {
        Ok(()) => Json(json!({
            "success": true,
            "message": format!("Responsibility rolled back to version {}", version)
        })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
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

pub async fn delete_responsibility(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path((school_id, responsibility_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .delete_responsibility(&school_id, &responsibility_id, &tenant_ctx.admin_id)
        .await
    {
        Ok(()) => Json(json!({"success": true, "message": "Responsibility deleted successfully"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

// Phase 6: Reporting & Analytics endpoints

pub async fn get_utilization_metrics(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let start_date = params.get("startDate").map(|s| s.as_str());
    let end_date = params.get("endDate").map(|s| s.as_str());
    
    match state
        .services
        .responsibility
        .get_responsibility_utilization_metrics(&school_id, start_date, end_date)
        .await
    {
        Ok(metrics) => Json(json!({"success": true, "data": metrics})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn get_workload_metrics(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let employee_id = params.get("employeeId").map(|s| s.as_str());
    let start_date = params.get("startDate").map(|s| s.as_str());
    let end_date = params.get("endDate").map(|s| s.as_str());
    
    match state
        .services
        .responsibility
        .get_employee_workload_metrics(&school_id, employee_id, start_date, end_date)
        .await
    {
        Ok(metrics) => Json(json!({"success": true, "data": metrics})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn get_space_distribution_metrics(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let space_id = params.get("spaceId").map(|s| s.as_str());
    let start_date = params.get("startDate").map(|s| s.as_str());
    let end_date = params.get("endDate").map(|s| s.as_str());
    
    match state
        .services
        .responsibility
        .get_space_distribution_metrics(&school_id, space_id, start_date, end_date)
        .await
    {
        Ok(metrics) => Json(json!({"success": true, "data": metrics})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn get_revenue_metrics(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let responsibility_id = params.get("responsibilityId").map(|s| s.as_str());
    let start_date = params.get("startDate").map(|s| s.as_str());
    let end_date = params.get("endDate").map(|s| s.as_str());
    
    match state
        .services
        .responsibility
        .get_revenue_metrics(&school_id, responsibility_id, start_date, end_date)
        .await
    {
        Ok(metrics) => Json(json!({"success": true, "data": metrics})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn generate_utilization_report(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path((school_id, start_date, end_date)): Path<(String, String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .generate_utilization_report(&school_id, &start_date, &end_date)
        .await
    {
        Ok(report) => Json(json!({"success": true, "data": report})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn generate_workload_report(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path((school_id, start_date, end_date)): Path<(String, String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .generate_workload_report(&school_id, &start_date, &end_date)
        .await
    {
        Ok(report) => Json(json!({"success": true, "data": report})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn generate_space_distribution_report(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path((school_id, start_date, end_date)): Path<(String, String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .generate_space_distribution_report(&school_id, &start_date, &end_date)
        .await
    {
        Ok(report) => Json(json!({"success": true, "data": report})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn generate_revenue_report(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path((school_id, start_date, end_date)): Path<(String, String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .generate_revenue_report(&school_id, &start_date, &end_date)
        .await
    {
        Ok(report) => Json(json!({"success": true, "data": report})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

// PDF Export endpoints
pub async fn generate_utilization_report_pdf(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path((school_id, start_date, end_date)): Path<(String, String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .generate_utilization_report_pdf(&school_id, &start_date, &end_date)
        .await
    {
        Ok(pdf_data) => {
            let filename = format!("utilization_report_{}_{}.pdf", start_date, end_date);
            axum::response::Response::builder()
                .status(200)
                .header("Content-Type", "application/pdf")
                .header(
                    "Content-Disposition",
                    format!("attachment; filename=\"{}\"", filename),
                )
                .body(axum::body::Body::from(pdf_data))
                .unwrap()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn generate_workload_report_pdf(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path((school_id, start_date, end_date)): Path<(String, String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .generate_workload_report_pdf(&school_id, &start_date, &end_date)
        .await
    {
        Ok(pdf_data) => {
            let filename = format!("workload_report_{}_{}.pdf", start_date, end_date);
            axum::response::Response::builder()
                .status(200)
                .header("Content-Type", "application/pdf")
                .header(
                    "Content-Disposition",
                    format!("attachment; filename=\"{}\"", filename),
                )
                .body(axum::body::Body::from(pdf_data))
                .unwrap()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn generate_space_distribution_report_pdf(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path((school_id, start_date, end_date)): Path<(String, String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .generate_space_distribution_report_pdf(&school_id, &start_date, &end_date)
        .await
    {
        Ok(pdf_data) => {
            let filename = format!("space_distribution_report_{}_{}.pdf", start_date, end_date);
            axum::response::Response::builder()
                .status(200)
                .header("Content-Type", "application/pdf")
                .header(
                    "Content-Disposition",
                    format!("attachment; filename=\"{}\"", filename),
                )
                .body(axum::body::Body::from(pdf_data))
                .unwrap()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

pub async fn generate_revenue_report_pdf(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path((school_id, start_date, end_date)): Path<(String, String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .responsibility
        .generate_revenue_report_pdf(&school_id, &start_date, &end_date)
        .await
    {
        Ok(pdf_data) => {
            let filename = format!("revenue_report_{}_{}.pdf", start_date, end_date);
            axum::response::Response::builder()
                .status(200)
                .header("Content-Type", "application/pdf")
                .header(
                    "Content-Disposition",
                    format!("attachment; filename=\"{}\"", filename),
                )
                .body(axum::body::Body::from(pdf_data))
                .unwrap()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// POST /schools/{schoolId}/responsibility/sync-student-fees
/// Recalculate and sync student fees from responsibility assignments for all students
pub async fn sync_student_fees(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.responsibility.recalculate_all_student_fees(&school_id).await {
        Ok(count) => Json(json!({
            "success": true, "message": format!("Student fees synced for {} students", count), "affectedCount": count
        })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// POST /schools/{schoolId}/responsibility/{responsibilityId}/sync-student-fees
/// Recalculate student fees for the spaces covered by a specific responsibility
pub async fn sync_student_fees_for_resp(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path((school_id, responsibility_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state.services.responsibility.sync_student_fees_for_responsibility(&school_id, &responsibility_id).await {
        Ok(count) => Json(json!({
            "success": true, "message": format!("Student fees synced for {} students", count), "affectedCount": count
        })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}

/// POST /schools/{schoolId}/responsibility/generate-salaries/{month}/{year}
/// Generate monthly salary records for all employees based on responsibility assignments
pub async fn generate_salaries(
    State(state): State<AppState>,
    Extension(_tenant_ctx): Extension<TenantContext>,
    Path((school_id, month, year)): Path<(String, i32, i32)>,
) -> impl IntoResponse {
    match state.services.responsibility.generate_salaries_from_responsibilities(&school_id, month, year).await {
        Ok(result) => Json(json!({"success": true, "data": result})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}
