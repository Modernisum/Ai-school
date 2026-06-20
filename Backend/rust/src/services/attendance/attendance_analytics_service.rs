use crate::error::{AppError, AppResult};
use crate::repository::Repositories;
use crate::services::traits::AttendanceAnalyticsService;
use async_trait::async_trait;
use chrono::{Datelike, Days, Months, NaiveDate, Utc};
use serde_json::{json, Value};
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

    fn parse_date(&self, date_str: &str) -> AppResult<NaiveDate> {
        NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
            .map_err(|e| AppError::Validation(format!("Invalid date format: {} - {}", date_str, e)))
    }
}

#[async_trait]
impl AttendanceAnalyticsService for PostgresAttendanceAnalyticsService {
    async fn get_advanced_attendance_stats(
        &self,
        school_id: &str,
        query: crate::models::attendance::AttendanceQuery,
    ) -> AppResult<Value> {
        let target_date = query.date.clone().unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string());
        let (start_date, end_date) = if let Some(period) = &query.period {
            match period.as_str() {
                "day" => (self.parse_date(&target_date)?, self.parse_date(&target_date)?),
                "week" => {
                    let d = self.parse_date(&target_date)?;
                    (d, d.checked_add_days(Days::new(7)).unwrap_or(d))
                },
                "month" => {
                    let d = self.parse_date(&target_date)?;
                    (d.with_day(1).unwrap(), d.with_day(1).unwrap().checked_add_months(Months::new(1)).unwrap().pred_opt().unwrap())
                },
                "year" => {
                    let d = self.parse_date(&target_date)?;
                    (NaiveDate::from_ymd_opt(d.year(), 1, 1).unwrap(), NaiveDate::from_ymd_opt(d.year(), 12, 31).unwrap())
                },
                _ => (self.parse_date(&target_date)?, self.parse_date(&target_date)?),
            }
        } else {
            (self.parse_date(&target_date)?, self.parse_date(&target_date)?)
        };

        let records = self.repos.analytics.get_filtered_attendance(
            school_id,
            &start_date.to_string(),
            &end_date.to_string(),
            query.user_type.as_deref(),
            query.class_name.as_deref(),
            query.user_ids.as_deref(),
        ).await?;

        let mut total_present = 0;
        let mut total_absent = 0;
        let mut total_leave = 0;
        for r in &records {
            match r["status"].as_str().unwrap_or("") {
                "present" => total_present += 1,
                "absent" => total_absent += 1,
                "leave" => total_leave += 1,
                _ => {}
            }
        }
        let total_users = records.len();
        let attendance_percentage = if total_users > 0 { (total_present as f64 / total_users as f64) * 100.0 } else { 0.0 };

        Ok(json!({
            "period": { "start": start_date.to_string(), "end": end_date.to_string() },
            "summary": { "total_users": total_users, "total_present": total_present, "total_absent": total_absent, "total_leave": total_leave, "attendance_percentage": attendance_percentage },
            "records": records
        }))
    }

    async fn get_student_report(
        &self,
        school_id: &str,
        student_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        Ok(self.repos.analytics.get_student_attendance_report(school_id, student_id, start_date, end_date).await?)
    }

    async fn get_class_report(
        &self,
        school_id: &str,
        class_name: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value> {
        Ok(self.repos.analytics.get_class_attendance_report(school_id, class_name, start_date, end_date).await?)
    }

    async fn get_employee_report(&self, _school_id: &str, _employee_id: &str, _start_date: &str, _end_date: &str) -> AppResult<Value> {
        Ok(json!({"message": "Employee report - implementation pending"}))
    }

    async fn generate_custom_report(&self, _school_id: &str, report_type: &str, _start_date: &str, _end_date: &str, _filters: Value) -> AppResult<Value> {
        Ok(json!({"message": "Custom report generation - implementation pending", "report_type": report_type}))
    }

    async fn calculate_attendance_percentage(&self, _school_id: &str, _role: &str, _user_id: &str, _start_date: &str, _end_date: &str) -> AppResult<f64> {
        Ok(0.0)
    }

    async fn identify_attendance_patterns(&self, _school_id: &str, _role: &str, _user_id: &str, _period_days: i32) -> AppResult<Value> {
        Ok(json!({"message": "Pattern identification - implementation pending", "period_days": _period_days}))
    }

    async fn get_attendance_trends(&self, _school_id: &str, _role: &str, _period_type: &str, _period_count: i32) -> AppResult<Value> {
        Ok(json!({"message": "Attendance trends - implementation pending"}))
    }

    async fn export_report(&self, _school_id: &str, _report_id: &str, _format: &str) -> AppResult<Value> {
        Ok(json!({"message": "Export report - implementation pending"}))
    }

    async fn cache_report(&self, _school_id: &str, _report_type: &str, _period_start: &str, _period_end: &str, _data: Value, _metadata: Value) -> AppResult<String> {
        Ok("pending".to_string())
    }

    async fn get_cached_report(&self, _school_id: &str, _report_type: &str, _period_start: &str, _period_end: &str, _filters_hash: &str) -> AppResult<Option<Value>> {
        Ok(None)
    }
}
