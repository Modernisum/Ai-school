use crate::logic::analytics_engine::AnalyticsEngine;
use crate::AppState;
use chrono::{Duration as ChronoDuration, Utc};
use serde_json::json;
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

    // Background loop for Scheduled Responsibility Reports (every Monday at 9 AM)
    let state_clone = state.clone();
    tokio::spawn(async move {
        loop {
            // Wait until next Monday 9 AM
            let now = Utc::now();
            let mut next_run = now;
            
            // Find next Monday
            while next_run.weekday().num_days_from_monday() != 0 {
                next_run = next_run + ChronoDuration::days(1);
            }
            
            // Set to 9 AM
            next_run = next_run.date_naive().and_hms_opt(9, 0, 0).unwrap().and_utc();
            
            // If it's already past 9 AM today (Monday), schedule for next week
            if next_run <= now {
                next_run = next_run + ChronoDuration::weeks(1);
            }
            
            let wait_duration = (next_run - now).to_std().unwrap_or(Duration::from_secs(7 * 24 * 60 * 60));
            
            println!("[Scheduled Reports] Next report generation scheduled for: {}", next_run);
            sleep(wait_duration).await;
            
            println!("[Scheduled Reports] Starting weekly responsibility report generation...");
            match generate_scheduled_reports(&state_clone).await {
                Ok(_) => println!("[Scheduled Reports] Weekly reports generated successfully"),
                Err(e) => eprintln!("[Scheduled Reports] Error generating reports: {}", e),
            }
        }
    });
}

/// Generate scheduled responsibility reports for all active schools
async fn generate_scheduled_reports(state: &AppState) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use chrono::{Datelike, Timelike};
    
    let now = Utc::now();
    let end_date = now.format("%Y-%m-%d").to_string();
    let start_date = (now - ChronoDuration::days(7)).format("%Y-%m-%d").to_string();
    
    // Get all active schools
    let schools = sqlx::query!("SELECT school_id FROM schools WHERE status = 'active'")
        .fetch_all(&state.db.pool)
        .await?;
    
    for school in schools {
        let school_id = school.school_id;
        
        println!("[Scheduled Reports] Generating reports for school: {}", school_id);
        
        // Generate utilization report
        if let Ok(report_data) = state.services.responsibility.generate_utilization_report(&school_id, &start_date, &end_date).await {
            // TODO: Store report in database for history
            println!("[Scheduled Reports] Generated utilization report for school: {}", school_id);
            
            // Generate PDF
            if let Ok(pdf_bytes) = state.services.responsibility.generate_utilization_report_pdf(&school_id, &start_date, &end_date).await {
                // TODO: Save PDF to storage and send email
                println!("[Scheduled Reports] Generated PDF for utilization report ({} bytes)", pdf_bytes.len());
            }
        }
        
        // Generate workload report
        if let Ok(report_data) = state.services.responsibility.generate_workload_report(&school_id, &start_date, &end_date).await {
            println!("[Scheduled Reports] Generated workload report for school: {}", school_id);
            
            if let Ok(pdf_bytes) = state.services.responsibility.generate_workload_report_pdf(&school_id, &start_date, &end_date).await {
                println!("[Scheduled Reports] Generated PDF for workload report ({} bytes)", pdf_bytes.len());
            }
        }
        
        // Generate space distribution report
        if let Ok(report_data) = state.services.responsibility.generate_space_distribution_report(&school_id, &start_date, &end_date).await {
            println!("[Scheduled Reports] Generated space distribution report for school: {}", school_id);
            
            if let Ok(pdf_bytes) = state.services.responsibility.generate_space_distribution_report_pdf(&school_id, &start_date, &end_date).await {
                println!("[Scheduled Reports] Generated PDF for space distribution report ({} bytes)", pdf_bytes.len());
            }
        }
        
        // Generate revenue report
        if let Ok(report_data) = state.services.responsibility.generate_revenue_report(&school_id, &start_date, &end_date).await {
            println!("[Scheduled Reports] Generated revenue report for school: {}", school_id);
            
            if let Ok(pdf_bytes) = state.services.responsibility.generate_revenue_report_pdf(&school_id, &start_date, &end_date).await {
                println!("[Scheduled Reports] Generated PDF for revenue report ({} bytes)", pdf_bytes.len());
            }
        }
        
        // Store report generation log
        let _ = sqlx::query!(
            "INSERT INTO scheduled_reports (school_id, report_type, period_start, period_end, generated_at)
             VALUES ($1, $2, $3, $4, $5)",
            school_id,
            "weekly_summary",
            start_date,
            end_date,
            now
        )
        .execute(&state.db.pool)
        .await;
    }
    
    Ok(())
}
