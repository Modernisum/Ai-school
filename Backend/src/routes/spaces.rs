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

pub async fn get_space_categories(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.resource.get_space_categories(&school_id).await {
        Ok(list) => Json(json!({"success": true, "data": list})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn create_space_category(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state.services.resource.create_space_category(&school_id, payload).await {
        Ok(data) => Json(json!({"success": true, "data": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn create_space(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state.services.resource.create_space(&school_id, payload).await {
        Ok(data) => Json(json!({"success": true, "space": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn get_space_details(
    State(state): State<AppState>,
    Path((school_id, space_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state.services.resource.get_space_details(&school_id, &space_id).await {
        Ok(Some(data)) => Json(json!({"success": true, "space": data})).into_response(),
        Ok(None) => (
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({"success": false, "message": "Space not found"})),
        )
            .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn assign_space_materials(
    State(state): State<AppState>,
    Path((school_id, space_id)): Path<(String, String)>,
    Json(payload): Json<Vec<serde_json::Value>>,
) -> impl IntoResponse {
    match state.services.resource.assign_space_materials(&school_id, &space_id, payload).await {
        Ok(_) => Json(json!({"success": true, "message": "Materials assigned successfully"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn assign_space_employees(
    State(state): State<AppState>,
    Path((school_id, space_id)): Path<(String, String)>,
    Json(payload): Json<Vec<String>>,
) -> impl IntoResponse {
    match state.services.resource.assign_space_employees(&school_id, &space_id, payload).await {
        Ok(_) => Json(json!({"success": true, "message": "Employees assigned successfully"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn remove_space_employee(
    State(state): State<AppState>,
    Path((school_id, space_id, employee_id)): Path<(String, String, String)>,
) -> impl IntoResponse {
    match state.services.resource.remove_space_employee(&school_id, &space_id, &employee_id).await {
        Ok(_) => Json(json!({"success": true, "message": "Employee removed successfully"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
