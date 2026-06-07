//! Unified health check endpoint for comprehensive system monitoring
//! 
//! Provides a single `GET /health` endpoint that returns:
//! - Overall system status (healthy / degraded / critical)
//! - Dependency checks (database, redis, storage) with latency
//! - Performance metrics (DB pool stats, Redis info, memory/CPU)
//! - Active alerts for any failing dependency
//! - Uptime and version info
//!
//! Removed: `GET /health/alive`, `GET /health/ready`, `GET /health/detailed`
//! All functionality is now unified under `GET /health`.

use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use std::time::Instant;

use crate::AppState;
use crate::models::system::{
    UnifiedHealthResponse, DependencyChecks, DependencyStatus, SystemMetrics, HealthAlert,
};



// ── Global start time (set once at process launch) ──────────────────────

static START_TIME: OnceLock<Instant> = OnceLock::new();

/// Call once during server startup to record the process start instant
pub fn record_start_time() {
    let _ = START_TIME.set(Instant::now());
}

fn get_uptime() -> u64 {
    START_TIME.get().map(|t| t.elapsed().as_secs()).unwrap_or(0)
}

fn format_uptime(secs: u64) -> String {
    let days = secs / 86400;
    let hours = (secs % 86400) / 3600;
    let minutes = (secs % 3600) / 60;
    let seconds = secs % 60;
    if days > 0 {
        format!("{}d {}h {}m {}s", days, hours, minutes, seconds)
    } else if hours > 0 {
        format!("{}h {}m {}s", hours, minutes, seconds)
    } else {
        format!("{}m {}s", minutes, seconds)
    }
}

// ── Unified Health Endpoint ─────────────────────────────────────────────

/// `GET /health` – Unified health check endpoint
///
/// Returns comprehensive system status including:
/// - Overall status derived from dependency health
/// - Per-dependency latency and status
/// - DB pool metrics, memory usage
/// - Active alerts for any failing component
///
/// HTTP 200 when healthy/degraded, 503 when critical.
pub async fn unified_health_check(
    State(state): State<AppState>,
) -> (StatusCode, Json<UnifiedHealthResponse>) {
    let check_start = Instant::now();
    let mut alerts: Vec<HealthAlert> = Vec::new();
    let now = chrono::Utc::now().to_rfc3339();

    // ── Database check ───────────────────────────────────────────────
    let db_start = Instant::now();
    let db_result = check_database(&state).await;
    let db_latency = db_start.elapsed().as_millis();
    let db_status = match &db_result {
        Ok(detail) => "healthy".to_string(),
        Err(e) => {
            alerts.push(HealthAlert {
                severity: "critical".to_string(),
                dependency: "database".to_string(),
                message: e.clone(),
                timestamp: now.clone(),
            });
            "unhealthy".to_string()
        }
    };
    let db_detail = db_result.ok().flatten();

    // ── Redis check ──────────────────────────────────────────────────
    let redis_start = Instant::now();
    let redis_result = check_redis(&state).await;
    let redis_latency = redis_start.elapsed().as_millis();
    let redis_status = match &redis_result {
        Ok(_) => "healthy".to_string(),
        Err(e) => {
            alerts.push(HealthAlert {
                severity: "critical".to_string(),
                dependency: "redis".to_string(),
                message: e.clone(),
                timestamp: now.clone(),
            });
            "unhealthy".to_string()
        }
    };
    let redis_detail = redis_result.ok().flatten();

    // ── Storage check ────────────────────────────────────────────────
    let storage_start = Instant::now();
    let storage_result = check_storage(&state).await;
    let storage_latency = storage_start.elapsed().as_millis();
    let storage_status = match &storage_result {
        Ok(_) => "healthy".to_string(),
        Err(e) => {
            alerts.push(HealthAlert {
                severity: "warning".to_string(),
                dependency: "storage".to_string(),
                message: e.clone(),
                timestamp: now.clone(),
            });
            "unhealthy".to_string()
        }
    };
    let storage_detail = storage_result.ok().flatten();

    // ── DB pool metrics ──────────────────────────────────────────────
    let pool = &state.db.pool;
    let pool_size = pool.size();
    let pool_idle = pool.num_idle() as u32;
    let pool_active = pool_size - pool_idle; // active = size - idle

    // ── Memory metrics (approximate) ─────────────────────────────────
    let mem_bytes = get_approx_memory_usage();
    let mem_human = format_bytes(mem_bytes);

    let total_check_duration = check_start.elapsed().as_millis();

    // ── Determine overall status ─────────────────────────────────────
    let critical_count = alerts.iter().filter(|a| a.severity == "critical").count();
    let warning_count = alerts.iter().filter(|a| a.severity == "warning").count();

    let overall_status = if critical_count > 0 {
        "critical"
    } else if warning_count > 0 {
        "degraded"
    } else {
        "healthy"
    };

    let uptime_secs = get_uptime();

    let response = UnifiedHealthResponse {
        status: overall_status.to_string(),
        timestamp: now,
        version: env!("CARGO_PKG_VERSION").to_string(),
        service: "modern_school_backend".to_string(),
        uptime_seconds: uptime_secs,
        uptime_human: format_uptime(uptime_secs),
        dependencies: DependencyChecks {
            database: DependencyStatus {
                status: db_status,
                latency_ms: db_latency,
                detail: db_detail,
            },
            redis: DependencyStatus {
                status: redis_status,
                latency_ms: redis_latency,
                detail: redis_detail,
            },
            storage: DependencyStatus {
                status: storage_status,
                latency_ms: storage_latency,
                detail: storage_detail,
            },
        },
        metrics: SystemMetrics {
            db_pool_size: pool_size,
            db_pool_active: pool_active,
            db_pool_idle: pool_idle,
            memory_usage_bytes: mem_bytes,
            memory_usage_human: mem_human,
            total_check_duration_ms: total_check_duration,
        },
        alerts,
    };

    let status_code = match overall_status {
        "critical" => StatusCode::SERVICE_UNAVAILABLE,
        "degraded" => StatusCode::OK, // still operational
        _ => StatusCode::OK,
    };

    (status_code, Json(response))
}

