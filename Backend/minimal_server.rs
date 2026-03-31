use axum::{
    routing::get,
    Router,
    response::Json,
};
use serde_json::{json, Value};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    // Build our application with a route
    let app = Router::new()
        .route("/", get(handler))
        .route("/api/health", get(health_check))
        .route("/api/test", get(test_endpoint));

    // Run it
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    println!("Minimal server listening on http://{}", addr);
    
    axum::serve(
        tokio::net::TcpListener::bind(addr).await.unwrap(),
        app
    ).await.unwrap();
}

async fn handler() -> &'static str {
    "Modern School Backend - Minimal Server Running"
}

async fn health_check() -> Json<Value> {
    Json(json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "service": "modern-school-backend"
    }))
}

async fn test_endpoint() -> Json<Value> {
    Json(json!({
        "message": "Server is running",
        "database": "PostgreSQL (checking)",
        "redis": "Redis (checking)",
        "features": ["auth", "students", "employees", "academics"]
    }))
}