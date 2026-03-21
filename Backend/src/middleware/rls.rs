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
    // 1. Extract school_id from headers (or JWT in a real scenario)
    // For now, we'll look for 'X-School-ID' or the authorization header
    let school_id = request.headers()
        .get("X-School-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    // 2. Identify if it's a super admin (simplified check for now)
    let is_super_admin = request.headers()
        .get("X-Is-Super-Admin")
        .and_then(|v| v.to_str().ok()) == Some("true");

    // 3. Extract admin_id (or user_id) for audit tracking
    let admin_id = request.headers()
        .get("X-Admin-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "unknown_admin".to_string());

    if let Some(sid) = school_id {
        // Store in extensions so services can access it if needed
        request.extensions_mut().insert(TenantContext { 
            school_id: sid.clone(), 
            is_super_admin,
            admin_id
        });
    } else if !is_super_admin {
        // If no school_id and not super admin, we might want to block
        // but for now we'll allow it and let the DB RLS block it if needed
    }

    Ok(next.run(request).await)
}

#[derive(Clone, Debug)]
pub struct TenantContext {
    pub school_id: String,
    pub is_super_admin: bool,
    pub admin_id: String,
}
