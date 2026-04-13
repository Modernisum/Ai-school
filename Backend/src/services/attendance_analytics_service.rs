use crate::error::{AppError, AppResult};
use crate::repository::Repositories;
use crate::services::traits::AttendanceAnalyticsService;
use async_trait::async_trait;
use chrono::{Datelike, Days, Months, NaiveDate, Utc};
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

use crate::logic::cache_service::ResponsibilityCacheService;

pub struct PostgresAttendanceAnalyticsService {
    pub repos: Arc<Repositories>,
    pub cache: Arc<ResponsibilityCacheService>,
}

impl PostgresAttendanceAnalyticsService {
    pub fn new(repos: Arc<Repositories>, cache: Arc<ResponsibilityCacheService>) -> Self {
        Self { repos, cache }
    }

    /// Helper: Parse date string to NaiveDate
    fn parse_date(&self, date_str: &str) -> AppResult<NaiveDate> {
        NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
            .map_err(|e| AppError::Validation(format!("Invalid date format: {} - {}", date_str, e)))
    }

    /// Helper: Parse month string (YYYY-MM) to (year, month)
    fn parse_month(&self, month_str: &str) -> AppResult<(i32, u32)> {
        let parts: Vec<&str> = month_str.split('-').collect();
        if parts.len() != 2 {
            return Err(AppError::Validation(format!("Invalid month format: {}", month_str)));
        }
        let year = parts[0].parse::<i32>()
            .map_err(|e| AppError::Validation(format!("Invalid year: {} - {}", parts[0], e)))?;
        let month = parts[1].parse::<u32>()
            .map_err(|e| AppError::Validation(format!("Invalid month: {} - {}", parts[1], e)))?;
        
        if month < 1 || month > 12 {
            return Err(AppError::Validation(format!("Month must be 1-12: {}", month)));
        }
        
        Ok((year, month))
    }

    /// Helper: Calculate date range from period type
    fn calculate_date_range(&self, period_type: &str, period_count: i32) -> AppResult<(NaiveDate, NaiveDate)> {
        let today = Utc::now().date_naive();
        let end_date = today;
        
        let start_date = match period_type {
            "daily" => today.checked_sub_days(Days::new(period_count as u64))
                .ok_or_else(|| AppError::Validation("Invalid date calculation".to_string()))?,
            "weekly" => today.checked_sub_days(Days::new((period_count * 7) as u64))
                .ok_or_else(|| AppError::Validation("Invalid date calculation".to_string()))?,
            "monthly" => today.checked_sub_months(Months::new(period_count as u32))
                .ok_or_else(|| AppError::Validation("Invalid date calculation".to_string()))?,
            _ => return Err(AppError::Validation(format!("Invalid period type: {}", period_type))),
        };
        
        Ok((start_date, end_date))
    }
}

