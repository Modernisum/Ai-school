use axum::{extract::Request, http::StatusCode, middleware::Next, response::Response};
use dashmap::DashMap;
use std::net::IpAddr;
use std::sync::LazyLock;
use std::time::Instant;

struct RateEntry {
    count: u32,
    window_start: Instant,
}

static RATE_MAP: LazyLock<DashMap<(IpAddr, &'static str), RateEntry>> =
    LazyLock::new(DashMap::new);

fn check_rate(ip: IpAddr, bucket: &'static str, max_requests: u32, window_secs: u64) -> bool {
    let key = (ip, bucket);
    let now = Instant::now();

    let mut entry = RATE_MAP.entry(key).or_insert(RateEntry {
        count: 0,
        window_start: now,
    });

    if now.duration_since(entry.window_start).as_secs() >= window_secs {
        entry.count = 1;
        entry.window_start = now;
        return true;
    }

    entry.count += 1;
    entry.count <= max_requests
}

fn extract_ip(request: &Request) -> IpAddr {
    request
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or_else(|| "127.0.0.1".parse().unwrap())
}

pub async fn rate_limit_auth(request: Request, next: Next) -> Result<Response, StatusCode> {
    let ip = extract_ip(&request);
    if !check_rate(ip, "auth", 10, 60) {
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }
    Ok(next.run(request).await)
}

pub async fn rate_limit_ai(request: Request, next: Next) -> Result<Response, StatusCode> {
    let ip = extract_ip(&request);
    if !check_rate(ip, "ai", 30, 60) {
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }
    Ok(next.run(request).await)
}

pub async fn rate_limit_general(request: Request, next: Next) -> Result<Response, StatusCode> {
    let ip = extract_ip(&request);
    if !check_rate(ip, "general", 200, 60) {
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }
    Ok(next.run(request).await)
}
