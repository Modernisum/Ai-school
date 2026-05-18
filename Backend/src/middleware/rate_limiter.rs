use axum::{
    extract::{ConnectInfo, Request},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct RateLimiter {
    window_secs: u64,
    max_requests: u32,
    counters: Arc<Mutex<HashMap<String, (u32, std::time::Instant)>>>,
}

impl RateLimiter {
    pub fn new(window_secs: u64, max_requests: u32) -> Self {
        Self {
            window_secs,
            max_requests,
            counters: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Create a general API rate limiter (500 req/min per IP)
    pub fn general() -> Self {
        Self::new(60, 500)
    }

    /// Create an auth rate limiter (5 req/min per IP)
    pub fn auth() -> Self {
        Self::new(60, 5)
    }

    /// Create an AI rate limiter (20 req/min per IP)
    pub fn ai() -> Self {
        Self::new(60, 20)
    }

    /// Create an admin rate limiter (10000 req/min per IP)
    pub fn admin() -> Self {
        Self::new(60, 10000)
    }

    /// Extract client IP from request headers or fallback to socket info
    pub fn extract_client_ip(request: &Request) -> String {
        request
            .headers()
            .get("x-forwarded-for")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.split(',').next())
            .map(|s| s.trim().to_string())
            .or_else(|| {
                request
                    .headers()
                    .get("x-real-ip")
                    .and_then(|v| v.to_str().ok())
                    .map(|s| s.to_string())
            })
            .or_else(|| {
                request
                    .extensions()
                    .get::<ConnectInfo<SocketAddr>>()
                    .map(|c| c.0.ip().to_string())
            })
            .unwrap_or_else(|| "unknown".to_string())
    }

    /// Check and increment rate limit counter. Returns Ok(()) if allowed, Err(Response) if limited.
    pub async fn check(&self, client_ip: &str) -> Result<(), Response> {
        let now = std::time::Instant::now();
        let mut counters = self.counters.lock().await;

        // Prune stale entries every ~10k entries to prevent unbounded growth
        if counters.len() > 10_000 {
            counters.retain(|_, (_, ts)| now.duration_since(*ts).as_secs() <= self.window_secs);
        }

        let entry = counters.entry(client_ip.to_string()).or_insert((0, now));

        if now.duration_since(entry.1).as_secs() > self.window_secs {
            *entry = (1, now);
        } else if entry.0 >= self.max_requests {
            return Err((
                StatusCode::TOO_MANY_REQUESTS,
                Json(json!({
                    "success": false,
                    "error_code": "RATE_LIMITED",
                    "message": "Too many requests. Please try again later.",
                })),
            )
                .into_response());
        } else {
            entry.0 += 1;
        }

        drop(counters);
        Ok(())
    }
}
