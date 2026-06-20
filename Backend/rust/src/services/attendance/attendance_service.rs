use crate::repository::Repositories;
use crate::services::traits::*;
use crate::services::utils::{audit::log_audit, delta::calculate_delta, time::parse_to_rfc3339};
use crate::logic::geo_engine::haversine_distance;
use async_trait::async_trait;
use chrono::{Datelike, Local};
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;


pub struct PostgresAttendanceService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl AttendanceService for PostgresAttendanceService {
    async fn mark_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let mut final_data = data.clone();

        // Normalize snake_case fields to camelCase
        if let Some(in_t) = final_data.get("in_time").and_then(|v| v.as_str()) {
            final_data["inTime"] = json!(in_t);
        }
        if let Some(out_t) = final_data.get("out_time").and_then(|v| v.as_str()) {
            final_data["outTime"] = json!(out_t);
        }
        if let Some(total_t) = final_data.get("total_time").and_then(|v| v.as_str()) {
            final_data["totalTime"] = json!(total_t);
        }

        // Ensure status defaults to "present"
        if final_data.get("status").and_then(|v| v.as_str()).unwrap_or("").is_empty() {
            final_data["status"] = json!("present");
        }

        let date = final_data["date"]
            .as_str()
            .unwrap_or(&Local::now().format("%Y-%m-%d").to_string())
            .to_string();

        if let Some(in_t) = final_data.get("inTime").and_then(|v| v.as_str()) {
            if let Some(normalized) = parse_to_rfc3339(in_t, &date) {
                final_data["inTime"] = json!(normalized);
            }
        }
        if let Some(out_t) = final_data.get("outTime").and_then(|v| v.as_str()) {
            if let Some(normalized) = parse_to_rfc3339(out_t, &date) {
                final_data["outTime"] = json!(normalized);
            }
        }

        if let (Some(in_t), Some(out_t)) = (final_data["inTime"].as_str(), final_data["outTime"].as_str()) {
            let duration = self.calculate_duration(in_t, out_t);
            final_data["totalTime"] = json!(duration);
        }

        self.repos
            .attendance
            .mark_attendance(school_id, role, user_id, &date, final_data.clone())
            .await?;

        let mut response_data = final_data.clone();
        let transform_time = |t_str: &str| {
            if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(t_str) {
                json!({
                    "_seconds": dt.timestamp(),
                    "_nanoseconds": dt.timestamp_subsec_nanos()
                })
            } else {
                json!({})
            }
        };

        if let Some(it) = response_data["inTime"].as_str() {
            response_data["inTime"] = transform_time(it);
        }
        if let Some(ot) = response_data["outTime"].as_str() {
            response_data["outTime"] = transform_time(ot);
        }

        response_data["createdAt"] = json!({});
        response_data["updatedAt"] = json!({});

        self.repos
            .attendance
            .add_attendance_history(school_id, role, user_id, "mark", final_data.clone())
            .await?;

        log_audit(&self.repos.audit, school_id, admin_id, "ATTENDANCE", user_id, "MARK", final_data).await;

