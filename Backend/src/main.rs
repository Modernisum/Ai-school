#![allow(unused)]

use dotenv::dotenv;
// use serde_json::json;
use std::net::SocketAddr;
// use tower_http::cors::{Any, CorsLayer};

mod background_jobs;
mod backup;
mod db;
mod error;
mod extractors;
mod logic;
mod middleware;
mod models;
mod repository;
mod routes;
mod services;
pub mod super_admin;

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

    #[allow(unused_mut)]
    let mut ocr_pipeline = logic::ocr_pipeline::OcrPipeline::new()?;

    #[cfg(feature = "ocr")]
    {
        let skip_ocr = std::env::var("SKIP_OCR_INIT")
            .map(|v| v == "true")
            .unwrap_or(false);
        if skip_ocr {
            println!("OCR Initialization Bypassed (Fast Development Mode)");
        } else {
            println!("Initializing OCR Pipeline models (TrOCR + Phi-3)...");
            ocr_pipeline.init_models().await?;
        }
    }
    #[cfg(not(feature = "ocr"))]
    {
        println!("OCR feature disabled at compile-time.");
    }

    let ocr_pipeline = Arc::new(ocr_pipeline);

    println!("Initializing Repositories and Database...");
    let db_client = Arc::new(db::init().await?);
    let repos = Arc::new(initialize_repositories(ocr_pipeline.clone()).await);
    let services = Arc::new(initialize_services(repos.clone()));

    let storage = Arc::new(crate::logic::storage_engine::StorageEngine::new().await);
    
    println!("Initializing Backup Service...");
    let backup_svc = Arc::new(backup::BackupService::new(db_client.pool.clone(), "Backup", Some(storage.clone())));

    let state = AppState {
        db: db_client,
        repos,
        services,
        backup: backup_svc.clone(),
        storage,
    };

    // Trigger auto-restore if DB is empty
    if let Err(e) = backup_svc.auto_restore().await {
        eprintln!("[Restore Error] {}", e);
    }

    println!("Starting background tasks (Billing & Backup)...");
    crate::super_admin::billing_job::start_daily_billing_job(state.clone()).await;

    // Start 15-min auto backup
    let backup_clone = backup_svc.clone();
    tokio::spawn(async move {
        backup_clone.run_auto_backup().await;
    });

    // Start combined background workers (Analytics, Webhooks, Cleanup)
    crate::background_jobs::start_background_workers(state.clone()).await;

    let app = routes::router::create_router(state);


    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
