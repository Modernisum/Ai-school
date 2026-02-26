use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;

pub async fn list_materials(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.resource.list_materials(&school_id).await {
        Ok(list) => Json(json!({"success": true, "data": list})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn buy_material(
    State(state): State<AppState>,
    Path((school_id, material_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state
        .services
        .resource
        .update_material(&school_id, &material_id, payload)
        .await
    {
        Ok(_) => {
            Json(json!({"success": true, "message": "Material purchase recorded"})).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

// POST /api/materials/:schoolId/bulk
pub async fn bulk_import_materials(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let rows = match payload["materials"].as_array().or(payload.as_array()) {
        Some(r) => r.clone(),
        None => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(json!({"success": false, "message": "Expected a 'materials' array"})),
            ).into_response();
        }
    };

    let mut success_count = 0usize;
    let mut fail_count = 0usize;
    let mut results = Vec::new();

    for (i, row) in rows.iter().enumerate() {
        let mat_data = json!({
            "materialName": row.get("Material Name").or(row.get("materialName")).unwrap_or(&serde_json::Value::Null),
            "quantity": row.get("Quantity").or(row.get("quantity")).unwrap_or(&serde_json::Value::Null),
            "unitPrice": row.get("Unit Price").or(row.get("unitPrice")).unwrap_or(&serde_json::Value::Null),
        });

        match state.services.resource.create_material(&school_id, mat_data).await {
            Ok(_) => {
                success_count += 1;
                results.push(json!({"row": i + 1, "status": "success"}));
            }
            Err(e) => {
                fail_count += 1;
                results.push(json!({"row": i + 1, "status": "error", "message": e.to_string()}));
            }
        }
    }

    Json(json!({
        "success": true,
        "message": format!("{} materials imported, {} failed", success_count, fail_count),
        "results": results,
        "successCount": success_count,
        "failCount": fail_count,
    })).into_response()
}