#[async_trait]
impl AttendanceAnalyticsService for PostgresAttendanceAnalyticsService {
    async fn get_daily_summary(
        &self,
        school_id: &str,
        date: &str,
    ) -> AppResult<Value> {
        // Try cache first
        if let Ok(Some(cached)) = self.cache.get_analytics(school_id, "attendance_daily", date).await {
            return Ok(cached);
        }

        let target_date = self.parse_date(date)?;
        
        // Query daily attendance summary
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let summary_query = r#"
            SELECT 
                role,
                status,
                COUNT(*) as count
            FROM attendance
            WHERE school_id = $1 AND date = $2
            GROUP BY role, status
            ORDER BY role, status
        "#;
        
        let rows = sqlx::query(summary_query)
            .bind(school_id)
            .bind(target_date)
            .fetch_all(&mut *conn)
            .await?;
        
        let mut summary = json!({
            "date": date,
            "student": {"present": 0, "absent": 0, "leave": 0, "holiday": 0, "total": 0},
            "employee": {"present": 0, "absent": 0, "leave": 0, "holiday": 0, "total": 0},
            "overall": {"present": 0, "absent": 0, "leave": 0, "holiday": 0, "total": 0}
        });
        
        for row in rows {
            let role: String = row.get("role");
            let status: String = row.get("status");
            let count: i64 = row.get("count");
            
            let status_key = status.to_lowercase();
            
            // Update role-specific counts
            if let Some(role_map) = summary.get_mut(&role) {
                if let Some(target) = role_map.get_mut(&status_key) {
                    *target = json!(count);
                }
                // Update total for this role
                if let Some(total) = role_map.get_mut("total") {
                    if let Value::Number(current) = total {
                        let new_total = current.as_i64().unwrap_or(0) + count;
                        *total = json!(new_total);
                    }
                }
            }
            
            // Update overall counts
            if let Some(overall_map) = summary.get_mut("overall") {
                if let Some(target) = overall_map.get_mut(&status_key) {
                    if let Value::Number(current) = target {
                        let new_count = current.as_i64().unwrap_or(0) + count;
                        *target = json!(new_count);
                    }
                }
                if let Some(total) = overall_map.get_mut("total") {
                    if let Value::Number(current) = total {
                        let new_total = current.as_i64().unwrap_or(0) + count;
                        *total = json!(new_total);
                    }
                }
            }
        }
        
        // Calculate percentages
        for role in &["student", "employee", "overall"] {
            if let Some(role_map) = summary.get_mut(*role) {
                if let (Some(total_val), Some(present_val)) = (role_map.get("total"), role_map.get("present")) {
                    if let (Value::Number(total), Value::Number(present)) = (total_val, present_val) {
                        let total_num = total.as_i64().unwrap_or(0);
                        let present_num = present.as_i64().unwrap_or(0);
                        
                        if total_num > 0 {
                            let percentage = (present_num as f64 / total_num as f64) * 100.0;
                            role_map["attendance_percentage"] = json!(percentage.round() as i64);
                        } else {
                            role_map["attendance_percentage"] = json!(0);
                        }
                    }
                }
            }
        }
        
        
        // Cache the result (15 minutes TTL)
        let _ = self.cache.cache_analytics(
            school_id,
            "attendance_daily",
            date,
            &summary,
            15 * 60,
        ).await;
        
        Ok(summary)
    }

    async fn get_monthly_stats(
        &self,
        school_id: &str,
        month: &str,
    ) -> AppResult<Value> {
        // Try cache first
        if let Ok(Some(cached)) = self.cache.get_analytics(school_id, "attendance_monthly", month).await {
            return Ok(cached);
        }

        let (year, month_num) = self.parse_month(month)?;
        
        let start_date = NaiveDate::from_ymd_opt(year, month_num, 1)
            .ok_or_else(|| AppError::Validation("Invalid month".to_string()))?;
        let end_date = start_date.with_day(1)
            .and_then(|d| d.checked_add_months(Months::new(1)))
            .and_then(|d| d.checked_sub_days(Days::new(1)))
            .unwrap_or(start_date.with_day(28).unwrap());
        
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let monthly_query = r#"
            SELECT 
                role,
                status,
                COUNT(*) as count
            FROM attendance
            WHERE school_id = $1 
              AND date >= $2 
              AND date <= $3
            GROUP BY role, status
            ORDER BY role, status
        "#;
        
        let rows = sqlx::query(monthly_query)
            .bind(school_id)
            .bind(start_date)
            .bind(end_date)
            .fetch_all(&mut *conn)
            .await?;
        
        let mut stats = json!({
            "month": month,
            "period_start": start_date.to_string(),
            "period_end": end_date.to_string(),
            "student": {"present": 0, "absent": 0, "leave": 0, "total": 0},
            "employee": {"present": 0, "absent": 0, "leave": 0, "total": 0},
            "overall": {"present": 0, "absent": 0, "leave": 0, "total": 0}
        });
        
        for row in rows {
            let role: String = row.get("role");
            let status: String = row.get("status");
            let count: i64 = row.get("count");
            
            let status_key = status.to_lowercase();
            
            if let Some(role_map) = stats.get_mut(&role) {
                if let Some(target) = role_map.get_mut(&status_key) {
                    *target = json!(count);
                }
                // Update total for this role
                if let Some(total) = role_map.get_mut("total") {
                    if let Value::Number(current) = total {
                        let new_total = current.as_i64().unwrap_or(0) + count;
                        *total = json!(new_total);
                    }
                }
            }
            
            // Update overall counts
            if let Some(overall_map) = stats.get_mut("overall") {
                if let Some(target) = overall_map.get_mut(&status_key) {
                    if let Value::Number(current) = target {
                        let new_count = current.as_i64().unwrap_or(0) + count;
                        *target = json!(new_count);
                    }
                }
                if let Some(total) = overall_map.get_mut("total") {
                    if let Value::Number(current) = total {
                        let new_total = current.as_i64().unwrap_or(0) + count;
                        *total = json!(new_total);
                    }
                }
            }
        }
        
        // Calculate percentages
        for role in &["student", "employee", "overall"] {
            if let Some(role_map) = stats.get_mut(*role) {
                if let (Some(total_val), Some(present_val)) = (role_map.get("total"), role_map.get("present")) {
                    if let (Value::Number(total), Value::Number(present)) = (total_val, present_val) {
                        let total_num = total.as_i64().unwrap_or(0);
                        let present_num = present.as_i64().unwrap_or(0);
                        
                        if total_num > 0 {
                            let percentage = (present_num as f64 / total_num as f64) * 100.0;
                            role_map["attendance_percentage"] = json!(percentage.round() as i64);
                        } else {
                            role_map["attendance_percentage"] = json!(0);
                        }
                    }
                }
            }
        }
        
        
        // Cache the result (1 hour TTL for monthly reports)
        let _ = self.cache.cache_analytics(
            school_id,
            "attendance_monthly",
            month,
            &stats,
            60 * 60,
        ).await;
        
        Ok(stats)
    }

