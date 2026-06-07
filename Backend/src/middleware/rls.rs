use axum::{
    extract::{Request, State},
    middleware::Next,
    response::{IntoResponse, Response},
    http::StatusCode,
};
use crate::AppState;

pub async fn rls_middleware(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, Response> {
    let request_id = request.headers()
        .get("X-Request-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let mut school_id = request.headers()
        .get("X-School-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let is_super_admin = request.headers()
        .get("X-Is-Super-Admin")
        .and_then(|v| v.to_str().ok()) == Some("true");

    let mut admin_id = request.headers()
        .get("X-Admin-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "unknown_admin".to_string());

    let path = request.uri().path();
    let is_public = path == "/"
        || path == "/health"
        || path.starts_with("/uploads")
        || path.starts_with("/api/cms")
        || path.starts_with("/api/geo")
        || path.starts_with("/api/setup")
        || path.starts_with("/api/admin")
        || path.ends_with("/login")
        || path == "/api/auth/school/forgot-password"
        || path == "/api/auth/school/verify-otp"
        || path == "/api/auth/school/change-password"
        || path == "/api/auth/school/support"
        || path.ends_with("/mobile/select-profile");

    let mut user_permissions = vec!["authenticated".to_string()];
    let mut has_valid_token = false;

    if let Some(auth_header) = request.headers().get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                match state.services.auth.verify_token(token).await {
                    Ok(token_data) => {
                        has_valid_token = true;
                        
                        // Extract school_id if available in token
                        if let Some(sid) = token_data["schoolId"].as_str() {
                            school_id = Some(sid.to_string());
                        }
                        
                        // Extract user/admin ID
                        if let Some(sub) = token_data["sub"].as_str() {
                            admin_id = sub.to_string();
                        }
                        
                        // Extract permissions/roles
                        if let Some(perms) = token_data["permissions"].as_array() {
                            user_permissions = perms.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect();
                        } else if let Some(role) = token_data["role"].as_str() {
                            user_permissions = vec![role.to_string()];
                        }
                    }
                    Err(e) => {
                        if !is_public {
                            return Err((
                                StatusCode::UNAUTHORIZED,
                                axum::Json(serde_json::json!({
                                    "success": false,
                                    "message": format!("Invalid or expired token: {}", e)
                                }))
                            ).into_response());
                        }
                    }
                }
            }
        }
    }

    if !has_valid_token && !is_public {
        return Err((
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({
                "success": false,
                "message": "Missing authorization token"
            }))
        ).into_response());
    }

    let span = tracing::Span::current();
    span.record("school_id", school_id.as_deref().unwrap_or("none"));
    span.record("admin_id", &admin_id);
    span.record("request_id", &request_id);

    let sid = school_id.clone().unwrap_or_else(|| "default_school".to_string());
    request.extensions_mut().insert(TenantContext {
        _school_id: sid,
        _is_super_admin: is_super_admin,
        admin_id,
        user_permissions,
    });

    let mut response = next.run(request).await;
    
    // Propagate Request ID back to client
    if let Ok(header_value) = request_id.parse() {
        response.headers_mut().insert("X-Request-ID", header_value);
    }

    Ok(response)
}

#[derive(Clone, Debug)]
pub struct TenantContext {
    pub _school_id: String,
    pub _is_super_admin: bool,
    pub admin_id: String,
    pub user_permissions: Vec<String>,
}
