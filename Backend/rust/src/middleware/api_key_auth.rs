//! API key authentication middleware.
//!
//! Guards the `/api/school/:schoolId/system/public/*` routes.
//! Reads the `X-API-Key` header, hashes it with SHA-256, and looks
//! up the hash in the `api_keys` table. On success it injects an
//! [`ApiKeyContext`] extension so downstream handlers can read the
//! verified school_id and scopes without touching the DB again.

use crate::AppState;
use crate::models::system::ApiKeyContext;
use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::IntoResponse,
};
use hex;
use sha2::{Digest, Sha256};
use sqlx::Row;

pub async fn api_key_auth(
    State(state): State<AppState>,
    mut req: Request<Body>,
    next: Next,
) -> Result<impl IntoResponse, StatusCode> {
    // 1. Read the API key from the request header
    let auth_header = req
        .headers()
        .get("X-API-Key")
        .and_then(|h| h.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // 2. Hash the incoming key to compare with the stored hash
    let mut hasher = Sha256::new();
    hasher.update(auth_header.as_bytes());
    let key_hash = hex::encode(hasher.finalize());

    // 3. Look up the key in the database
    let row = sqlx::query(
        "SELECT school_id, scopes FROM api_keys WHERE key_hash = $1 AND status = 'active'",
    )
    .bind(&key_hash)
    .fetch_optional(&state.db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::UNAUTHORIZED)?;

    let school_id: String = row.get("school_id");
    let scopes: Vec<String> = row.get("scopes");

    // 4. Update last_used_at asynchronously (fire-and-forget)
    let pool = state.db.pool.clone();
    let hash_clone = key_hash.clone();
    tokio::spawn(async move {
        let _ = sqlx::query(
            "UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1",
        )
        .bind(hash_clone)
        .execute(&pool)
        .await;
    });

    // 5. Inject context so handlers can read school_id and scopes
    req.extensions_mut()
        .insert(ApiKeyContext { school_id, scopes });

    Ok(next.run(req).await)
}
