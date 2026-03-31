use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
    http::StatusCode,
};
use crate::AppState;

pub async fn rls_middleware(
    State(_state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // 1. Generate or extract Request ID
    let request_id = request.headers()
        .get("X-Request-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    // 2. Extract school_id from headers
    let school_id = request.headers()
        .get("X-School-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    // 3. Identify if it's a super admin
    let is_super_admin = request.headers()
        .get("X-Is-Super-Admin")
        .and_then(|v| v.to_str().ok()) == Some("true");

    // 4. Extract admin_id
    let admin_id = request.headers()
        .get("X-Admin-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "unknown_admin".to_string());

    // 5. Update tracing span with context
    let span = tracing::Span::current();
    span.record("school_id", school_id.as_deref().unwrap_or("none"));
    span.record("admin_id", &admin_id);
    span.record("request_id", &request_id);

    println!("[Request] {} {}", request.method(), request.uri());

    // 6. Always insert TenantContext
    let sid = school_id.clone().unwrap_or_else(|| "default_school".to_string());
    request.extensions_mut().insert(TenantContext { 
        _school_id: sid, 
        _is_super_admin: is_super_admin,
        admin_id
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
}
