//! Upload authentication middleware.
//!
//! Guards the `/uploads` static-file endpoint. Requires either:
//!   - A `Bearer <token>` `Authorization` header, or
//!   - A `?token=<token>` query parameter
//! matching the `UPLOAD_TOKEN` environment variable.
//!
//! If `UPLOAD_TOKEN` is not set the endpoint is open (dev mode).

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use std::env;

pub async fn upload_auth_middleware(
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    if let Ok(expected_token) = env::var("UPLOAD_TOKEN") {
        let token = request
            .headers()
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .unwrap_or_else(|| {
                request
                    .uri()
                    .query()
                    .and_then(|q| {
                        q.split('&')
                            .find(|pair| pair.starts_with("token="))
                            .map(|pair| pair.trim_start_matches("token="))
                    })
                    .unwrap_or("")
            });

        if token != expected_token {
            return Err(StatusCode::UNAUTHORIZED);
        }
    }

    Ok(next.run(request).await)
}
