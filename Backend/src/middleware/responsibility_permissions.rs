// Responsibility Permission Middleware
// Validates user permissions for responsibility operations

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use crate::services::responsibility_permissions::{
    check_permission, ResponsibilityPermission,
};

pub async fn responsibility_permission_middleware(
    required_permission: ResponsibilityPermission,
    request: Request,
    next: Next,
) -> Response {
    // Extract user permissions from TenantContext
    let user_permissions = request
        .extensions()
        .get::<crate::middleware::rls::TenantContext>()
        .map(|ctx| ctx.user_permissions.clone())
        .unwrap_or_default();

    // Check if user has required permission
    if !check_permission(&required_permission, &user_permissions) {
        return Json(json!({
            "success": false,
            "message": format!(
                "Permission denied. Required: {}",
                required_permission.as_str()
            ),
            "required_permission": required_permission.as_str(),
        }))
        .into_response();
    }

    // Proceed to next handler
    next.run(request).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_middleware_allows_valid_permission() {
        // This would need a mock setup in actual tests
        // For now, just verify the module compiles
    }
}
