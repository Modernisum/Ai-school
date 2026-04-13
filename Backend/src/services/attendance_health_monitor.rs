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
            "message": if db_check.is_ok() { "Connected successfully".to_string() } else { db_check.err().unwrap().to_string() },
            "timestamp": Utc::now().to_rfc3339()
        });

        // 2. Check background job status
        let job_check = self.check_background_jobs(school_id).await;
        health_status["checks"]["background_jobs"] = json!({
            "status": if job_check.is_ok() { "healthy" } else { "unhealthy" },
            "message": if job_check.is_ok() { "Jobs running normally".to_string() } else { job_check.err().unwrap().to_string() },
            "timestamp": Utc::now().to_rfc3339()
        });

        // 3. Check recent automation runs
        let automation_check = self.check_recent_automation_runs(school_id).await;
        health_status["checks"]["automation"] = json!({
            "status": if automation_check.is_ok() { "healthy" } else { "unhealthy" },
            "message": if automation_check.is_ok() { "Automation running normally".to_string() } else { automation_check.err().unwrap().to_string() },
            "timestamp": Utc::now().to_rfc3339()
        });

        // 4. Check notification service
        let notification_check = self.check_notification_service(school_id).await;
        health_status["checks"]["notifications"] = json!({
            "status": if notification_check.is_ok() { "healthy" } else { "unhealthy" },
            "message": if notification_check.is_ok() { "Notification service available".to_string() } else { notification_check.err().unwrap().to_string() },
            "timestamp": Utc::now().to_rfc3339()
        });

        // 5. Check storage availability
        let storage_check = self.check_storage_availability(school_id).await;
        health_status["checks"]["storage"] = json!({
            "status": if storage_check.is_ok() { "healthy" } else { "unhealthy" },
            "message": if storage_check.is_ok() { "Storage accessible".to_string() } else { storage_check.err().unwrap().to_string() },
            "timestamp": Utc::now().to_rfc3339()
        });

        // Determine overall status
        let checks = health_status["checks"].as_object().unwrap();
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
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        // Simple query to test connectivity
        let result: i64 = sqlx::query_scalar("SELECT 1")
            .fetch_one(&mut *conn)
            .await
            .map_err(|e| AppError::Internal(format!("Database connectivity check failed: {}", e)))?;
        
        if result != 1 {
            return Err(AppError::Internal("Database query returned unexpected result".to_string()));
        }

        Ok(())
    }

    /// Check background job status
    async fn check_background_jobs(&self, school_id: &str) -> AppResult<Value> {
        let twenty_four_hours_ago = Utc::now() - ChronoDuration::hours(24);
        
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        // Check for failed jobs in last 24 hours
        let failed_jobs_query = "
            SELECT COUNT(*) as failed_count
            FROM system_logs 
            WHERE school_id = $1 
            AND log_type = 'background_job_error'
            AND created_at >= $2
        ";
        
        let failed_count: i64 = sqlx::query_scalar(failed_jobs_query)
            .bind(school_id)
            .bind(twenty_four_hours_ago)
            .fetch_one(&mut *conn)
            .await
            .unwrap_or(0);
        
        // Check last successful automation run
        let last_success_query = "
            SELECT MAX(created_at) as last_success
            FROM system_logs 
            WHERE school_id = $1 
            AND log_type = 'automation_success'
        ";
        
        let last_success: Option<chrono::DateTime<Utc>> = sqlx::query_scalar(last_success_query)
            .bind(school_id)
            .fetch_optional(&mut *conn)
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
        
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        // Get recent automation runs
        let recent_runs_query = "
            SELECT log_type, status, created_at, details
            FROM system_logs 
            WHERE school_id = $1 
            AND log_type IN ('auto_mark_run', 'daily_report_run', 'notification_run')
            AND created_at >= $2
            ORDER BY created_at DESC
            LIMIT 10
        ";
        
        let rows = sqlx::query(recent_runs_query)
            .bind(school_id)
            .bind(one_hour_ago)
            .fetch_all(&mut *conn)
            .await?;
        
        let mut runs = Vec::new();
        let mut success_count = 0;
        let mut total_count = 0;
        
        for row in rows {
            let log_type: String = sqlx::Row::get(&row, "log_type");
            let status: String = sqlx::Row::get(&row, "status");
            let created_at: chrono::DateTime<Utc> = sqlx::Row::get(&row, "created_at");
            let details: Option<Value> = sqlx::Row::get(&row, "details");
            
            if status == "success" {
                success_count += 1;
            }
            total_count += 1;
            
            runs.push(json!({
                "type": log_type,
                "status": status,
                "timestamp": created_at.to_rfc3339(),
                "details": details.unwrap_or(json!({}))
            }));
        }
        
        let success_rate = if total_count > 0 {
            (success_count as f64 / total_count as f64) * 100.0
        } else {
            100.0 // No runs means nothing failed
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
        // For now, just check if there are pending notifications
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let pending_query = "
            SELECT COUNT(*) as pending_count
            FROM notifications 
            WHERE school_id = $1 
            AND status = 'pending'
            AND created_at >= NOW() - INTERVAL '24 hours'
        ";
        
        let pending_count: i64 = sqlx::query_scalar(pending_query)
            .bind(school_id)
            .fetch_one(&mut *conn)
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
        // Check if storage table exists and is accessible
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        // Try to query storage metadata
        let storage_check = sqlx::query("SELECT COUNT(*) FROM storage_metadata WHERE school_id = $1")
            .bind(school_id)
            .fetch_optional(&mut *conn)
            .await;
        
        let status = match storage_check {
            Ok(_) => "healthy",
            Err(e) if e.to_string().contains("does not exist") => "degraded", // Table might not exist yet
            Err(_) => "unhealthy"
        };
        
        Ok(json!({
            "status": status,
            "message": if status == "healthy" { "Storage accessible" } else { "Storage check failed" }
        }))
    }

    /// Collect system metrics
    async fn collect_metrics(&self, school_id: &str) -> AppResult<Value> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        // Get attendance metrics
        let attendance_metrics_query = "
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
                COUNT(CASE WHEN auto_marked = true THEN 1 END) as auto_marked_count,
                COUNT(CASE WHEN date = CURRENT_DATE THEN 1 END) as today_count
            FROM attendance 
            WHERE school_id = $1
        ";
        
        let attendance_row = sqlx::query(attendance_metrics_query)
            .bind(school_id)
            .fetch_one(&mut *conn)
            .await?;
        
        let total_records: i64 = sqlx::Row::get(&attendance_row, "total_records");
        let present_count: i64 = sqlx::Row::get(&attendance_row, "present_count");
        let absent_count: i64 = sqlx::Row::get(&attendance_row, "absent_count");
        let auto_marked_count: i64 = sqlx::Row::get(&attendance_row, "auto_marked_count");
        let today_count: i64 = sqlx::Row::get(&attendance_row, "today_count");
        
        // Get system performance metrics
        let performance_query = "
            SELECT 
                AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) * 1000 as avg_job_time_ms,
                COUNT(*) as total_jobs_24h
            FROM system_logs 
            WHERE school_id = $1 
            AND log_type LIKE '%_run'
            AND created_at >= NOW() - INTERVAL '24 hours'
            AND completed_at IS NOT NULL
        ";
        
        let performance_row = sqlx::query(performance_query)
            .bind(school_id)
            .fetch_one(&mut *conn)
            .await;
        
        let (avg_job_time_ms, total_jobs_24h): (Option<f64>, i64) = match performance_row {
            Ok(row) => {
                let avg: Option<f64> = sqlx::Row::try_get(&row, "avg_job_time_ms").ok();
                let total: i64 = sqlx::Row::try_get(&row, "total_jobs_24h").unwrap_or(0);
                (avg, total)
            },
            Err(_) => (None, 0)
        };
        
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
        // This is a simplified implementation
        // In production, you would use system-specific APIs
        128.0 // Placeholder value in MB
    }

    /// Log health check result
    pub async fn log_health_check(&self, school_id: &str, health_status: &Value) -> AppResult<()> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let log_query = "
            INSERT INTO system_logs (
                school_id, log_type, status, details, created_at
            ) VALUES ($1, $2, $3, $4, $5)
        ";
        
        sqlx::query(log_query)
            .bind(school_id)
            .bind("health_check")
            .bind(health_status["status"].as_str().unwrap_or("unknown"))
            .bind(health_status)
            .bind(Utc::now())
            .execute(&mut *conn)
            .await?;
        
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
                        println!("[Health Monitor] School {} health status: {}", school_id, status);
                        
                        // Log the health check
                        let _ = health_monitor.log_health_check(&school_id, &health_status).await;
                        
                        // If status is critical, send alert
                        if status == "critical" {
                            println!("[Health Monitor] CRITICAL: School {} system health is critical!", school_id);
                            // TODO: Send alert notification
                        }
                    }
                    Err(e) => {
                        eprintln!("[Health Monitor] Error checking health for school {}: {}", school_id, e);
                    }
                }
            }
        });
    }
}