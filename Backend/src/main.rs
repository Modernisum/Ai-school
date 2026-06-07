#![allow(unused)]

use dotenv::dotenv;
// use serde_json::json;
use std::net::SocketAddr;
// use tower_http::cors::{Any, CorsLayer};

mod background_jobs;
mod backup;
mod db;
mod domain;
mod error;
mod logic;
mod middleware;
mod models;
mod repository;

mod services;
pub mod query;
pub mod response;

use middleware::rate_limiter::RateLimiter;
use repository::{initialize_repositories, Repositories};
use services::{initialize_services, Services};
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<db::DbClient>,
    pub repos: Arc<Repositories>,
    pub services: Arc<Services>,
    pub backup: Arc<backup::BackupService>,
    pub storage: Arc<crate::logic::storage_engine::StorageEngine>,
    pub general_limiter: RateLimiter,
    pub auth_limiter: RateLimiter,
    pub ai_limiter: RateLimiter,
    pub admin_limiter: RateLimiter,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    tracing_subscriber::fmt::init();

    // Capture panics with full backtraces
    std::panic::set_hook(Box::new(|panic_info| {
        eprintln!("=== PANIC ===");
        eprintln!("{}", panic_info);
        if let Some(location) = panic_info.location() {
            eprintln!(
                "at {}:{}:{}",
                location.file(),
                location.line(),
                location.column()
            );
        }
        eprintln!("=============");
    }));

    // Record process start time for health uptime tracking
    crate::domain::system::health::record_start_time();

    println!("Initializing Database...");
    let db_client = Arc::new(db::init().await?);

    // Create shared cache service (used by both repos and services)
    let responsibility_cache = Arc::new(
        crate::logic::cache_service::ResponsibilityCacheService::new(db_client.redis.clone())
    );

    println!("Initializing Repositories...");
    let repos = Arc::new(initialize_repositories(db_client.clone(), responsibility_cache.clone()).await);

    println!("Initializing Services...");
    let services = Arc::new(initialize_services(repos.clone(), responsibility_cache));

    let storage = Arc::new(crate::logic::storage_engine::StorageEngine::new().await);
    
    println!("Initializing Backup Service...");
    let backup_svc = Arc::new(backup::BackupService::new(db_client.pool.clone(), "Backup", Some(storage.clone())));

    let state = AppState {
        db: db_client.clone(),
        repos,
        services,
        backup: backup_svc.clone(),
        storage,
        general_limiter: RateLimiter::general(),
        auth_limiter: RateLimiter::auth(),
        ai_limiter: RateLimiter::ai(),
        admin_limiter: RateLimiter::admin(),
    };

    // Trigger auto-restore if DB is empty
    if let Err(e) = backup_svc.auto_restore().await {
        eprintln!("[Restore Error] {}", e);
    }

    println!("Starting background tasks (Billing & Backup)...");
    crate::services::super_admin::start_daily_billing_job(state.clone()).await;

    // Start 15-min auto backup
    let backup_clone = backup_svc.clone();
    tokio::spawn(async move {
        backup_clone.run_auto_backup().await;
    });

    // Start combined background workers (Analytics, Webhooks, Cleanup)
    crate::background_jobs::start_background_workers(state.clone()).await;

    let app = domain::create_router(state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    println!("listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            tokio::signal::ctrl_c()
                .await
                .expect("failed to install Ctrl+C handler");
            println!("Shutting down gracefully...");
        })
        .await?;

    Ok(())
}
