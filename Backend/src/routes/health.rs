//! Health check endpoints for monitoring and load balancers
//! 
//! Provides endpoints to check the health status of the backend services
//! including database connectivity, Redis connectivity, and overall system status.

use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Instant;

use crate::AppState;

/// Health check response structure
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthCheckResponse {
    pub status: String,
    pub timestamp: String,
    pub uptime: u64,
    pub checks: Vec<HealthCheck>,
}

/// Individual health check result
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthCheck {
    pub name: String,
    pub status: String,
    pub duration_ms: u128,
    pub error: Option<String>,
}

/// Simple health check endpoint
/// 
/// Returns 200 OK if the service is running
/// Used by load balancers and monitoring systems
pub async fn health_check() -> Json<serde_json::Value> {
    Json(json!({
        "status": "healthy",
        "service": "modern_school_backend",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "version": env!("CARGO_PKG_VERSION")
    }))
}

/// Comprehensive health check with dependency verification
/// 
/// Checks:
/// - Database connectivity
/// - Redis connectivity
/// - Storage availability
/// - Overall system status
pub async fn health_check_detailed(State(state): State<AppState>) -> Result<Json<HealthCheckResponse>, StatusCode> {
    let start_time = Instant::now();
    let mut checks = Vec::new();

    // Check database connectivity
    let db_start = Instant::now();
    let db_status = check_database(&state).await;
    let db_duration = db_start.elapsed().as_millis();
    checks.push(HealthCheck {
        name: "database".to_string(),
        status: if db_status.is_ok() { "healthy".to_string() } else { "unhealthy".to_string() },
        duration_ms: db_duration,
        error: db_status.err(),
    });

    // Check Redis connectivity
    let redis_start = Instant::now();
    let redis_status = check_redis(&state).await;
    let redis_duration = redis_start.elapsed().as_millis();
    checks.push(HealthCheck {
        name: "redis".to_string(),
        status: if redis_status.is_ok() { "healthy".to_string() } else { "unhealthy".to_string() },
        duration_ms: redis_duration,
        error: redis_status.err(),
    });

    // Check storage availability
    let storage_start = Instant::now();
    let storage_status = check_storage(&state).await;
    let storage_duration = storage_start.elapsed().as_millis();
    checks.push(HealthCheck {
        name: "storage".to_string(),
        status: if storage_status.is_ok() { "healthy".to_string() } else { "unhealthy".to_string() },
        duration_ms: storage_duration,
        error: storage_status.err(),
    });

    // Determine overall status
    let all_healthy = checks.iter().all(|c| c.status == "healthy");
    let overall_status = if all_healthy { "healthy" } else { "degraded" };

    let response = HealthCheckResponse {
        status: overall_status.to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        uptime: start_time.elapsed().as_secs(),
        checks,
    };

    if all_healthy {
        Ok(Json(response))
    } else {
        Err(StatusCode::SERVICE_UNAVAILABLE)
    }
}

/// Check database connectivity
async fn check_database(state: &AppState) -> Result<(), String> {
    // Try to execute a simple query
    match sqlx::query("SELECT 1")
        .execute(&state.db.pool)
        .await
    {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Database connection failed: {}", e)),
    }
}

/// Check Redis connectivity
async fn check_redis(state: &AppState) -> Result<(), String> {
    // Try to ping Redis
    match state.db.redis.get().await {
        Ok(mut conn) => {
            match redis::cmd("PING").query_async::<_, String>(&mut conn).await {
                Ok(pong) if pong == "PONG" => Ok(()),
                Ok(_) => Err("Unexpected Redis response".to_string()),
                Err(e) => Err(format!("Redis ping failed: {}", e)),
            }
        }
        Err(e) => Err(format!("Redis connection failed: {}", e)),
    }
}

/// Check storage availability
async fn check_storage(state: &AppState) -> Result<(), String> {
    // Check if upload directory exists and is writable
    let upload_dir = &state.storage.upload_dir;
    match std::fs::metadata(upload_dir) {
        Ok(metadata) => {
            if metadata.is_dir() {
                // Try to create a test file
                let test_file = format!("{}/.health_test", upload_dir);
                match std::fs::write(&test_file, "test") {
                    Ok(_) => {
                        let _ = std::fs::remove_file(&test_file);
                        Ok(())
                    }
                    Err(e) => Err(format!("Storage directory not writable: {}", e)),
                }
            } else {
                Err("Storage path is not a directory".to_string())
            }
        }
        Err(e) => Err(format!("Storage directory not accessible: {}", e)),
    }
}

/// Readiness check for Kubernetes
/// 
/// Returns 200 when the service is ready to accept traffic
pub async fn readiness_check() -> (StatusCode, &'static str) {
    (StatusCode::OK, "ready")
}

/// Liveness check for Kubernetes
/// 
/// Returns 200 when the service is alive (but may not be ready)
pub async fn liveness_check() -> (StatusCode, &'static str) {
    (StatusCode::OK, "alive")
}