    async fn get_student_report(
        &self,
        school_id: &str,
        student_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        let start = self.parse_date(start_date)?;
        let end = self.parse_date(end_date)?;
        
        if start > end {
            return Err(AppError::Validation("Start date must be before end date".to_string()));
        }
        
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        // Get student attendance details
        let attendance_query = r#"
            SELECT 
                date,
                status,
                in_time,
                out_time,
                total_time,
                class_name
            FROM attendance
            WHERE school_id = $1 
              AND user_id = $2
              AND role = 'student'
              AND date >= $3 
              AND date <= $4
            ORDER BY date DESC
        "#;
        
        let rows = sqlx::query(attendance_query)
            .bind(school_id)
            .bind(student_id)
            .bind(start)
            .bind(end)
            .fetch_all(&mut *conn)
            .await?;
        
        let mut attendance_records = Vec::new();
        let mut present_count = 0;
        let mut absent_count = 0;
        let mut leave_count = 0;
        
        for row in rows {
            let date: NaiveDate = row.get("date");
            let status: String = row.get("status");
            let class_name: Option<String> = row.get("class_name");
            
            match status.to_lowercase().as_str() {
                "present" => present_count += 1,
                "absent" => absent_count += 1,
                "leave" => leave_count += 1,
                _ => {}
            }
            
            attendance_records.push(json!({
                "date": date.to_string(),
                "status": status,
                "class_name": class_name,
                "in_time": row.get::<Option<String>, _>("in_time"),
                "out_time": row.get::<Option<String>, _>("out_time"),
                "total_time": row.get::<Option<String>, _>("total_time")
            }));
        }
        
        let total_days = attendance_records.len();
        let attendance_percentage = if total_days > 0 {
            (present_count as f64 / total_days as f64) * 100.0
        } else {
            0.0
        };
        
        // Get student basic info
        let student_info_query = r#"
            SELECT name, class_name, section
            FROM students
            WHERE school_id = $1 AND student_id = $2
        "#;
        
        let student_info = sqlx::query(student_info_query)
            .bind(school_id)
            .bind(student_id)
            .fetch_optional(&mut *conn)
            .await?;
        
        let report = json!({
            "student_id": student_id,
            "student_info": student_info.map(|row| json!({
                "name": row.get::<Option<String>, _>("name"),
                "class": row.get::<Option<String>, _>("class_name"),
                "section": row.get::<Option<String>, _>("section")
            })),
            "period": {
                "start_date": start_date,
                "end_date": end_date
            },
            "summary": {
                "total_days": total_days,
                "present": present_count,
                "absent": absent_count,
                "leave": leave_count,
                "attendance_percentage": attendance_percentage.round() as i64
            },
            "attendance_records": attendance_records
        });
        
        Ok(report)
    }

