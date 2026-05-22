use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
    http::StatusCode,
};
use crate::AppState;
use jsonwebtoken;
use serde::Deserialize;

#[derive(Deserialize)]
struct AdminJwtClaims {
    sub: String,
    school_id: String,
    role: String,
    permissions: Vec<String>,
    exp: usize,
}

pub async fn rls_middleware(
    State(_state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let request_id = request.headers()
        .get("X-Request-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let school_id = request.headers()
        .get("X-School-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let is_super_admin = request.headers()
        .get("X-Is-Super-Admin")
        .and_then(|v| v.to_str().ok()) == Some("true");

    let admin_id = request.headers()
        .get("X-Admin-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "unknown_admin".to_string());

    // Try to extract permissions from JWT Authorization header
    let mut user_permissions = vec!["authenticated".to_string()];
    if let Some(auth_header) = request.headers().get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET environment variable must be set in production");
                if let Ok(jwt_data) = jsonwebtoken::decode::<AdminJwtClaims>(
                    token,
                    &jsonwebtoken::DecodingKey::from_secret(secret.as_ref()),
                    &jsonwebtoken::Validation::default(),
                ) {
                    user_permissions = jwt_data.claims.permissions;
                }
            }
        }
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
    
    // 7. Propagate Request ID back to client
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
