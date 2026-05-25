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
        
        if !(1..=12).contains(&month) {
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
    async fn get_advanced_attendance_stats(
        &self,
        school_id: &str,
        query: crate::domain::attendance::attendance::AttendanceQuery,
    ) -> AppResult<Value> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;

        // 1. Determine Date Range
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

        // 2. Build Dynamic SQL with User Details (Name/Image)
        let mut sql = String::from(r#"
            SELECT
                a.user_id, a.role, a.date, a.status, a.in_time, a.out_time, a.class_name, a.reason,
                COALESCE(s.name, e.data->>'name') as name,
                COALESCE(s.profile_image_url, e.profile_image_url) as image_url
            FROM attendance a
            LEFT JOIN students s ON a.user_id = s.student_id AND a.school_id = s.school_id
            LEFT JOIN employees e ON a.user_id = e.employee_id AND a.school_id = e.school_id
            WHERE a.school_id = $1 AND a.date >= $2 AND a.date <= $3
        "#);
        let mut bind_index = 4;

        if let Some(user_type) = &query.user_type {
            sql.push_str(&format!(" AND a.role = ${}", bind_index));
            bind_index += 1;
        }
        if let Some(class_name) = &query.class_name {
            sql.push_str(&format!(" AND a.class_name = ${}", bind_index));
            bind_index += 1;
        }
        if let Some(incoming_after) = &query.incoming_after {
            sql.push_str(&format!(" AND a.in_time > ${}", bind_index));
            bind_index += 1;
        }
        if let Some(outgoing_before) = &query.outgoing_before {
            sql.push_str(&format!(" AND a.out_time < ${}", bind_index));
            bind_index += 1;
        }
        if let Some(user_ids_str) = &query.user_ids {
            let ids: Vec<&str> = user_ids_str.split(',').map(|s| s.trim()).collect();
            sql.push_str(&format!(" AND a.user_id = ANY(${}::text[])", bind_index));
            bind_index += 1;
        }
        if let Some(_space_name) = &query.space_name {
            sql.push_str(&format!(" AND a.space_name = ${}", bind_index));
            bind_index += 1;
        }

        // 4. Advanced Filtered Query execution
        let mut q_exec = sqlx::query(&sql).bind(school_id).bind(start_date).bind(end_date);
        
        if let Some(user_type) = &query.user_type { q_exec = q_exec.bind(user_type); }
        if let Some(class_name) = &query.class_name { q_exec = q_exec.bind(class_name); }
        if let Some(incoming_after) = &query.incoming_after { q_exec = q_exec.bind(incoming_after); }
        if let Some(outgoing_before) = &query.outgoing_before { q_exec = q_exec.bind(outgoing_before); }
        if let Some(user_ids_str) = &query.user_ids {
            let ids: Vec<String> = user_ids_str.split(',').map(|s| s.trim().to_string()).collect();
            q_exec = q_exec.bind(ids);
        }
        if let Some(space_name) = &query.space_name { q_exec = q_exec.bind(space_name); }

        let rows = q_exec.fetch_all(&mut *conn).await?;
        
        // 5. Calculate DYNAMIC SUMMARY from filtered results
        let mut total_present = 0;
        let mut total_absent = 0;
        let mut total_leave = 0;

        for row in &rows {
            let status: String = row.get("status");
            match status.to_lowercase().as_str() {
                "present" => total_present += 1,
                "absent" => total_absent += 1,
                "leave" => total_leave += 1,
                _ => {}
            }
        }

        let total_users = rows.len();
        let attendance_percentage = if total_users > 0 {
            (total_present as f64 / total_users as f64) * 100.0
        } else {
            0.0
        };

        // 6. Transform rows to JSON with DYNAMIC FIELD SELECTION
        let requested_fields: Vec<String> = query.fields.as_ref()
            .map(|f| f.split(',').map(|s| s.trim().to_string()).collect())
            .unwrap_or_default();

        let records: Vec<Value> = rows.iter().map(|r| {
            let mut record = json!({
                "user_id": r.get::<String, _>("user_id"),
                "user_type": r.get::<String, _>("role"),
                "name": r.get::<Option<String>, _>("name"),
                "image_url": r.get::<Option<String>, _>("image_url"),
                "date": r.get::<NaiveDate, _>("date").to_string(),
                "status": r.get::<String, _>("status"),
                "in_time": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("in_time").map(|dt| dt.to_rfc3339()),
                "out_time": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("out_time").map(|dt| dt.to_rfc3339()),
                "class_name": r.get::<Option<String>, _>("class_name"),
                "reason": r.get::<Option<String>, _>("reason")
            });

            // If specific fields are requested, filter the JSON object
            if !requested_fields.is_empty() {
                if let Value::Object(ref mut map) = record {
                    let mut filtered_map = serde_json::Map::new();
                    for field in &requested_fields {
                        if let Some(val) = map.remove(field) {
                            filtered_map.insert(field.clone(), val);
                        }
                    }
                    *map = filtered_map;
                }
            }
            record
        }).collect();

        Ok(json!({
            "period": { "start": start_date.to_string(), "end": end_date.to_string() },
            "summary": {
                "total_users": total_users,
                "total_present": total_present,
                "total_absent": total_absent,
                "total_leave": total_leave,
                "attendance_percentage": attendance_percentage
            },
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
                "in_time": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("in_time").map(|dt| dt.to_rfc3339()),
                "out_time": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("out_time").map(|dt| dt.to_rfc3339()),
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
              AND (a.class_name = $2 OR s.class_name = $2)
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