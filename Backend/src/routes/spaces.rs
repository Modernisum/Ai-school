use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;

pub async fn list_spaces(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.resource.list_spaces(&school_id).await {
        Ok(list) => Json(serde_json::json!({"success": true, "data": list})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

// POST /api/spaces/:schoolId/spaces/bulk
pub async fn bulk_import_spaces(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let rows = match payload["spaces"].as_array().or(payload.as_array()) {
        Some(r) => r.clone(),
        None => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(json!({"success": false, "message": "Expected a 'spaces' array"})),
            ).into_response();
        }
    };

    let mut success_count = 0usize;
    let mut fail_count = 0usize;
    let mut results = Vec::new();

    for (i, row) in rows.iter().enumerate() {
        let space_name = row.get("Space Name")
            .or(row.get("spaceName"))
            .or(row.get("name"))
            .and_then(|v| v.as_str())
            .unwrap_or("Unnamed Space")
            .to_string();

        let space_data = json!({ "spaceName": space_name });
        match state.services.resource.create_announcement(
            &school_id, "spaces", "", space_data
        ).await {
            Ok(_) => {
                success_count += 1;
                results.push(json!({"row": i + 1, "status": "success", "spaceName": space_name}));
            }
            Err(e) => {
                fail_count += 1;
                results.push(json!({"row": i + 1, "status": "error", "message": e.to_string()}));
            }
        }
    }

    Json(json!({
        "success": true,
        "message": format!("{} spaces imported, {} failed", success_count, fail_count),
        "results": results,
        "successCount": success_count,
        "failCount": fail_count,
    })).into_response()
}
