use crate::logic::analytics_engine::AnalyticsEngine;
use crate::AppState;
use std::time::Duration;
use tokio::time::sleep;

#[allow(dead_code)]
pub async fn start_background_workers(state: AppState) {
    let analytics = AnalyticsEngine::new(state.db.pool.clone());

    // Background loop for Analytics
    tokio::spawn(async move {
        loop {
            // Run every 24 hours (86400 seconds)
            println!("[Background Worker] Starting daily predictive analytics run...");

            // 1. School Churn Analysis
            if let Err(e) = analytics.analyze_school_churn().await {
                eprintln!("[Background Worker] Error in school churn analysis: {}", e);
            }

            // 2. Student Risk Analysis
            match sqlx::query!("SELECT school_id FROM schools WHERE status = 'active'")
                .fetch_all(&analytics.pool)
                .await
            {
                Ok(schools) => {
                    for school in schools {
                        if let Err(e) = analytics.analyze_student_risks(&school.school_id).await {
                            eprintln!("[Background Worker] Error analyzing student risks for school {}: {}", school.school_id, e);
                        }
                    }
                }
                Err(e) => eprintln!(
                    "[Background Worker] Failed to fetch schools for analysis: {}",
                    e
                ),
            }

            println!("[Background Worker] Daily analytics run completed.");

            // Wait 24 hours
            sleep(Duration::from_secs(86400)).await;
        }
    });

    // Background loop for Webhook Delivery
    let webhook_engine = crate::logic::webhook_engine::WebhookEngine::new(state.db.pool.clone());
    tokio::spawn(async move {
        loop {
            // Process pending webhooks every 60 seconds
            if let Err(e) = webhook_engine.process_pending().await {
                eprintln!(
                    "[Background Worker] Error processing pending webhooks: {}",
                    e
                );
            }
            sleep(Duration::from_secs(60)).await;
        }
    });

    // Background loop for Orphaned File Cleanup (every 15 minutes)
    let state_clone = state.clone();
    tokio::spawn(async move {
        loop {
            // Wait first, then clean - so we don't delete files on startup
            sleep(Duration::from_secs(15 * 60)).await;

            println!("[Background Worker] Starting orphaned file cleanup...");
            // get_orphaned_files takes hours, so pass fractional hours as minutes/60
            // We use a custom query with minutes below via a separate approach
            match state_clone.repos.storage.get_orphaned_files_minutes(15).await {
                Ok(orphans) => {
                    let count = orphans.len();
                    for orphan in orphans {
                        let id = orphan["id"].as_i64().unwrap_or(0) as i32;
                        let path = orphan["file_path"].as_str().unwrap_or("");
                        
                        if !path.is_empty() {
                            println!("[Cleanup] Deleting orphaned file: {}", path);
                            let _ = std::fs::remove_file(path);
                        }
                        
                        let _ = state_clone.repos.storage.delete_file_metadata(id).await;
                    }
                    if count > 0 {
                        println!("[Background Worker] Cleanup completed. Cleared {} orphans.", count);
                    }
                }
                Err(e) => eprintln!("[Background Worker] Error fetching orphaned files: {}", e),
            }
        }
    });
}