    async fn get_class_report(
        &self,
        school_id: &str,
        class_name: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        let start = self.parse_date(start_date)?;
        let end = self.parse_date(end_date)?;
        
        if start > end {
            return Err(AppError::Validation("Start date must be before end date".to_string()));
        }
        
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        // Get class attendance summary
        let class_query = r#"
            SELECT 
                a.user_id as student_id,
                s.name as student_name,
                COUNT(*) as total_days,
                COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
                COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
                COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_days
            FROM attendance a
            LEFT JOIN students s ON a.school_id = s.school_id AND a.user_id = s.student_id
            WHERE a.school_id = $1 
              AND a.class_name = $2
              AND a.date >= $3 
              AND a.date <= $4
              AND a.role = 'student'
            GROUP BY a.user_id, s.name
            ORDER BY s.name
        "#;
        
        let rows = sqlx::query(class_query)
            .bind(school_id)
            .bind(class_name)
            .bind(start)
            .bind(end)
            .fetch_all(&mut *conn)
            .await?;
        
        let mut student_reports = Vec::new();
        let mut total_students = 0;
        let mut total_present = 0;
        let mut total_absent = 0;
        let mut total_leave = 0;
        
        for row in rows {
            let student_id: String = row.get("student_id");
            let student_name: Option<String> = row.get("student_name");
            let total_days: i64 = row.get("total_days");
            let present_days: i64 = row.get("present_days");
            let absent_days: i64 = row.get("absent_days");
            let leave_days: i64 = row.get("leave_days");
            
            let attendance_percentage = if total_days > 0 {
                (present_days as f64 / total_days as f64) * 100.0
            } else {
                0.0
            };
            
            student_reports.push(json!({
                "student_id": student_id,
                "student_name": student_name,
                "total_days": total_days,
                "present_days": present_days,
                "absent_days": absent_days,
                "leave_days": leave_days,
                "attendance_percentage": attendance_percentage.round() as i64
            }));
            
            total_students += 1;
            total_present += present_days;
            total_absent += absent_days;
            total_leave += leave_days;
        }
        
        let total_days_all = total_present + total_absent + total_leave;
        let overall_percentage = if total_days_all > 0 {
            (total_present as f64 / total_days_all as f64) * 100.0
        } else {
            0.0
        };

        let report = json!({
            "class_name": class_name,
            "period": {
                "start_date": start_date,
                "end_date": end_date
            },
            "summary": {
                "total_students": total_students,
                "total_days": total_days_all,
                "total_present": total_present,
                "total_absent": total_absent,
                "total_leave": total_leave,
                "overall_attendance_percentage": overall_percentage.round() as i64
            },
            "student_reports": student_reports
        });

        Ok(report)
    }

    async fn generate_custom_report(
        &self,
        _school_id: &str,
        _report_type: &str,
        _start_date: &str,
        _end_date: &str,
        _filters: Value,
    ) -> AppResult<Value> {
        Ok(json!({}))
    }

    async fn calculate_attendance_percentage(
        &self,
        _school_id: &str,
        _role: &str,
        _user_id: &str,
        _start_date: &str,
        _end_date: &str,
    ) -> AppResult<f64> {
        Ok(0.0)
    }

    async fn get_employee_report(
        &self,
        _school_id: &str,
        _employee_id: &str,
        _start_date: &str,
        _end_date: &str,
    ) -> AppResult<Value> {
        Ok(json!({}))
    }

    async fn identify_attendance_patterns(
        &self,
        _school_id: &str,
        _role: &str,
        _user_id: &str,
        _period_days: i32,
    ) -> AppResult<Value> {
        Ok(json!({}))
    }

    async fn get_attendance_trends(
        &self,
        _school_id: &str,
        _role: &str,
        _period_type: &str, // "daily", "weekly", "monthly"
        _period_count: i32, // Number of periods to look back
    ) -> AppResult<Value> {
        Ok(json!({}))
    }

    async fn export_report(
        &self,
        _school_id: &str,
        _report_id: &str,
        _format: &str, // "pdf", "excel", "csv"
    ) -> AppResult<Value> {
        Ok(json!({}))
    }

    async fn cache_report(
        &self,
        _school_id: &str,
        _report_type: &str,
        _period_start: &str,
        _period_end: &str,
        _data: Value,
        _metadata: Value,
    ) -> AppResult<String> {
        Ok("".to_string())
    }

    async fn get_cached_report(
        &self,
        _school_id: &str,
        _report_type: &str,
        _start_date: &str,
        _end_date: &str,
        _filters_hash: &str,
    ) -> AppResult<Option<Value>> {
        Ok(None)
    }
}