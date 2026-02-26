use crate::AppState;
use axum::{
    extract::{Path, State},
    http::HeaderMap,
    response::IntoResponse,
    Json,
};
use serde_json::json;

/// Helper: extract Bearer token from Authorization header
fn extract_token(headers: &HeaderMap) -> Option<String> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|s| s.to_string())
}

pub async fn get_school_details(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.school.get_school_details(&school_id).await {
        Ok(details) => Json(serde_json::json!({"success": true, "data": details})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

/// School-level self-update endpoint.
/// Schools update their own profile using their accessToken (JWT stored in the school auth table).
pub async fn update_school_self(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    // Verify that a token is present (basic auth gating)
    // The school's accessToken is validated by the existing token system
    let _token = match extract_token(&headers) {
        Some(t) => t,
        None => {
            return (
                axum::http::StatusCode::UNAUTHORIZED,
                Json(json!({"success": false, "message": "Authorization token required"})),
            )
                .into_response();
        }
    };

    // Build a flat JSON update object that the DB can merge with data || $1
    // We accept schoolName at top level + all other fields go into data
    let school_name = payload["schoolName"].as_str();
    let update_data = payload.clone();

    // Update the data jsonb column via merge, and optionally school_name
    let result = sqlx::query(
        "UPDATE schools SET data = COALESCE(data, '{}'::jsonb) || $1::jsonb, updated_at = NOW() WHERE school_id = $2"
    )
    .bind(&update_data)
    .bind(&school_id)
    .execute(&state.db.pool)
    .await;

    match result {
        Err(e) => return (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
        Ok(_) => {}
    }

    // If schoolName is provided, update the dedicated column too
    if let Some(name) = school_name {
        let _ = sqlx::query(
            "UPDATE schools SET school_name = $1 WHERE school_id = $2"
        )
        .bind(name)
        .bind(&school_id)
        .execute(&state.db.pool)
        .await;
    }

    Json(json!({"success": true, "message": "School profile updated successfully"})).into_response()
}

/// School self-service password change (uses school's own accessToken)
pub async fn change_password_self(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let _token = match extract_token(&headers) {
        Some(t) => t,
        None => {
            return (
                axum::http::StatusCode::UNAUTHORIZED,
                Json(json!({"success": false, "message": "Authorization token required"})),
            )
                .into_response();
        }
    };

    let new_password = match payload["newPassword"].as_str().or(payload["password"].as_str()) {
        Some(p) if p.len() >= 6 => p.to_string(),
        Some(_) => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(json!({"success": false, "message": "Password must be at least 6 characters"})),
            ).into_response();
        }
        None => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(json!({"success": false, "message": "newPassword is required"})),
            ).into_response();
        }
    };

    let hashed = match bcrypt::hash(&new_password, 10) {
        Ok(h) => h,
        Err(e) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"success": false, "message": e.to_string()})),
            ).into_response();
        }
    };

    match sqlx::query(
        "UPDATE auth SET data = COALESCE(data, '{}'::jsonb) || $1::jsonb WHERE school_id = $2"
    )
    .bind(json!({"password": hashed}))
    .bind(&school_id)
    .execute(&state.db.pool)
    .await
    {
        Ok(_) => Json(json!({"success": true, "message": "Password updated successfully"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}
