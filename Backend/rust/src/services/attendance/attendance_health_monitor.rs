use crate::repository::Repositories;
use crate::error::{AppError, AppResult};
use chrono::{Duration as ChronoDuration, Utc};
use serde_json::{json, Value};
use std::sync::Arc;
use std::time::Duration;
use tokio::time::sleep;

pub struct AttendanceHealthMonitor {
    repos: Arc<Repositories>,
}

impl AttendanceHealthMonitor {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    /// Check overall system health for attendance automation
    pub async fn check_system_health(&self, school_id: &str) -> AppResult<Value> {
        let mut health_status = json!({
            "status": "healthy",
            "timestamp": Utc::now().to_rfc3339(),
            "school_id": school_id,
            "checks": {}
        });

        // 1. Check database connectivity
        let db_check = self.check_database_connectivity(school_id).await;
        health_status["checks"]["database"] = json!({
            "status": if db_check.is_ok() { "healthy" } else { "unhealthy" },
            "message": if db_check.is_ok() { "Connected successfully".to_string() } else { db_check.err().map(|e| e.to_string()).unwrap_or_default() },
            "timestamp": Utc::now().to_rfc3339()
        });

        // 2. Check background job status
        let job_check = self.check_background_jobs(school_id).await;
        health_status["checks"]["background_jobs"] = json!({
            "status": if job_check.is_ok() { "healthy" } else { "unhealthy" },
            "message": if job_check.is_ok() { "Jobs running normally".to_string() } else { job_check.err().map(|e| e.to_string()).unwrap_or_default() },
            "timestamp": Utc::now().to_rfc3339()
        });

        // 3. Check recent automation runs
        let automation_check = self.check_recent_automation_runs(school_id).await;
        health_status["checks"]["automation"] = json!({
            "status": if automation_check.is_ok() { "healthy" } else { "unhealthy" },
            "message": if automation_check.is_ok() { "Automation running normally".to_string() } else { automation_check.err().map(|e| e.to_string()).unwrap_or_default() },
            "timestamp": Utc::now().to_rfc3339()
        });

        // 4. Check notification service
        let notification_check = self.check_notification_service(school_id).await;
        health_status["checks"]["notifications"] = json!({
            "status": if notification_check.is_ok() { "healthy" } else { "unhealthy" },
            "message": if notification_check.is_ok() { "Notification service available".to_string() } else { notification_check.err().map(|e| e.to_string()).unwrap_or_default() },
            "timestamp": Utc::now().to_rfc3339()
        });

        // 5. Check storage availability
        let storage_check = self.check_storage_availability(school_id).await;
        health_status["checks"]["storage"] = json!({
            "status": if storage_check.is_ok() { "healthy" } else { "unhealthy" },
            "message": if storage_check.is_ok() { "Storage accessible".to_string() } else { storage_check.err().map(|e| e.to_string()).unwrap_or_default() },
            "timestamp": Utc::now().to_rfc3339()
        });

        // Determine overall status
        let checks = health_status["checks"].as_object().cloned().unwrap_or_default();
        let unhealthy_count = checks.values()
            .filter(|check| check["status"] == "unhealthy")
            .count();

        if unhealthy_count > 2 {
            health_status["status"] = json!("critical");
        } else if unhealthy_count > 0 {
            health_status["status"] = json!("degraded");
        } else {
            health_status["status"] = json!("healthy");
        }

        // Add metrics
        health_status["metrics"] = self.collect_metrics(school_id).await?;

        Ok(health_status)
    }

    /// Check database connectivity
    async fn check_database_connectivity(&self, school_id: &str) -> AppResult<()> {
        // Verify connectivity by running a lightweight query through system_log repository
        self.repos.system_log.get_failed_jobs_count(school_id, Utc::now())
            .await
            .map_err(|e| AppError::Internal(format!("Database connectivity check failed: {}", e)))?;
        Ok(())
    }

    /// Check background job status
    async fn check_background_jobs(&self, school_id: &str) -> AppResult<Value> {
        let twenty_four_hours_ago = Utc::now() - ChronoDuration::hours(24);
        
        let failed_count = self.repos.system_log.get_failed_jobs_count(school_id, twenty_four_hours_ago)
            .await
            .unwrap_or(0);
        
        let last_success = self.repos.system_log.get_last_success_time(school_id, "automation_success")
            .await
            .unwrap_or(None);
        
        let status = if failed_count > 5 {
            "unhealthy"
        } else if failed_count > 0 {
            "degraded"
        } else {
            "healthy"
        };
        
        Ok(json!({
            "failed_jobs_24h": failed_count,
            "last_success": last_success.map(|dt| dt.to_rfc3339()),
            "status": status
        }))
    }

