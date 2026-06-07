use crate::AppState;
use crate::models::system::CreateApiKeyRequest;

use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use hex;
use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};
use serde_json::json;
use sha2::{Digest, Sha256};

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

    // 3. Save metadata to DB via repository
    match state.repos.api_key.generate_api_key(&school_id, &key_id, &key_hash, &payload.name, &payload.scopes).await {
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
    match state.repos.api_key.list_api_keys(&school_id).await {
        Ok(keys) => Json(json!({"success": true, "api_keys": keys})).into_response(),
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
    match state.repos.api_key.revoke_api_key(&school_id, &key_id).await {
        Ok(_) => Json(json!({"success": true, "message": "API key revoked"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
