use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateAccessRequest {
    pub developer_email: String,
    pub target_school_id: Option<String>,
    pub requested_role: String,
    pub justification: String,
    pub requested_tables: Vec<String>,
    pub duration_minutes: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct ApproveAccessRequest {
    pub approver_id: String,
    pub approver_email: String,
    pub approval_notes: Option<String>,
    pub override_duration_minutes: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct RevokeAccessParams {
    pub revoker_id: String,
    pub revoker_email: String,
    pub reason: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDeveloperRole {
    pub new_role: String,
    pub reason: String,
}

#[derive(Debug, Serialize)]
pub struct AccessRequestResponse {
    pub request_id: i32,
    pub developer_id: String,
    pub target_school_id: Option<String>,
    pub requested_role: String,
    pub status: String,
    pub justification: String,
    pub created_at: String,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DeveloperAccessResponse {
    pub developer_id: String,
    pub current_role: String,
    pub active_until: Option<String>,
    pub schools_with_access: Vec<String>,
    pub total_requests: i32,
    pub approved_requests: i32,
}

#[derive(Debug, Serialize)]
pub struct ActivityLogResponse {
    pub activity_id: i32,
    pub developer_id: String,
    pub action_type: String,
    pub target_school_id: Option<String>,
    pub details: Value,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: String,
}

pub async fn request_access(
    State(state): State<AppState>,
    Path(developer_id): Path<String>,
    Json(payload): Json<CreateAccessRequest>,
) -> impl IntoResponse {
    let duration_hours = payload.duration_minutes.unwrap_or(240) / 60;
    
    match state.services.developer_access.request_access(
        &developer_id,
        &payload.developer_email,
        &payload.requested_role,
        &payload.justification,
        payload.requested_tables,
        duration_hours
    ).await {
        Ok(res) => (
            StatusCode::CREATED,
            Json(json!({
                "success": true,
                "message": "Access request submitted successfully",
                "request": res
            }))
        ),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "success": false,
                "error": e.to_string()
            }))
        )
    }
}

pub async fn approve_access_request(
    State(state): State<AppState>,
    Path(request_id): Path<i32>,
    Json(payload): Json<ApproveAccessRequest>,
) -> impl IntoResponse {
    match state.services.developer_access.approve_access_request(
        request_id,
        &payload.approver_id,
        &payload.approver_email,
        payload.approval_notes.as_deref()
    ).await {
        Ok(access_grant) => (
            StatusCode::OK,
            Json(json!({
                "success": true,
                "message": "Access request approved",
                "data": access_grant
            }))
        ),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "success": false,
                "error": e.to_string()
            }))
        )
    }
}

pub async fn reject_access_request(
    State(_state): State<AppState>,
    Path(_request_id): Path<i32>,
    Json(_payload): Json<RevokeAccessParams>,
) -> impl IntoResponse {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "success": false,
            "error": "Not implemented"
        }))
    )
}

pub async fn revoke_access(
    State(state): State<AppState>,
    Path(grant_id): Path<i32>,
    Json(payload): Json<RevokeAccessParams>,
) -> impl IntoResponse {
    match state.services.developer_access.revoke_access(grant_id, &payload.revoker_id, &payload.revoker_email, &payload.reason).await {
        Ok(_) => (
            StatusCode::OK,
            Json(json!({
                "success": true,
                "message": "Access revoked successfully"
            }))
        ),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "success": false,
                "error": e.to_string()
            }))
        )
    }
}

pub async fn get_pending_requests(
    State(state): State<AppState>,
) -> impl IntoResponse {
    match state.services.developer_access.get_pending_requests().await {
        Ok(requests) => {
            (StatusCode::OK, Json(json!({ "success": true, "requests": requests })))
        },
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "success": false,
                "error": e.to_string()
            }))
        )
    }
}

pub async fn get_developer_access(
    State(state): State<AppState>,
    Path(developer_id): Path<String>,
) -> impl IntoResponse {
    match state.services.developer_access.get_active_grants_for_developer(&developer_id).await {
        Ok(access_info) => {
            (StatusCode::OK, Json(json!({ "success": true, "access": access_info })))
        },
        Err(e) => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "success": false,
                "error": e.to_string()
            }))
        )
    }
}

pub async fn get_developer_activity(
    State(state): State<AppState>,
    Path(developer_id): Path<String>,
) -> impl IntoResponse {
    match state.services.developer_access.get_developer_activity(Some(&developer_id), None, None, 100).await {
        Ok(activities) => {
            (StatusCode::OK, Json(json!({ "success": true, "activities": activities })))
        },
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "success": false,
                "error": e.to_string()
            }))
        )
    }
}

pub async fn update_developer_role(
    State(_state): State<AppState>,
    Path(_developer_id): Path<String>,
    Json(_payload): Json<UpdateDeveloperRole>,
) -> impl IntoResponse {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "success": false,
            "error": "Not implemented"
        }))
    )
}

pub async fn emergency_access(
    State(state): State<AppState>,
    Path(developer_id): Path<String>,
    Json(payload): Json<CreateAccessRequest>,
) -> impl IntoResponse {
    match state.services.developer_access.request_access(
        &developer_id,
        &payload.developer_email,
        "emergency",
        &payload.justification,
        payload.requested_tables,
        1
    ).await {
        Ok(res) => (
            StatusCode::CREATED,
            Json(json!({
                "success": true,
                "message": "Emergency access requested",
                "request": res
            }))
        ),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "success": false,
                "error": e.to_string()
            }))
        )
    }
}

pub async fn validate_access_token(
    State(_state): State<AppState>,
    Query(_params): Query<Value>,
) -> impl IntoResponse {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "success": false,
            "error": "Not implemented"
        }))
    )
}