    /// Check recent automation runs
    async fn check_recent_automation_runs(&self, school_id: &str) -> AppResult<Value> {
        let one_hour_ago = Utc::now() - ChronoDuration::hours(1);
        
        let log_types = vec![
            "auto_mark_run".to_string(),
            "daily_report_run".to_string(),
            "notification_run".to_string(),
        ];
        
        let runs_data = self.repos.system_log.get_recent_runs(school_id, one_hour_ago, &log_types, 10)
            .await?;
        
        let mut runs = Vec::new();
        let mut success_count = 0;
        let mut total_count = 0;
        
        for item in runs_data {
            let log_type = item["log_type"].as_str().unwrap_or("").to_string();
            let status = item["status"].as_str().unwrap_or("").to_string();
            let created_at = item["created_at"].as_str().unwrap_or("").to_string();
            let details = item["details"].clone();
            
            if status == "success" {
                success_count += 1;
            }
            total_count += 1;
            
            runs.push(json!({
                "type": log_type,
                "status": status,
                "timestamp": created_at,
                "details": details
            }));
        }
        
        let success_rate = if total_count > 0 {
            (success_count as f64 / total_count as f64) * 100.0
        } else {
            100.0
        };
        
        let status = if success_rate < 50.0 {
            "unhealthy"
        } else if success_rate < 90.0 {
            "degraded"
        } else {
            "healthy"
        };
        
        Ok(json!({
            "recent_runs": runs,
            "success_rate": success_rate,
            "total_runs": total_count,
            "successful_runs": success_count,
            "status": status
        }))
    }

    /// Check notification service
    async fn check_notification_service(&self, school_id: &str) -> AppResult<Value> {
        let twenty_four_hours_ago = Utc::now() - ChronoDuration::hours(24);
        let pending_count = self.repos.notification.get_pending_notifications_count(school_id, twenty_four_hours_ago)
            .await
            .unwrap_or(0);
        
        let status = if pending_count > 100 {
            "unhealthy"
        } else if pending_count > 10 {
            "degraded"
        } else {
            "healthy"
        };
        
        Ok(json!({
            "pending_notifications": pending_count,
            "status": status
        }))
    }

    /// Check storage availability
    async fn check_storage_availability(&self, school_id: &str) -> AppResult<Value> {
        let storage_check = self.repos.storage.check_storage_status(school_id).await;
        
        let status = match storage_check {
            Ok(_) => "healthy",
            Err(e) if e.to_string().contains("does not exist") => "degraded",
            Err(_) => "unhealthy"
        };
        
        Ok(json!({
            "status": status,
            "message": if status == "healthy" { "Storage accessible" } else { "Storage check failed" }
        }))
    }

    /// Collect system metrics
    async fn collect_metrics(&self, school_id: &str) -> AppResult<Value> {
        let attendance_metrics = self.repos.attendance.get_attendance_health_metrics(school_id).await?;
        
        let total_records = attendance_metrics["total_records"].as_i64().unwrap_or(0);
        let present_count = attendance_metrics["present_count"].as_i64().unwrap_or(0);
        let absent_count = attendance_metrics["absent_count"].as_i64().unwrap_or(0);
        let auto_marked_count = attendance_metrics["auto_marked_count"].as_i64().unwrap_or(0);
        let today_count = attendance_metrics["today_count"].as_i64().unwrap_or(0);
        
        let twenty_four_hours_ago = Utc::now() - ChronoDuration::hours(24);
        let (avg_job_time_ms, total_jobs_24h) = self.repos.system_log.get_performance_metrics(school_id, twenty_four_hours_ago)
            .await
            .unwrap_or((None, 0));
        
        Ok(json!({
            "attendance": {
                "total_records": total_records,
                "present_count": present_count,
                "absent_count": absent_count,
                "auto_marked_count": auto_marked_count,
                "today_count": today_count,
                "attendance_rate": if total_records > 0 { (present_count as f64 / total_records as f64) * 100.0 } else { 0.0 }
            },
            "performance": {
                "avg_job_time_ms": avg_job_time_ms.unwrap_or(0.0),
                "total_jobs_24h": total_jobs_24h,
                "jobs_per_hour": if total_jobs_24h > 0 { total_jobs_24h as f64 / 24.0 } else { 0.0 }
            },
            "system": {
                "uptime": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs(),
                "memory_usage_mb": self.get_memory_usage(),
                "timestamp": Utc::now().to_rfc3339()
            }
        }))
    }

    /// Get memory usage (simplified)
    fn get_memory_usage(&self) -> f64 {
        128.0 // Placeholder value in MB
    }

    /// Log health check result
    pub async fn log_health_check(&self, school_id: &str, health_status: &Value) -> AppResult<()> {
        let status = health_status["status"].as_str().unwrap_or("unknown");
        self.repos.system_log.insert_log(
            school_id,
            "health_check",
            status,
            health_status.clone(),
            Utc::now(),
        ).await?;
        
        Ok(())
    }

    /// Start continuous health monitoring
    pub async fn start_monitoring(&self, school_id: &str, interval_seconds: u64) {
        let school_id = school_id.to_string();
        let monitor = self.repos.clone();
        
        tokio::spawn(async move {
            let health_monitor = AttendanceHealthMonitor::new(monitor);
            
            loop {
                sleep(Duration::from_secs(interval_seconds)).await;
                
                match health_monitor.check_system_health(&school_id).await {
                    Ok(health_status) => {
                        let status = health_status["status"].as_str().unwrap_or("unknown");
                        tracing::info!("School {} health status: {}", school_id, status);
                        
                        // Log the health check
                        let _ = health_monitor.log_health_check(&school_id, &health_status).await;
                        
                        // If status is critical, send alert
                        if status == "critical" {
                            tracing::error!("CRITICAL: School {} system health is critical!", school_id);
                            let _ = health_monitor.repos.notification.create(
                                &school_id,
                                None,
                                "system_health",
                                "critical",
                                "System Health Critical",
                                &format!("System health is critical for school {}", school_id),
                                health_status.clone(),
                            ).await;
                        }
                    }
                    Err(e) => {
                        tracing::error!("Error checking health for school {}: {}", school_id, e);
                    }
                }
            }
        });
    }
}