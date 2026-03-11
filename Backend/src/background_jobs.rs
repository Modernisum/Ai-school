use std::time::Duration;
use tokio::time::sleep;
use crate::AppState;
use crate::logic::analytics_engine::AnalyticsEngine;

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
                Err(e) => eprintln!("[Background Worker] Failed to fetch schools for analysis: {}", e),
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
                eprintln!("[Background Worker] Error processing pending webhooks: {}", e);
            }
            sleep(Duration::from_secs(60)).await;
        }
    });
}
