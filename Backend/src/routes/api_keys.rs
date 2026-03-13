use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use hex;
use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};
use serde::Deserialize;
use serde_json::json;
use sha2::{Digest, Sha256};
use sqlx::Row;

#[derive(Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    pub scopes: Vec<String>,
}

/// POST /api/school/:schoolId/api-keys
/// Generates a new API key. Returns the plaintext key ONLY ONCE.
pub async fn generate_api_key(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<CreateApiKeyRequest>,
) -> impl IntoResponse {
    // 1. Generate a secure random key
    let key_id: String = thread_rng()
        .sample_iter(&Alphanumeric)
        .take(12)
        .map(char::from)
        .collect();

    let key_secret: String = thread_rng()
        .sample_iter(&Alphanumeric)
        .take(32)
        .map(char::from)
        .collect();

    let full_key = format!("vk_{}_{}", key_id, key_secret); // vk = vidhyam key

    // 2. Hash the full key for storage
    let mut hasher = Sha256::new();
    hasher.update(full_key.as_bytes());
    let key_hash = hex::encode(hasher.finalize());

    // 3. Save metadata to DB
    match sqlx::query(
        "INSERT INTO api_keys (school_id, key_id, key_hash, name, scopes, status)
         VALUES ($1, $2, $3, $4, $5, 'active')",
    )
    .bind(&school_id)
    .bind(&key_id)
    .bind(&key_hash)
    .bind(&payload.name)
    .bind(&payload.scopes)
    .execute(&state.db.pool)
    .await
    {
        Ok(_) => Json(json!({
            "success": true,
            "key_id": key_id,
            "api_key": full_key, // Standard practice: return plaintext only once at creation
            "message": "Store this key safely! It will not be shown again."
        }))
        .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// GET /api/school/:schoolId/api-keys
pub async fn list_api_keys(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match sqlx::query(
        "SELECT id, key_id, name, scopes, status, last_used_at, created_at 
         FROM api_keys WHERE school_id = $1",
    )
    .bind(&school_id)
    .fetch_all(&state.db.pool)
    .await
    {
        Ok(rows) => {
            let keys: Vec<_> = rows.iter().map(|r| {
                json!({
                    "id": r.get::<i32, _>("id"),
                    "key_id": r.get::<String, _>("key_id"),
                    "name": r.get::<String, _>("name"),
                    "scopes": r.get::<Vec<String>, _>("scopes"),
                    "status": r.get::<String, _>("status"),
                    "last_used_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_attempt_at").map(|d| d.to_rfc3339()),
                    "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                })
            }).collect();
            Json(json!({"success": true, "api_keys": keys})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// DELETE /api/school/:schoolId/api-keys/:keyId
pub async fn revoke_api_key(
    State(state): State<AppState>,
    Path((school_id, key_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match sqlx::query(
        "UPDATE api_keys SET status = 'revoked', updated_at = NOW() 
         WHERE school_id = $1 AND key_id = $2",
    )
    .bind(&school_id)
    .bind(&key_id)
    .execute(&state.db.pool)
    .await
    {
        Ok(_) => Json(json!({"success": true, "message": "API key revoked"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

// --- Middleware Implementation ---

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::middleware::Next;

#[derive(Debug, Clone)]
pub struct ApiKeyContext {
    pub school_id: String,
    pub scopes: Vec<String>,
}

pub async fn api_key_auth(
    State(state): State<AppState>,
    mut req: Request<Body>,
    next: Next,
) -> Result<impl IntoResponse, StatusCode> {
    let auth_header = req
        .headers()
        .get("X-API-Key")
        .and_then(|h| h.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // 1. Hash the incoming key to compare with stored hash
    let mut hasher = Sha256::new();
    hasher.update(auth_header.as_bytes());
    let key_hash = hex::encode(hasher.finalize());

    // 2. Look up key in DB
    let row = sqlx::query(
        "SELECT school_id, scopes, status FROM api_keys WHERE key_hash = $1 AND status = 'active'",
    )
    .bind(&key_hash)
    .fetch_optional(&state.db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::UNAUTHORIZED)?;

    let school_id: String = row.get("school_id");
    let scopes: Vec<String> = row.get("scopes");

    // 3. Update last_used_at (fire and forget)
    let pool_clone = state.db.pool.clone();
    let key_hash_clone = key_hash.clone();
    tokio::spawn(async move {
        let _ = sqlx::query("UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1")
            .bind(key_hash_clone)
            .execute(&pool_clone)
            .await;
    });

    // 4. Inject context into request extensions
    req.extensions_mut()
        .insert(ApiKeyContext { school_id, scopes });

    Ok(next.run(req).await)
}
