use crate::db::DbClient;
use crate::repository::traits::*;
use crate::logic::time_utils::parse_to_rfc3339;

use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::{Row, Acquire, Column};
use std::sync::Arc;
use chrono::{Datelike};

pub struct PostgresAttendanceRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::AttendanceRepository for PostgresAttendanceRepository {
    async fn mark_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let in_time_str = data["inTime"].as_str().unwrap_or("");
        let in_time_normalized = parse_to_rfc3339(in_time_str, date);
        let in_time = in_time_normalized.and_then(|t| chrono::DateTime::parse_from_rfc3339(&t).ok().map(|dt| dt.with_timezone(&chrono::Utc)));

        let out_time_str = data["outTime"].as_str().unwrap_or("");
        let out_time_normalized = parse_to_rfc3339(out_time_str, date);
        let out_time = out_time_normalized.and_then(|t| chrono::DateTime::parse_from_rfc3339(&t).ok().map(|dt| dt.with_timezone(&chrono::Utc)));

        sqlx::query("INSERT INTO attendance (school_id, role, user_id, date, status, in_time, out_time, total_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (school_id, role, user_id, date) DO UPDATE SET status = EXCLUDED.status, in_time = EXCLUDED.in_time, out_time = EXCLUDED.out_time, total_time = EXCLUDED.total_time")
            .bind(school_id)
            .bind(role)
            .bind(user_id)
            .bind(date.parse::<chrono::NaiveDate>()?)
            .bind(data["status"].as_str())
            .bind(in_time)
            .bind(out_time)
            .bind(data["totalTime"].as_str())
            .execute(&mut *conn).await?;
        Ok(())
    }

    async fn get_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT * FROM attendance WHERE school_id = $1 AND role = $2 AND user_id = $3",
        )
        .bind(school_id)
        .bind(role)
        .bind(user_id)
        .fetch_all(&mut *conn)
        .await?;
        Ok(rows.into_iter().map(|r| map_attendance(&r)).collect())
    }

    async fn delete_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "DELETE FROM attendance WHERE school_id = $1 AND role = $2 AND user_id = $3 AND date = $4",
        )
        .bind(school_id)
        .bind(role)
        .bind(user_id)
        .bind(date.parse::<chrono::NaiveDate>()?)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    async fn add_attendance_history(
        &self,
        school_id: &str,
        _role: &str,
        user_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        crate::repository::base::insert_audit_log(&mut *conn, school_id, "attendance", user_id, action, data).await?;
        Ok(())
    }
    
    // Bulk operations implementation
    async fn bulk_mark_attendance(
        &self,
        school_id: &str,
        role: &str,
        date: &str,
        class_name: Option<&str>,
        attendances: Vec<(String, Value)>,
    ) -> Result<(usize, Vec<(String, String)>), AppError> {
        use serde_json::json;
        
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut successful = 0;
        let mut failures = Vec::new();
        
        // Start transaction for bulk operations
        let mut tx = conn.begin().await?;
        
        for (user_id, data) in attendances {
            // Prepare attendance data
            let mut final_data = data.clone();
            
            // Ensure date is set
            if !final_data.get("date").is_some() {
                final_data["date"] = json!(date);
            }
            
            // Extract status, default to "present"
            let status = final_data.get("status")
                .or_else(|| final_data.get("status"))
                .and_then(|v| v.as_str())
                .unwrap_or("present");
            
            // Extract in_time and out_time safely
            let in_time = final_data.get("inTime").or_else(|| final_data.get("in_time"))
                .and_then(|v| v.as_str())
                .and_then(|t| {
                    if let Some(normalized) = parse_to_rfc3339(t, date) {
                        chrono::DateTime::parse_from_rfc3339(&normalized).ok().map(|dt| dt.with_timezone(&chrono::Utc))
                    } else {
                        None
                    }
                });
            
            let out_time = final_data.get("outTime").or_else(|| final_data.get("out_time"))
                .and_then(|v| v.as_str())
                .and_then(|t| {
                    if let Some(normalized) = parse_to_rfc3339(t, date) {
                        chrono::DateTime::parse_from_rfc3339(&normalized).ok().map(|dt| dt.with_timezone(&chrono::Utc))
                    } else {
                        None
                    }
                });
            
            // Calculate total_time if both in_time and out_time are present
            let total_time = if let (Some(in_t), Some(out_t)) = (&in_time, &out_time) {
                let duration = out_t.signed_duration_since(*in_t);
                let hours = duration.num_hours();
                let mins = duration.num_minutes() % 60;
                Some(format!("{}h {}m", hours, mins))
            } else {
                None
            };
            
            // Insert or update attendance
            match sqlx::query("INSERT INTO attendance (school_id, role, user_id, date, status, in_time, out_time, total_time, class_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (school_id, role, user_id, date) DO UPDATE SET status = EXCLUDED.status, in_time = EXCLUDED.in_time, out_time = EXCLUDED.out_time, total_time = EXCLUDED.total_time, class_name = EXCLUDED.class_name")
                .bind(school_id)
                .bind(role)
                .bind(&user_id)
                .bind(date.parse::<chrono::NaiveDate>()?)
                .bind(status)
                .bind(in_time)
                .bind(out_time)
                .bind(total_time)
                .bind(class_name)
                .execute(&mut *tx).await {
                Ok(_) => {
                    successful += 1;
                }
                Err(e) => {
                    let err_msg: String = e.to_string();
                    failures.push((user_id, err_msg));
                }
            }
        }
        
        // Commit transaction
        tx.commit().await?;
        
        Ok((successful, failures))
    }
    
    async fn get_class_attendance(
        &self,
        school_id: &str,
        class_name: &str,
        date: &str,
    ) -> Result<JsonList, AppError> {
        use serde_json::json;
        
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        // Query attendance for the specific class and date
        let rows = sqlx::query("SELECT a.*, COALESCE(s.name, e.data->>'name') as user_name FROM attendance a LEFT JOIN students s ON a.user_id = s.student_id AND a.school_id = s.school_id LEFT JOIN employees e ON a.user_id = e.employee_id AND a.school_id = e.school_id WHERE a.school_id = $1 AND a.date = $2::date AND (a.class_name = $3 OR s.class_name = $3)")
            .bind(school_id)
            .bind(date.parse::<chrono::NaiveDate>()?)
            .bind(class_name)
            .fetch_all(&mut *conn)
            .await?;
        
        let mut result = Vec::new();
        
        for row in rows {
            let mut record = json!({});
            
            // Get all columns
            let columns = row.columns();
            for col in columns {
                let col_name = col.name();
                let value: Option<String> = sqlx::Row::try_get(&row, col_name).unwrap_or(None);
                if let Some(v) = value {
                    record[col_name] = json!(v);
                }
            }
            
            result.push(record);
        }
        
        Ok(result)
    }

    async fn insert_holiday(
        &self,
        id: &str,
        school_id: &str,
        title: &str,
        description: &str,
        from_date: &str,
        to_date: &str,
        classes: Value,
        exempt_employees: Value,
        exempt_students: Value,
        created_at: &str,
    ) -> Result<(), AppError> {
        sqlx::query("INSERT INTO school_holidays (id, school_id, title, description, from_date, to_date, classes, exempt_employees, exempt_students, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)")
            .bind(id)
            .bind(school_id)
            .bind(title)
            .bind(description)
            .bind(from_date)
            .bind(to_date)
            .bind(classes)
            .bind(exempt_employees)
            .bind(exempt_students)
            .bind(created_at)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn delete_holiday(&self, school_id: &str, holiday_id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM school_holidays WHERE id=$1 AND school_id=$2")
            .bind(holiday_id)
            .bind(school_id)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn get_holiday(&self, school_id: &str, holiday_id: &str) -> Result<Option<Value>, AppError> {
        let r = sqlx::query("SELECT id, title, description, from_date, to_date, classes, exempt_employees, exempt_students, created_at FROM school_holidays WHERE id = $1 AND school_id = $2")
            .bind(holiday_id)
            .bind(school_id)
            .fetch_optional(&self.client.pool)
            .await?;
        if let Some(row) = r {
            Ok(Some(json!({
                "id": row.get::<String, _>("id"),
                "school_id": row.get::<String, _>("school_id"),
                "title": row.get::<String, _>("title"),
                "description": row.get::<String, _>("description"),
                "fromDate": row.get::<String, _>("from_date"),
                "toDate": row.get::<String, _>("to_date"),
                "classes": row.get::<Value, _>("classes"),
                "exemptEmployees": row.get::<Value, _>("exempt_employees"),
                "exemptStudents": row.get::<Value, _>("exempt_students"),
                "createdAt": row.get::<String, _>("created_at"),
            })))
        } else {
            Ok(None)
        }
    }

    async fn list_holidays(&self, school_id: &str, start_date: &str, end_date: &str) -> Result<JsonList, AppError> {
        let rows = sqlx::query("SELECT id, title, description, from_date, to_date, classes FROM school_holidays WHERE school_id = $1 AND (($2::date <= to_date AND $3::date >= from_date)) ORDER BY from_date ASC")
            .bind(school_id)
            .bind(start_date)
            .bind(end_date)
            .fetch_all(&self.client.pool)
            .await?;
        let list = rows.iter().map(|r| json!({
            "id": r.get::<String, _>("id"),
            "title": r.get::<String, _>("title"),
            "description": r.get::<String, _>("description"),
            "fromDate": r.get::<String, _>("from_date"),
            "toDate": r.get::<String, _>("to_date"),
            "classes": r.get::<Value, _>("classes"),
        })).collect();
        Ok(list)
    }

    async fn check_holiday(&self, school_id: &str, date: &str) -> Result<Option<Value>, AppError> {
        let r = sqlx::query("SELECT id, title FROM school_holidays WHERE school_id=$1 AND from_date<=$2::date AND to_date>=$2::date LIMIT 1")
            .bind(school_id)
            .bind(date)
            .fetch_optional(&self.client.pool)
            .await?;
        if let Some(row) = r {
            Ok(Some(json!({
                "id": row.get::<String, _>("id"),
                "title": row.get::<String, _>("title"),
            })))
        } else {
            Ok(None)
        }
    }

    async fn get_attendance_for_date(
        &self,
        school_id: &str,
        date: &str,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT user_id, role, status, reason FROM attendance WHERE school_id = $1 AND date = $2::date",
        )
        .bind(school_id)
        .bind(date.parse::<chrono::NaiveDate>()?)
        .fetch_all(&mut *conn)
        .await?;

        let data = rows
            .iter()
            .map(|r| {
                json!({
                    "user_id": r.get::<String, _>("user_id"),
                    "role": r.get::<String, _>("role"),
                    "status": r.get::<String, _>("status"),
                    "reason": r.get::<Option<String>, _>("reason")
                })
            })
            .collect();
        Ok(data)
    }

    async fn auto_assign_teachers_for_attendance(
        &self,
        school_id: &str,
        date: &str,
        day_of_week: i32,
    ) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        // Find classes that have NO attendance marked today
        let classes = sqlx::query(
            "SELECT DISTINCT c.id, c.name FROM classes c \
             WHERE c.school_id = $1 \
             AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.school_id = c.school_id \
                AND a.date = $2::date AND a.role = 'student' \
                AND a.user_id IN (SELECT student_id FROM students WHERE class_name = c.name AND school_id = c.school_id))"
        )
        .bind(school_id).bind(date.parse::<chrono::NaiveDate>()?)
        .fetch_all(&mut *conn)
        .await?;

        let mut assignments = Vec::new();
        for row in classes {
            let class_id: String = row.get("id");
            let class_name: String = row.get("name");

            // Find first period teacher from timetable
            let teacher = sqlx::query(
                "SELECT ts.teacher_id FROM timetable_slots ts \
                 JOIN timetable_configs tc ON tc.config_id = ts.config_id AND tc.school_id = ts.school_id \
                 WHERE ts.school_id = $1 AND ts.class_id = $2 AND ts.day_of_week = $3 \
                 AND ts.period_number = 1 AND tc.status = 'APPROVED' \
                 AND ts.teacher_id IS NOT NULL AND ts.teacher_id != '' \
                 LIMIT 1"
            )
            .bind(school_id).bind(&class_id).bind(day_of_week)
            .fetch_optional(&mut *conn)
            .await?;

            if let Some(trow) = teacher {
                let teacher_id: String = trow.get("teacher_id");
                assignments.push(json!({
                    "classId": class_id,
                    "className": class_name,
                    "teacherId": teacher_id,
                    "status": "assigned"
                }));
            } else {
                assignments.push(json!({
                    "classId": class_id,
                    "className": class_name,
                    "teacherId": serde_json::Value::Null,
                    "status": "no_teacher_found"
                }));
            }
        }
        Ok(assignments)
    }

    async fn get_attendance_health_metrics(
        &self,
        school_id: &str,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query(
            "SELECT \
                COUNT(*) as total_records, \
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count, \
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count, \
                COUNT(CASE WHEN auto_marked = true THEN 1 END) as auto_marked_count, \
                COUNT(CASE WHEN date = CURRENT_DATE THEN 1 END) as today_count \
             FROM attendance \
             WHERE school_id = $1"
        )
        .bind(school_id)
        .fetch_one(&mut *conn)
        .await?;

        Ok(json!({
            "total_records": row.get::<i64, _>("total_records"),
            "present_count": row.get::<i64, _>("present_count"),
            "absent_count": row.get::<i64, _>("absent_count"),
            "auto_marked_count": row.get::<i64, _>("auto_marked_count"),
            "today_count": row.get::<i64, _>("today_count"),
        }))
    }

    async fn get_student_ids_with_attendance_for_date(
        &self,
        school_id: &str,
        date: &str,
    ) -> Result<Vec<String>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT user_id FROM attendance WHERE school_id = $1 AND role = 'student' AND date = $2::date")
            .bind(school_id)
            .bind(date.parse::<chrono::NaiveDate>()?)
            .fetch_all(&mut *conn)
            .await?;
        
        Ok(rows
            .into_iter()
            .filter_map(|r| r.try_get::<String, _>("user_id").ok())
            .collect())
    }

    async fn get_unmarked_students_for_date(
        &self,
        school_id: &str,
        date: &str,
    ) -> Result<Vec<(String, String)>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT s.student_id, s.name FROM students s \
             WHERE s.school_id = $1 \
             AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.user_id = s.student_id AND a.date = $2::date AND a.school_id = s.school_id)"
        )
        .bind(school_id)
        .bind(date.parse::<chrono::NaiveDate>()?)
        .fetch_all(&mut *conn)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| (r.get::<String, _>("student_id"), r.get::<String, _>("name")))
            .collect())
    }

    async fn get_daily_attendance_report_stats(
        &self,
        school_id: &str,
        date: &str,
    ) -> Result<(i64, i64, i64), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query(
            "SELECT COUNT(*) FILTER (WHERE data->>'status' = 'present') as present, \
             COUNT(*) FILTER (WHERE data->>'status' = 'absent') as absent, \
             COUNT(*) as total FROM attendance \
             WHERE school_id = $1 AND date = $2::date AND role = 'student'"
        )
        .bind(school_id)
        .bind(date.parse::<chrono::NaiveDate>()?)
        .fetch_one(&mut *conn)
        .await?;

        Ok((
            row.get::<i64, _>("present"),
            row.get::<i64, _>("absent"),
            row.get::<i64, _>("total"),
        ))
    }

    async fn get_unmarked_count_stats(
        &self,
        school_id: &str,
        date: &str,
        role: &str,
    ) -> Result<(i64, i64), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let parsed_date = date.parse::<chrono::NaiveDate>()?;
        if role == "student" {
            let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM students WHERE school_id = $1")
                .bind(school_id).fetch_one(&mut *conn).await?;
            let marked: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM attendance WHERE school_id = $1 AND date = $2::date AND role = 'student'")
                .bind(school_id).bind(parsed_date).fetch_one(&mut *conn).await?;
            Ok((total, marked))
        } else {
            let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM employees WHERE school_id = $1 AND employee_type = $2")
                .bind(school_id).bind(role).fetch_one(&mut *conn).await?;
            let marked: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM attendance WHERE school_id = $1 AND date = $2::date AND role = $3")
                .bind(school_id).bind(parsed_date).bind(role).fetch_one(&mut *conn).await?;
            Ok((total, marked))
        }
    }

    async fn create_qr_token(
        &self,
        school_id: &str,
        class_id: Option<&str>,
        token: &str,
        expires_at: chrono::DateTime<chrono::Utc>,
        created_by: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "INSERT INTO attendance_qr_tokens (school_id, class_id, token, expires_at, created_by) VALUES ($1, $2, $3, $4, $5)"
        )
        .bind(school_id).bind(class_id).bind(token).bind(expires_at).bind(created_by)
        .execute(&mut *conn).await?;
        Ok(())
    }

    async fn verify_and_use_qr_token(
        &self,
        school_id: &str,
        token: &str,
        used_by: &str,
    ) -> Result<bool, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let token_valid = sqlx::query(
            "SELECT id FROM attendance_qr_tokens WHERE token = $1 AND school_id = $2 AND is_used = FALSE AND expires_at > NOW()"
        )
        .bind(token).bind(school_id)
        .fetch_optional(&mut *conn).await?;

        if token_valid.is_none() {
            return Ok(false);
        }

        sqlx::query("UPDATE attendance_qr_tokens SET is_used = TRUE, used_by = $1, used_at = NOW() WHERE token = $2")
            .bind(used_by).bind(token)
            .execute(&mut *conn).await?;

        Ok(true)
    }
}

fn map_attendance(row: &sqlx::postgres::PgRow) -> Value {
    let date = row.get::<chrono::NaiveDate, _>("date");
    json!({
        "date": date.to_string(),
        "status": row.get::<String, _>("status"),
        "month": date.month(),
        "year": date.year(),
        "inTime": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("in_time"),
        "outTime": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("out_time"),
        "totalTime": row.get::<Option<String>, _>("total_time")
    })
}
