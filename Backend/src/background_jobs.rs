use crate::logic::analytics_engine::AnalyticsEngine;
use crate::logic::encryption_service::{create_encryption_service, EncryptionService};
use crate::logic::email_service::EmailService;
use crate::AppState;
use chrono::{Datelike, Duration as ChronoDuration, Timelike, Utc};
use serde_json::json;
use std::sync::Arc;
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

    // Background loop for Encryption Key Rotation (every 30 days)
    tokio::spawn(async move {
        loop {
            // Wait 30 days (30 * 24 * 60 * 60 seconds)
            sleep(Duration::from_secs(30 * 24 * 60 * 60)).await;
            
            println!("[Encryption Key Rotation] Starting key rotation...");
            
            match create_encryption_service().await {
                Ok(encryption_service) => {
                    match encryption_service.rotate_keys().await {
                        Ok(new_keys) => {
                            println!("[Encryption Key Rotation] Key rotation completed successfully. New keys: {:?}", new_keys);
                        }
                        Err(e) => {
                            eprintln!("[Encryption Key Rotation] Error rotating keys: {}", e);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[Encryption Key Rotation] Failed to create encryption service: {}", e);
                }
            }
        }
    });

    // Background loop for Attendance Automation (daily at 10 AM and 6 PM)
    let state_clone = state.clone();
    tokio::spawn(async move {
        loop {
            let now = Utc::now();
            let today = now.format("%Y-%m-%d").to_string();
            
            // Schedule next run at 10 AM
            let mut next_run = now.date_naive().and_hms_opt(10, 0, 0).unwrap().and_utc();
            if now >= next_run {
                // If already past 10 AM, schedule for 6 PM
                next_run = now.date_naive().and_hms_opt(18, 0, 0).unwrap().and_utc();
                if now >= next_run {
                    // If already past 6 PM, schedule for 10 AM tomorrow
                    next_run = (now.date_naive() + ChronoDuration::days(1)).and_hms_opt(10, 0, 0).unwrap().and_utc();
                }
            }
            
            let wait_duration = (next_run - now).to_std().unwrap_or(Duration::from_secs(24 * 60 * 60));
            
            println!("[Attendance Automation] Next run scheduled for: {}", next_run);
            sleep(wait_duration).await;
            
            println!("[Attendance Automation] Starting daily attendance automation...");
            
            // Get all active schools
            match sqlx::query!("SELECT school_id FROM schools WHERE status = 'active'")
                .fetch_all(&state_clone.db.pool)
                .await
            {
                Ok(schools) => {
                    for school in schools {
                        let school_id = school.school_id;
                        
                        // 1. Auto-mark absent after cutoff time (10 AM)
                        if now.hour() >= 10 {
                            println!("[Attendance Automation] Auto-marking absent for school: {}", school_id);
                            match state_clone.services.attendance.auto_mark_absent_after_cutoff(&school_id, "10:00", &today).await {
                                Ok(result) => {
                                    let marked_count = result["marked_count"].as_i64().unwrap_or(0);
                                    if marked_count > 0 {
                                        println!("[Attendance Automation] Auto-marked {} users as absent for school {}", marked_count, school_id);
                                        
                                        // Send push notification to the school admin/topic
                                        let _ = state_clone.services.fcm.send_to_topic(
                                            &format!("{}_admins", school_id),
                                            "Attendance Cutoff Reached",
                                            &format!("{} users have been auto-marked as absent for today.", marked_count),
                                            None
                                        ).await;
                                    }
                                }
                                Err(e) => eprintln!("[Attendance Automation] Error auto-marking absent for school {}: {}", school_id, e),
                            }
                        }
                        
                        // 2. Generate daily report at 6 PM AND send email
                        if now.hour() >= 18 {
                            println!("[Attendance Automation] Generating daily report for school: {}", school_id);
                            match state_clone.services.attendance.generate_daily_attendance_report(&school_id, &today).await {
                                Ok(report) => {
                                    let summary = &report["summary"];
                                    let attendance_percentage = summary["attendance_percentage"].as_f64().unwrap_or(0.0);
                                    let present = summary["present_count"].as_i64().unwrap_or(0);
                                    let absent = summary["absent_count"].as_i64().unwrap_or(0);
                                    let total = summary["total_users"].as_i64().unwrap_or(0);
                                    println!("[Attendance Automation] Daily report for school {}: {:.1}% attendance", school_id, attendance_percentage);

                                    // Send email notification
                                    let email_svc = EmailService::new();
                                    if email_svc.is_enabled() {
                                        // Try to get school admin email
                                        if let Ok(Some(school_row)) = sqlx::query("SELECT admin_email FROM schools WHERE school_id = $1")
                                            .bind(&school_id)
                                            .fetch_optional(&state_clone.db.pool)
                                            .await
                                        {
                                            let admin_email: Option<String> = sqlx::Row::try_get(&school_row, "admin_email").unwrap_or(None);
                                            if let Some(email) = admin_email {
                                                let subject = format!("Daily Attendance Report - {} - {}", school_id, today);
                                                let body = format!(
                                                    "Daily Attendance Summary\n\nDate: {}\nTotal: {}\nPresent: {} ({:.1}%)\nAbsent: {}\n\nThis is an automated report.",
                                                    today, total, present, attendance_percentage, absent
                                                );
                                                let _ = email_svc.send_email(&email, &subject, &body).await;

                                                // Send push notification to admin topic
                                                let _ = state_clone.services.fcm.send_to_topic(
                                                    &format!("{}_admins", school_id),
                                                    "Daily Attendance Summary",
                                                    &format!("Overall Attendance: {:.1}%. Present: {}, Absent: {}.", attendance_percentage, present, absent),
                                                    Some(json!({"type": "daily_report", "date": today}))
                                                ).await;
                                            }
                                        }
                                    }
                                }
                                Err(e) => eprintln!("[Attendance Automation] Error generating daily report for school {}: {}", school_id, e),
                            }
                        }
                    }
                }
                Err(e) => eprintln!("[Attendance Automation] Failed to fetch schools: {}", e),
            }
            
            println!("[Attendance Automation] Daily automation completed.");
        }
    });

    // Background loop for SMS/Email Notifications (every hour)
    let state_clone = state.clone();
    tokio::spawn(async move {
        loop {
            // Wait 1 hour
            sleep(Duration::from_secs(60 * 60)).await;
            
            println!("[Notification Service] Checking for pending notifications...");
            
            // Check for unmarked attendance and send reminders
            match sqlx::query!("SELECT school_id FROM schools WHERE status = 'active'")
                .fetch_all(&state_clone.db.pool)
                .await
            {
                Ok(schools) => {
                    for school in schools {
                        let school_id = school.school_id;
                        let today = Utc::now().format("%Y-%m-%d").to_string();
                        
                        // Get unmarked attendance count
                        match state_clone.services.attendance.get_unmarked_attendance_count(&school_id, &today, None).await {
                            Ok(result) => {
                                let unmarked_count = result["unmarked_count"].as_i64().unwrap_or(0);
                                if unmarked_count > 0 {
                                    println!("[Notification Service] School {} has {} unmarked attendance records", school_id, unmarked_count);
                                    // Send notification email to admin
                                    let email_svc = EmailService::new();
                                    if email_svc.is_enabled() {
                                        if let Ok(Some(school_row)) = sqlx::query("SELECT admin_email FROM schools WHERE school_id = $1")
                                            .bind(&school_id)
                                            .fetch_optional(&state_clone.db.pool)
                                            .await
                                        {
                                            let admin_email: Option<String> = sqlx::Row::try_get(&school_row, "admin_email").unwrap_or(None);
                                            if let Some(email) = admin_email {
                                                let subject = format!("⚠ {} students/employees not marked today - {}", unmarked_count, school_id);
                                                let body = format!(
                                                    "Attendance Alert\n\nSchool: {}\nDate: {}\nUnmarked: {} people have not had attendance recorded today.\n\nPlease ensure attendance is marked before end of day.",
                                                    school_id, today, unmarked_count
                                                );
                                                let _ = email_svc.send_email(&email, &subject, &body).await;
                                                println!("[Notification Service] Sent unmarked attendance alert for school {}", school_id);
                                            }
                                        }
                                    }
                                }
                            }
                            Err(e) => eprintln!("[Notification Service] Error checking unmarked attendance for school {}: {}", school_id, e),
                        }
                    }
                }
                Err(e) => eprintln!("[Notification Service] Failed to fetch schools: {}", e),
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
        let _ = sqlx::query(
            "INSERT INTO scheduled_reports (school_id, report_type, period_start, period_end, generated_at)
             VALUES ($1, $2, $3, $4, $5)"
        )
        .bind(&school_id)
        .bind("weekly_summary")
        .bind(&start_date)
        .bind(&end_date)
        .bind(now)
        .execute(&state.db.pool)
        .await;
    }
    
    Ok(())
}
