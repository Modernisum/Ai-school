use axum::{
    extract::{Path, State},
    Json,
};
use serde::Serialize;
use serde_json::Value;

use crate::AppState;
use crate::models::system::{Country, StateModel, District};
use std::fs;

// GET /api/geo/countries
pub async fn get_countries(State(state): State<AppState>) -> Json<Vec<Country>> {
    let countries = state.repos.geo.get_countries()
        .await
        .unwrap_or_default();

    Json(countries)
}

// GET /api/geo/states/:country_id
pub async fn get_states(
    State(state): State<AppState>,
    Path(country_id): Path<i32>,
) -> Json<Vec<StateModel>> {
    let states = state.repos.geo.get_states(country_id)
        .await
        .unwrap_or_default();

    Json(states)
}

// GET /api/geo/districts/:state_id
pub async fn get_districts(
    State(state): State<AppState>,
    Path(state_id): Path<i32>,
) -> Json<Vec<District>> {
    let districts = state.repos.geo.get_districts(state_id)
        .await
        .unwrap_or_default();

    Json(districts)
}

// GET /api/geo/export
pub async fn export_geo_json(State(_state): State<AppState>) -> Json<Value> {
    let path = "Backup/geo.json";
    
    // Local filesystem read
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(json) = serde_json::from_str(&content) {
            return Json(json);
        }
    }
    
    Json(serde_json::json!([]))
}

// POST /api/geo/import
pub async fn import_geo_json(
    State(state): State<AppState>,
    Json(payload): Json<Value>,
) -> Json<serde_json::Value> {
    // Save to backup file (local)
    let path = "Backup/geo.json";
    let content = serde_json::to_string_pretty(&payload).unwrap_or_default();
    fs::write(path, &content).ok();

    // Trigger auto_restore to load data into database
    match state.backup.auto_restore().await {
        Ok(_) => {
            Json(serde_json::json!({"success": true, "message": "Geo data imported successfully"}))
        }
        Err(e) => {
            Json(serde_json::json!({"success": false, "message": format!("Import error: {}", e)}))
        }
    }
}
