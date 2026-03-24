use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use chrono::{Datelike, Local};
use serde_json::{json, Value};
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
        let date = data["date"]
            .as_str()
            .unwrap_or(&Local::now().format("%Y-%m-%d").to_string())
            .to_string();

        let mut final_data = data.clone();

        if let (Some(in_t), Some(out_t)) = (data["inTime"].as_str(), data["outTime"].as_str()) {
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

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "ATTENDANCE",
            user_id,
            "MARK",
            final_data
        ).await;

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

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "ATTENDANCE_HOLIDAY",
            user_id,
            "MARK_HOLIDAY",
            holiday_data.clone()
        ).await;

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
        let out_time = data["outTime"]
            .as_str()
            .ok_or_else(|| AppError::Validation("outTime is required".to_string()))?
            .to_string();

        let existing_list = self.repos.attendance.get_attendance(school_id, role, user_id).await?;
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

        let delta = self.calculate_delta(&existing, &updated);
        if !delta.as_object().map(|o| o.is_empty()).unwrap_or(true) {
            let _ = self.repos.audit.log_action(
                school_id,
                admin_id,
                "ATTENDANCE",
                user_id,
                "UPDATE",
                delta
            ).await;
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
        let existing_list = self.repos.attendance.get_attendance(school_id, role, user_id).await?;
        let existing = existing_list.iter().find(|a| a["date"].as_str() == Some(date)).cloned();

        self.repos
            .attendance
            .delete_attendance(school_id, role, user_id, date)
            .await?;
        
        if let Some(e) = existing {
            let _ = self.repos.audit.log_action(
                school_id,
                admin_id,
                "ATTENDANCE",
                user_id,
                "DELETE",
                e
            ).await;
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
        Ok(self.repos
            .attendance
            .get_attendance(school_id, role, user_id)
            .await?)
    }

    async fn list_attendance_by_date(&self, school_id: &str, date: &str) -> AppResult<Vec<String>> {
        let rows = sqlx::query("SELECT user_id FROM attendance WHERE school_id = $1 AND role = 'student' AND date = $2")
            .bind(school_id)
            .bind(date)
            .fetch_all(&self.repos.db_client.pool)
            .await?;
        
        Ok(rows.into_iter().filter_map(|r| sqlx::Row::try_get::<String, _>(&r, "user_id").ok()).collect())
    }

    async fn list_school_holidays(&self, school_id: &str, month: Option<i32>, year: Option<i32>) -> AppResult<Vec<Value>> {
        let now = Local::now();
        let query_year = year.unwrap_or(now.year());
        let (start_date, end_date) = if let Some(m) = month {
            (format!("{}-{:02}-01", query_year, m), format!("{}-{:02}-31", query_year, m))
        } else {
            let academic_start = if now.month() < 4 { query_year - 1 } else { query_year };
            (format!("{}-04-01", academic_start), format!("{}-03-31", academic_start + 1))
        };

        let rows = sqlx::query("SELECT id, title, description, from_date, to_date, classes FROM school_holidays WHERE school_id = $1 AND (($2 <= to_date AND $3 >= from_date)) ORDER BY from_date ASC")
            .bind(school_id).bind(&start_date).bind(&end_date)
            .fetch_all(&self.repos.db_client.pool).await?;

        let mut data = Vec::new();
        for r in rows {
            let id: String = sqlx::Row::get(&r, "id");
            let title: String = sqlx::Row::get(&r, "title");
            let desc: String = sqlx::Row::get(&r, "description");
            let from_str: String = sqlx::Row::get(&r, "from_date");
            let to_str: String = sqlx::Row::get(&r, "to_date");
            let classes: Value = sqlx::Row::get(&r, "classes");

            if let (Ok(start), Ok(end)) = (chrono::NaiveDate::parse_from_str(&from_str, "%Y-%m-%d"), chrono::NaiveDate::parse_from_str(&to_str, "%Y-%m-%d")) {
                let mut curr = start;
                while curr <= end {
                    let curr_str = curr.format("%Y-%m-%d").to_string();
                    if curr_str >= start_date && curr_str <= end_date {
                        data.push(json!({ "id": id, "date": curr_str, "title": title, "description": desc, "classes": classes, "fullRange": { "from": from_str, "to": to_str } }));
                    }
                    curr = curr.succ_opt().unwrap_or(curr);
                    if curr == start { break; } // safety
                }
            }
        }
        data.sort_by(|a, b| a["date"].as_str().cmp(&b["date"].as_str()));
        Ok(data)
    }

    async fn get_holiday_detail(&self, school_id: &str, holiday_id: &str) -> AppResult<Value> {
        let r = sqlx::query("SELECT id, title, description, from_date, to_date, classes, exempt_employees, exempt_students, created_at FROM school_holidays WHERE id = $1 AND school_id = $2")
            .bind(holiday_id).bind(school_id).fetch_optional(&self.repos.db_client.pool).await?
            .ok_or_else(|| AppError::NotFound("Holiday not found".to_string()))?;

        Ok(json!({
            "id": sqlx::Row::get::<String, _>(&r, "id"),
            "title": sqlx::Row::get::<String, _>(&r, "title"),
            "description": sqlx::Row::get::<String, _>(&r, "description"),
            "fromDate": sqlx::Row::get::<String, _>(&r, "from_date"),
            "toDate": sqlx::Row::get::<String, _>(&r, "to_date"),
            "classes": sqlx::Row::get::<Value, _>(&r, "classes"),
            "exemptEmployees": sqlx::Row::get::<Value, _>(&r, "exempt_employees"),
            "exemptStudents": sqlx::Row::get::<Value, _>(&r, "exempt_students"),
            "createdAt": sqlx::Row::get::<String, _>(&r, "created_at"),
        }))
    }

    async fn create_school_holiday(&self, school_id: &str, data: Value) -> AppResult<Value> {
        let from_date = data["fromDate"].as_str().ok_or_else(|| AppError::Validation("fromDate required".into()))?.to_string();
        let id = uuid::Uuid::new_v4().to_string();
        let title = data["title"].as_str().unwrap_or("Holiday").to_string();
        let desc = data["description"].as_str().unwrap_or("").to_string();
        let to_date = data["toDate"].as_str().unwrap_or(&from_date).to_string();
        let classes = data["classes"].clone();
        let ex_emp = data["exemptEmployees"].clone();
        let ex_std = data["exemptStudents"].clone();
        let now = Local::now().format("%Y-%m-%d").to_string();

        sqlx::query("INSERT INTO school_holidays (id, school_id, title, description, from_date, to_date, classes, exempt_employees, exempt_students, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)")
            .bind(&id).bind(school_id).bind(&title).bind(&desc).bind(&from_date).bind(&to_date).bind(&classes).bind(&ex_emp).bind(&ex_std).bind(&now)
            .execute(&self.repos.db_client.pool).await?;

        Ok(json!({ "id": id, "title": title, "fromDate": from_date, "toDate": to_date }))
    }

    async fn delete_school_holiday(&self, school_id: &str, holiday_id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM school_holidays WHERE id=$1 AND school_id=$2").bind(holiday_id).bind(school_id).execute(&self.repos.db_client.pool).await?;
        Ok(())
    }

    async fn check_school_holiday(&self, school_id: &str, date: &str) -> AppResult<Value> {
        let r = sqlx::query("SELECT id, title FROM school_holidays WHERE school_id=$1 AND from_date<=$2 AND to_date>=$2 LIMIT 1")
            .bind(school_id).bind(date).fetch_optional(&self.repos.db_client.pool).await?;

        match r {
            Some(row) => Ok(json!({ "success": true, "isHoliday": true, "holidayId": sqlx::Row::get::<String, _>(&row, "id"), "reason": sqlx::Row::get::<String, _>(&row, "title") })),
            None => Ok(json!({ "success": true, "isHoliday": false }))
        }
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

    fn calculate_delta(&self, old: &Value, new: &Value) -> Value {
        let mut delta = json!({});
        if let (Some(old_obj), Some(new_obj)) = (old.as_object(), new.as_object()) {
            for (key, new_val) in new_obj {
                if key == "updatedAt" || key == "updated_at" || key == "createdAt" || key == "created_at" {
                    continue;
                }
                if let Some(old_val) = old_obj.get(key) {
                    if old_val != new_val {
                        delta[key] = json!({
                            "old": old_val.clone(),
                            "new": new_val.clone()
                        });
                    }
                } else {
                    delta[key] = json!({
                        "old": null,
                        "new": new_val.clone()
                    });
                }
            }
        }
        delta
    }
}
