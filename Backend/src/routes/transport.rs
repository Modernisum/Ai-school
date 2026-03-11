use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::post,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use redis::AsyncCommands;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::AppState;

#[derive(Deserialize)]
pub struct GpsUpdatePayload {
    pub lat: f64,
    pub lng: f64,
    pub speed: Option<f64>,
}

#[derive(Serialize)]
pub struct GpsEvent {
    pub vehicle_id: String,
    pub lat: f64,
    pub lng: f64,
    pub speed: f64,
    pub timestamp: u64,
}

pub async fn publish_gps(
    State(_state): State<AppState>,
    Path((school_id, vehicle_id)): Path<(String, String)>,
    Json(payload): Json<GpsUpdatePayload>,
) -> impl IntoResponse {
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let event = GpsEvent {
        vehicle_id: vehicle_id.clone(),
        lat: payload.lat,
        lng: payload.lng,
        speed: payload.speed.unwrap_or(0.0),
        timestamp: ts,
    };

    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1/".to_string());
    if let Ok(redis_client) = redis::Client::open(redis_url) {
        if let Ok(mut pubsub_conn) = redis_client.get_multiplexed_async_connection().await {
            // Channel specific to a vehicle for a school, parents can subscribe to this via WS
            let channel_name = format!("school:{}:transport:{}", school_id, vehicle_id);
            if let Ok(msg_json) = serde_json::to_string(&event) {
                let _: Result<(), _> = pubsub_conn.publish(channel_name, msg_json).await;
            }
        }
    }

    (StatusCode::OK, "GPS Updated").into_response()
}

pub fn router() -> Router<AppState> {
    Router::new().route("/:schoolId/gps/:vehicleId", post(publish_gps))
}