// ── Dependency Check Implementations ─────────────────────────────────────

/// Check database connectivity and return Ok(detail) or Err(message)
async fn check_database(state: &AppState) -> Result<Option<String>, String> {
    match sqlx::query("SELECT 1")
        .execute(&state.db.pool)
        .await
    {
        Ok(_) => Ok(Some("Connection verified".to_string())),
        Err(e) => Err(format!("Database connection failed: {}", e)),
    }
}

/// Check Redis connectivity
async fn check_redis(state: &AppState) -> Result<Option<String>, String> {
    match state.db.redis.get().await {
        Ok(mut conn) => {
            match redis::cmd("PING")
                .query_async::<_, String>(&mut conn)
                .await
            {
                Ok(pong) if pong == "PONG" => Ok(Some("PONG received".to_string())),
                Ok(_) => Err("Unexpected Redis response".to_string()),
                Err(e) => Err(format!("Redis ping failed: {}", e)),
            }
        }
        Err(e) => Err(format!("Redis connection failed: {}", e)),
    }
}

/// Check storage availability
async fn check_storage(state: &AppState) -> Result<Option<String>, String> {
    let upload_dir = &state.storage.upload_dir;
    match std::fs::metadata(upload_dir) {
        Ok(metadata) => {
            if metadata.is_dir() {
                let test_file = format!("{}/.health_test", upload_dir);
                match std::fs::write(&test_file, "health_check") {
                    Ok(_) => {
                        let _ = std::fs::remove_file(&test_file);
                        Ok(Some("Directory writable".to_string()))
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

// ── Helpers ──────────────────────────────────────────────────────────────

/// Approximate memory usage via platform-specific means
fn get_approx_memory_usage() -> u64 {
    // On Windows/Linux we can try to read from /proc or use sysinfo,
    // but to avoid adding a heavy crate we provide a reasonable fallback.
    // This returns the resident set size approximation.
    #[cfg(target_os = "linux")]
    {
        if let Ok(status) = std::fs::read_to_string("/proc/self/status") {
            for line in status.lines() {
                if line.starts_with("VmRSS:") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 2 {
                        if let Ok(kb) = parts[1].parse::<u64>() {
                            return kb * 1024;
                        }
                    }
                }
            }
        }
    }
    // Fallback: estimate from system info (rough)
    0
}

/// Format bytes into human-readable string
fn format_bytes(bytes: u64) -> String {
    if bytes == 0 {
        return "N/A".to_string();
    }
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MB", bytes as f64 / MB as f64)
    } else {
        format!("{:.0} KB", bytes as f64 / KB as f64)
    }
}
