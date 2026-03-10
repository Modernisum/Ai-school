use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::AppState;
use std::fs;

#[derive(Serialize)]
pub struct Country {
    pub id: i32,
    pub name: String,
    pub code: String,
    pub phone_code: String,
}

#[derive(Serialize)]
pub struct StateModel {
    pub id: i32,
    pub country_id: i32,
    pub name: String,
}

#[derive(Serialize)]
pub struct District {
    pub id: i32,
    pub state_id: i32,
    pub name: String,
}

// GET /api/geo/countries
pub async fn get_countries(State(state): State<AppState>) -> Json<Vec<Country>> {
    let countries = sqlx::query_as!(
        Country,
        "SELECT id, name, code, phone_code FROM countries ORDER BY name"
    )
    .fetch_all(&state.db.pool)
    .await
    .unwrap_or_default();

    Json(countries)
}

// GET /api/geo/states/:country_id
pub async fn get_states(
    State(state): State<AppState>,
    Path(country_id): Path<i32>,
) -> Json<Vec<StateModel>> {
    let states = sqlx::query_as!(
        StateModel,
        "SELECT id, country_id as \"country_id!\", name FROM states WHERE country_id = $1 ORDER BY name",
        country_id
    )
    .fetch_all(&state.db.pool)
    .await
    .unwrap_or_default();

    Json(states)
}

// GET /api/geo/districts/:state_id
pub async fn get_districts(
    State(state): State<AppState>,
    Path(state_id): Path<i32>,
) -> Json<Vec<District>> {
    let districts = sqlx::query_as!(
        District,
        "SELECT id, state_id as \"state_id!\", name FROM districts WHERE state_id = $1 ORDER BY name",
        state_id
    )
    .fetch_all(&state.db.pool)
    .await
    .unwrap_or_default();

    Json(districts)
}

// GET /api/geo/export
pub async fn export_geo_json() -> Json<Value> {
    let path = "Backup/geo.json";
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
    // Save to backup file
    let path = "Backup/geo.json";
    if fs::write(path, serde_json::to_string_pretty(&payload).unwrap_or_default()).is_err() {
        return Json(serde_json::json!({"success": false, "message": "Failed to write backup file"}));
    }

    // Trigger auto_restore to load data into database
    match state.backup.auto_restore().await {
        Ok(_) => Json(serde_json::json!({"success": true, "message": "Geo data imported successfully"})),
        Err(e) => Json(serde_json::json!({"success": false, "message": format!("Import error: {}", e)})),
    }
}
