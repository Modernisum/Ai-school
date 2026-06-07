use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Extension, Json, Router,
};
use crate::middleware::rls::TenantContext;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::Row;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::AppState;
use crate::models::system::{GpsUpdatePayload, GpsEvent, PickupRequest};



pub async fn publish_gps(
    State(_state): State<AppState>,
    Path((school_id, vehicle_id)): Path<(String, String)>,
    Json(payload): Json<GpsUpdatePayload>,
) -> impl IntoResponse {
    let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let event = GpsEvent { vehicle_id: vehicle_id.clone(), lat: payload.lat, lng: payload.lng, speed: payload.speed.unwrap_or(0.0), timestamp: ts };

    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL env var must be set");
    if let Ok(redis_client) = redis::Client::open(redis_url) {
        if let Ok(mut conn) = redis_client.get_multiplexed_async_connection().await {
            let key = format!("school:{}:transport:{}", school_id, vehicle_id);
            let event_json = serde_json::to_string(&event).unwrap_or_default();
            let _: Result<(), _> = redis::AsyncCommands::set_ex(&mut conn, &key, &event_json, 600u64).await;
            let _: Result<(), _> = redis::AsyncCommands::publish(&mut conn, key, event_json).await;
        }
    }
    (StatusCode::OK, "GPS Updated").into_response()
}

pub async fn get_bus_location(
    State(_state): State<AppState>,
    Path((school_id, vehicle_id)): Path<(String, String)>,
) -> impl IntoResponse {
    let redis_url = std::env::var("REDIS_URL").unwrap_or_default();
    if redis_url.is_empty() {
        return (StatusCode::SERVICE_UNAVAILABLE, Json(json!({"success": false, "message": "Redis not configured"}))).into_response();
    }
    let key = format!("school:{}:transport:{}", school_id, vehicle_id);
    if let Ok(redis_client) = redis::Client::open(redis_url) {
        if let Ok(mut conn) = redis_client.get_multiplexed_async_connection().await {
            let msg: Option<String> = redis::AsyncCommands::get(&mut conn, &key).await.unwrap_or(None);
            if let Some(msg) = msg {
                if let Ok(event) = serde_json::from_str::<GpsEvent>(&msg) {
                    return Json(json!({"success": true, "data": event})).into_response();
                }
            }
        }
    }
    (StatusCode::NOT_FOUND, Json(json!({"success": false, "message": "No GPS data available"}))).into_response()
}

pub async fn get_driver_students(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    let driver_id = &tenant_ctx.admin_id;
    let rows = sqlx::query(
        "SELECT s.student_id, s.name, s.class_name, s.parent_phone \
         FROM employee_responsibilities er \
         JOIN responsibilities r ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id \
         JOIN space_employees se ON se.space_id = ANY(er.space_ids) AND se.school_id = er.school_id \
         JOIN students s ON s.class_id = se.space_id AND s.school_id = er.school_id \
         WHERE er.employee_id = $1 AND er.school_id = $2 AND r.employee_type = 'driver'"
    )
    .bind(driver_id).bind(&school_id)
    .fetch_all(&state.db.pool)
    .await;

    match rows {
        Ok(rows) => {
            let students: Vec<serde_json::Value> = rows.iter().map(|r| json!({
                "studentId": r.get::<String, _>("student_id"),
                "name": r.get::<String, _>("name"),
                "className": r.get::<String, _>("class_name"),
                "parentPhone": r.get::<Option<String>, _>("parent_phone"),
            })).collect();
            Json(json!({"success": true, "data": students, "count": students.len()})).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        ).into_response(),
    }
}



pub async fn mark_pickup_attendance(
    State(state): State<AppState>,
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<PickupRequest>,
) -> impl IntoResponse {
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let mut marked = 0i32;

    for sid in &payload.student_ids {
        let data = json!({
            "date": today,
            "status": payload.status,
            "markedBy": tenant_ctx.admin_id,
            "inTime": chrono::Utc::now().format("%H:%M").to_string(),
            "note": format!("Driver pickup — {}", payload.status),
            "vehicle_id": payload.vehicle_id
        });
        if state.services.attendance.mark_attendance(&school_id, "student", sid, &tenant_ctx.admin_id, data).await.is_ok() {
            marked += 1;
        }
    }

    Json(json!({"success": true, "marked": marked, "total": payload.student_ids.len()})).into_response()
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/gps/:vehicleId", post(publish_gps))
        .route("/bus-location/:vehicleId", get(get_bus_location))
        .route("/driver-students", get(get_driver_students))
        .route("/mark-pickup", post(mark_pickup_attendance))
}