        Ok(response_data)
    }

    async fn mark_holiday(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let date = data["date"]
            .as_str()
            .ok_or_else(|| AppError::Validation("date is required for holiday".to_string()))?
            .to_string();

        let description = data["description"]
            .as_str()
            .unwrap_or("Holiday")
            .to_string();

        let holiday_data = json!({
            "status": "holiday",
            "date": date,
            "description": description,
        });

        self.repos
            .attendance
            .mark_attendance(school_id, role, user_id, &date, holiday_data.clone())
            .await?;

        self.repos
            .attendance
            .add_attendance_history(
                school_id,
                role,
                user_id,
                "holiday_marked",
                holiday_data.clone(),
            )
            .await?;

        log_audit(&self.repos.audit, school_id, admin_id, "ATTENDANCE_HOLIDAY", user_id, "MARK_HOLIDAY", holiday_data.clone()).await;

        Ok(holiday_data)
    }

    async fn update_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let out_time_input = data["outTime"]
            .as_str()
            .or_else(|| data["out_time"].as_str())
            .ok_or_else(|| AppError::Validation("outTime is required".to_string()))?
            .to_string();
        let out_time = parse_to_rfc3339(&out_time_input, date).unwrap_or(out_time_input);

        let existing_list = self
            .repos
            .attendance
            .get_attendance(school_id, role, user_id)
            .await?;
        let existing = existing_list
            .iter()
            .find(|a| a["date"].as_str() == Some(date))
            .ok_or_else(|| AppError::NotFound("Attendance record not found".to_string()))?
            .clone();

        let in_time = existing["inTime"].as_str().unwrap_or("").to_string();
        let total_time = if !in_time.is_empty() {
            self.calculate_duration(&in_time, &out_time)
        } else {
            String::new()
        };

        let mut updated = existing.clone();
        updated["outTime"] = json!(out_time);
        updated["totalTime"] = json!(total_time);

        if let Some(status) = data["status"].as_str() {
            updated["status"] = json!(status);
        }
        if let Some(reason) = data["reason"].as_str() {
            updated["reason"] = json!(reason);
        }

        self.repos
            .attendance
            .mark_attendance(school_id, role, user_id, date, updated.clone())
            .await?;

        self.repos
            .attendance
            .add_attendance_history(
                school_id,
                role,
                user_id,
                "attendance_updated",
                json!({"outTime": out_time, "totalTime": total_time}),
            )
            .await?;

        let delta = calculate_delta(&existing, &updated);
        if !delta.as_object().map(|o| o.is_empty()).unwrap_or(true) {
            log_audit(&self.repos.audit, school_id, admin_id, "ATTENDANCE", user_id, "UPDATE", delta).await;
        }

        Ok(updated)
    }

    async fn delete_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
        admin_id: &str,
    ) -> AppResult<()> {
        let existing_list = self
            .repos
            .attendance
            .get_attendance(school_id, role, user_id)
            .await?;
        let existing = existing_list
            .iter()
            .find(|a| a["date"].as_str() == Some(date))
            .cloned();

        self.repos
            .attendance
            .delete_attendance(school_id, role, user_id, date)
            .await?;

        if let Some(e) = existing {
            log_audit(&self.repos.audit, school_id, admin_id, "ATTENDANCE", user_id, "DELETE", e).await;
        }

        self.repos
            .attendance
            .add_attendance_history(
                school_id,
                role,
                user_id,
                "attendance_deleted",
                json!({"date": date}),
            )
            .await?;

        Ok(())
    }

    async fn list_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
    ) -> AppResult<Vec<Value>> {
        Ok(self
            .repos
            .attendance
            .get_attendance(school_id, role, user_id)
            .await?)
    }

    async fn list_attendance_by_date(&self, school_id: &str, date: &str) -> AppResult<Vec<String>> {
        let user_ids = self.repos.attendance.get_student_ids_with_attendance_for_date(school_id, date).await?;
        Ok(user_ids)
    }


    async fn list_school_holidays(
        &self,
        school_id: &str,
        month: Option<i32>,
        year: Option<i32>,
    ) -> AppResult<Vec<Value>> {
        let now = Local::now();
        let query_year = year.unwrap_or(now.year());
        let (start_date, end_date) = if let Some(m) = month {
            (
                format!("{}-{:02}-01", query_year, m),
                format!("{}-{:02}-31", query_year, m),
            )
        } else {
            let academic_start = if now.month() < 4 {
                query_year - 1
            } else {
                query_year
            };
            (
                format!("{}-04-01", academic_start),
                format!("{}-03-31", academic_start + 1),
            )
        };

        let list = self.repos.attendance.list_holidays(school_id, &start_date, &end_date).await?;

        let mut data = Vec::new();
        for r in list {
            let id = r["id"].as_str().unwrap_or("").to_string();
            let title = r["title"].as_str().unwrap_or("").to_string();
            let desc = r["description"].as_str().unwrap_or("").to_string();
            let from_str = r["fromDate"].as_str().unwrap_or("").to_string();
            let to_str = r["toDate"].as_str().unwrap_or("").to_string();
            let classes = r["classes"].clone();

            if let (Ok(start), Ok(end)) = (
                chrono::NaiveDate::parse_from_str(&from_str, "%Y-%m-%d"),
                chrono::NaiveDate::parse_from_str(&to_str, "%Y-%m-%d"),
            ) {
                let mut curr = start;
                while curr <= end {
                    let curr_str = curr.format("%Y-%m-%d").to_string();
                    if curr_str >= start_date && curr_str <= end_date {
                        data.push(json!({ "id": id, "date": curr_str, "title": title, "description": desc, "classes": classes, "fullRange": { "from": from_str, "to": to_str } }));
                    }
                    curr = curr.succ_opt().unwrap_or(curr);
                    if curr == start {
                        break;
                    } // safety
                }
            }
        }
        data.sort_by(|a, b| a["date"].as_str().cmp(&b["date"].as_str()));
        Ok(data)
    }

    async fn get_holiday_detail(&self, school_id: &str, holiday_id: &str) -> AppResult<Value> {
        let holiday = self.repos.attendance.get_holiday(school_id, holiday_id).await?
            .ok_or_else(|| AppError::NotFound("Holiday not found".to_string()))?;
        Ok(holiday)
    }

    async fn create_school_holiday(&self, school_id: &str, data: Value) -> AppResult<Value> {
        let from_date = data["fromDate"]
            .as_str()
            .ok_or_else(|| AppError::Validation("fromDate required".into()))?
            .to_string();
        let id = uuid::Uuid::new_v4().to_string();
        let title = data["title"].as_str().unwrap_or("Holiday").to_string();
        let desc = data["description"].as_str().unwrap_or("").to_string();
        let to_date = data["toDate"].as_str().unwrap_or(&from_date).to_string();
        let classes = data["classes"].clone();
        let ex_emp = data["exemptEmployees"].clone();
        let ex_std = data["exemptStudents"].clone();
        let now = Local::now().format("%Y-%m-%d").to_string();

        self.repos.attendance.insert_holiday(&id, school_id, &title, &desc, &from_date, &to_date, classes, ex_emp, ex_std, &now).await?;

        Ok(json!({ "id": id, "title": title, "fromDate": from_date, "toDate": to_date }))
    }

    async fn delete_school_holiday(&self, school_id: &str, holiday_id: &str) -> AppResult<()> {
        self.repos.attendance.delete_holiday(school_id, holiday_id).await?;
        Ok(())
    }

    async fn check_school_holiday(&self, school_id: &str, date: &str) -> AppResult<Value> {
        let r = self.repos.attendance.check_holiday(school_id, date).await?;

        match r {
            Some(row) => Ok(
                json!({ "success": true, "isHoliday": true, "holidayId": row["id"], "reason": row["title"] }),
            ),
            None => Ok(json!({ "success": true, "isHoliday": false })),
        }
    }

    async fn bulk_mark_attendance(
        &self,
        school_id: &str,
        role: &str,
        admin_id: &str,
        date: &str,
        class_name: Option<&str>,
        attendances: Vec<Value>,
    ) -> AppResult<Value> {
        let mut marked = 0;
        let mut failed = 0;
        let mut details = Vec::new();

        for att in &attendances {
            let user_id = match att["id"].as_str().or(att["userId"].as_str()).or(att["user_id"].as_str()) {
                Some(id) => id.to_string(),
                None => { failed += 1; continue; }
            };
            let status = att["status"].as_str().unwrap_or("present");
            let note = att["note"].as_str().unwrap_or("");
            let in_time = att["inTime"].as_str().unwrap_or("");
            let out_time = att["outTime"].as_str();
            let location = att.get("location").cloned();

            let mut data = json!({
                "date": date,
                "status": status,
                "note": note,
                "markedBy": admin_id,
                "inTime": if in_time.is_empty() { chrono::Utc::now().format("%H:%M").to_string() } else { in_time.to_string() },
            });
            if let Some(ot) = out_time { data["outTime"] = json!(ot); }
            if let Some(loc) = location { data["location"] = loc; }

            match self.repos.attendance.mark_attendance(school_id, role, &user_id, date, data).await {
                Ok(_) => {
                    marked += 1;
                    details.push(json!({"userId": user_id, "status": "ok"}));
                }
                Err(_) => {
                    failed += 1;
                    details.push(json!({"userId": user_id, "status": "failed"}));
                }
            }
        }

        Ok(json!({
            "success": true,
            "marked": marked,
            "failed": failed,
            "total": attendances.len(),
            "details": details
        }))
    }

    async fn get_class_attendance(
        &self,
        school_id: &str,
        class_name: &str,
        date: &str,
    ) -> AppResult<Vec<Value>> {
        let records = self.repos.attendance.get_class_attendance(school_id, class_name, date).await?;
        
        Ok(records.into_iter().map(|r| {
            let uid = r.get("user_id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let name = r.get("user_name").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let status = r.get("status").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
            let in_time = r.get("in_time").and_then(|v| v.as_str()).map(|s| s.to_string());
            let out_time = r.get("out_time").and_then(|v| v.as_str()).map(|s| s.to_string());
            let total_time = r.get("total_time").and_then(|v| v.as_str()).map(|s| s.to_string());
            
            json!({
                "userId": uid,
                "studentName": name,
                "status": status,
                "inTime": in_time,
                "outTime": out_time,
                "totalTime": total_time
            })
        }).collect())
    }

    async fn auto_mark_absent_after_cutoff(
        &self,
        school_id: &str,
        cutoff_time: &str,
        date: &str,
    ) -> AppResult<Value> {
        let students = self.repos.attendance.get_unmarked_students_for_date(school_id, date).await?;

        let mut marked = 0;
        for (uid, _) in &students {
            let data = json!({
                "date": date,
                "status": "absent",
                "note": format!("Auto-marked absent after cutoff {}", cutoff_time),
                "markedBy": "system",
                "inTime": ""
            });
            if self.repos.attendance.mark_attendance(school_id, "student", uid, date, data).await.is_ok() {
                marked += 1;
            }
        }

        Ok(json!({"success": true, "auto_marked_absent": marked, "total_unmarked": students.len()}))
    }

    async fn generate_daily_attendance_report(
        &self,
        school_id: &str,
        date: &str,
    ) -> AppResult<Value> {
        let (present, absent, total) = self.repos.attendance.get_daily_attendance_report_stats(school_id, date).await?;
        let pct = if total > 0 { (present as f64 / total as f64) * 100.0 } else { 0.0 };
        Ok(json!({"summary": {"attendance_percentage": pct, "present_count": present, "absent_count": absent, "total_users": total}}))
    }

    async fn get_unmarked_attendance_count(
        &self,
        school_id: &str,
        date: &str,
        role: Option<&str>,
    ) -> AppResult<Value> {
        let r = role.unwrap_or("student");
        let (total, marked) = self.repos.attendance.get_unmarked_count_stats(school_id, date, r).await?;
        Ok(json!({"unmarked_count": total.saturating_sub(marked).max(0), "total": total}))
    }

    async fn create_qr_token(
        &self,
        school_id: &str,
        class_id: Option<&str>,
        admin_id: &str,
        expires_in_minutes: u32,
    ) -> AppResult<Value> {
        let token = uuid::Uuid::new_v4().to_string();
        let expires_at = chrono::Utc::now() + chrono::Duration::minutes(expires_in_minutes as i64);

        self.repos.attendance.create_qr_token(school_id, class_id, &token, expires_at, admin_id).await?;

        Ok(json!({
            "token": token,
            "expires_at": expires_at.to_rfc3339(),
            "class_id": class_id
        }))
    }

    async fn verify_qr_and_mark(
        &self,
        school_id: &str,
        token: &str,
        user_id: &str,
        role: &str,
        admin_id: &str,
        latitude: f64,
        longitude: f64,
        accuracy: Option<f64>,
    ) -> AppResult<Value> {
        let token_ok = self.repos.attendance.verify_and_use_qr_token(school_id, token, user_id).await?;
        if !token_ok {
            return Err(AppError::Validation("Invalid, expired or already used token".to_string()));
        }

        // GPS verification using ConfigRepository
        let config_val = self.repos.config.get(school_id, "school_location").await?;
        let (school_lat, school_lon) = if let Some(val) = config_val {
            let val_str = val.as_str().unwrap_or("{}");
            let data: Value = serde_json::from_str(val_str).unwrap_or(val);
            (data["latitude"].as_f64().unwrap_or(0.0), data["longitude"].as_f64().unwrap_or(0.0))
        } else {
            (0.0, 0.0)
        };

        let max_distance = 500.0;
        let distance = haversine_distance(latitude, longitude, school_lat, school_lon);
        if distance > max_distance {
            return Err(AppError::Validation(format!("Location verification failed. You are {} meters away (max {}).", distance, max_distance)));
        }

        // Mark attendance
        let attendance_data = json!({
            "date": chrono::Utc::now().format("%Y-%m-%d").to_string(),
            "in_time": chrono::Utc::now().format("%H:%M").to_string(),
            "status": "present",
            "reason": "Mobile attendance via QR code",
            "location": {"latitude": latitude, "longitude": longitude, "accuracy": accuracy}
        });

        let data = self.mark_attendance(school_id, role, user_id, admin_id, attendance_data).await?;

        Ok(json!({"data": data, "location_verified": true, "distance_meters": distance}))
    }
}


impl PostgresAttendanceService {
    fn calculate_duration(&self, in_time: &str, out_time: &str) -> String {
        match (
            chrono::DateTime::parse_from_rfc3339(in_time),
            chrono::DateTime::parse_from_rfc3339(out_time),
        ) {
            (Ok(it), Ok(ot)) => {
                let duration = ot.signed_duration_since(it);
                let hours = duration.num_hours();
                let mins = duration.num_minutes() % 60;
                format!("{}h {}m", hours, mins)
            }
            _ => "".to_string(),
        }
    }
}
