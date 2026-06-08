use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresAnalyticsRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::AnalyticsRepository for PostgresAnalyticsRepository {
    async fn get_school_stats(&self, school_id: &str) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let students_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM students WHERE school_id = $1")
                .bind(school_id)
                .fetch_one(&mut *conn)
                .await?;

        let employees_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM employees WHERE school_id = $1")
                .bind(school_id)
                .fetch_one(&mut *conn)
                .await?;

        let classes_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM classes WHERE school_id = $1")
                .bind(school_id)
                .fetch_one(&mut *conn)
                .await?;

        Ok(json!({
            "totalStudents": students_count,
            "totalEmployees": employees_count,
            "totalClasses": classes_count
        }))
    }

    async fn get_attendance_summary(&self, school_id: &str, date: &str) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let target_date = date.parse::<chrono::NaiveDate>()?;

        let rows = sqlx::query(
            "SELECT status, role, COUNT(*) as count FROM attendance WHERE school_id = $1 AND date = $2 GROUP BY status, role"
        )
        .bind(school_id).bind(target_date).fetch_all(&mut *conn).await?;

        let mut summary = json!({
            "student": {"present": 0, "absent": 0, "leave": 0, "holiday": 0},
            "employee": {"present": 0, "absent": 0, "leave": 0, "holiday": 0}
        });

        for row in rows {
            let status = row.get::<String, _>("status").to_lowercase();
            let role = row.get::<String, _>("role").to_lowercase();
            let count = row.get::<i64, _>("count");

            if let Some(role_map) = summary.get_mut(&role) {
                if let Some(target) = role_map.get_mut(&status) {
                    *target = json!(count);
                }
            }
        }

        Ok(summary)
    }

    async fn get_pending_fees_by_period(
        &self,
        school_id: &str,
        _months_overdue: i32,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT s.name, s.student_id, s.class_name, s.section, sf.pending_amount::FLOAT as pending_amount \
             FROM students s \
             JOIN student_fees sf ON s.student_id = sf.student_id AND s.school_id = sf.school_id \
             WHERE s.school_id = $1 AND sf.pending_amount > 0"
        )
        .bind(school_id).fetch_all(&mut *conn).await?;

        Ok(rows
            .into_iter()
            .map(|r| {
                json!({
                    "studentName": r.get::<String, _>("name"),
                    "studentId": r.get::<String, _>("student_id"),
                    "className": r.get::<String, _>("class_name"),
                    "section": r.get::<Option<String>, _>("section"),
                    "pendingAmount": r.get::<f64, _>("pending_amount")
                })
            })
            .collect())
    }

    async fn get_fee_summary(&self, school_id: &str) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query(
            "SELECT SUM(total_fees)::FLOAT as total, SUM(pending_amount)::FLOAT as pending, SUM(discount)::FLOAT as discount FROM student_fees WHERE school_id = $1"
        )
        .bind(school_id).fetch_one(&mut *conn).await?;

        let total = row.get::<Option<f64>, _>("total").unwrap_or(0.0);
        let pending = row.get::<Option<f64>, _>("pending").unwrap_or(0.0);
        let discount = row.get::<Option<f64>, _>("discount").unwrap_or(0.0);
        let collected = total - pending - discount;

        Ok(json!({
            "totalRevenueExpected": total,
            "totalCollected": collected,
            "totalPending": pending,
            "totalDiscount": discount
        }))
    }

    async fn query_staff_analytics(&self, school_id: &str) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT type as emp_type, status, COUNT(*) as count FROM employees WHERE school_id = $1 GROUP BY type, status"
        )
        .bind(school_id).fetch_all(&mut *conn).await?;

        Ok(json!(rows
            .into_iter()
            .map(|r| json!({
                "type": r.get::<String, _>("emp_type"),
                "status": r.get::<String, _>("status"),
                "count": r.get::<i64, _>("count")
            }))
            .collect::<Vec<Value>>()))
    }

    async fn get_student_attendance_report(
        &self,
        school_id: &str,
        student_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let start = chrono::NaiveDate::parse_from_str(start_date, "%Y-%m-%d")?;
        let end = chrono::NaiveDate::parse_from_str(end_date, "%Y-%m-%d")?;

        let rows = sqlx::query(
            "SELECT date, status, in_time, out_time, total_time, class_name
             FROM attendance WHERE school_id = $1 AND user_id = $2 AND role = 'student' AND date >= $3 AND date <= $4
             ORDER BY date DESC"
        )
        .bind(school_id).bind(student_id).bind(start).bind(end)
        .fetch_all(&mut *conn).await?;

        let mut present = 0i64;
        let mut absent = 0i64;
        let mut leave = 0i64;
        let records: Vec<Value> = rows.iter().map(|r| {
            let status: String = r.get("status");
            match status.to_lowercase().as_str() {
                "present" => present += 1,
                "absent" => absent += 1,
                "leave" => leave += 1,
                _ => {}
            }
            json!({
                "date": r.get::<chrono::NaiveDate, _>("date").to_string(),
                "status": status,
                "class_name": r.get::<Option<String>, _>("class_name"),
                "in_time": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("in_time").map(|dt| dt.to_rfc3339()),
                "out_time": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("out_time").map(|dt| dt.to_rfc3339()),
                "total_time": r.get::<Option<String>, _>("total_time")
            })
        }).collect();

        let total = records.len();
        let pct = if total > 0 { (present as f64 / total as f64 * 100.0).round() as i64 } else { 0 };

        let student_info = sqlx::query("SELECT name, class_name, section FROM students WHERE school_id = $1 AND student_id = $2")
            .bind(school_id).bind(student_id).fetch_optional(&mut *conn).await?;

        Ok(json!({
            "student_id": student_id,
            "student_info": student_info.map(|r| json!({"name": r.get::<Option<String>, _>("name"), "class": r.get::<Option<String>, _>("class_name"), "section": r.get::<Option<String>, _>("section")})),
            "period": {"start_date": start_date, "end_date": end_date},
            "summary": {"total_days": total, "present": present, "absent": absent, "leave": leave, "attendance_percentage": pct},
            "attendance_records": records
        }))
    }

    async fn get_class_attendance_report(
        &self,
        school_id: &str,
        class_name: &str,
        start_date: &str,
        end_date: &str,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let start = chrono::NaiveDate::parse_from_str(start_date, "%Y-%m-%d")?;
        let end = chrono::NaiveDate::parse_from_str(end_date, "%Y-%m-%d")?;

        let rows = sqlx::query(
            "SELECT a.user_id as student_id, s.name as student_name,
                    COUNT(*) as total_days,
                    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
                    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
                    COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_days
             FROM attendance a
             LEFT JOIN students s ON a.school_id = s.school_id AND a.user_id = s.student_id
             WHERE a.school_id = $1 AND (a.class_name = $2 OR s.class_name = $2) AND a.date >= $3 AND a.date <= $4 AND a.role = 'student'
             GROUP BY a.user_id, s.name ORDER BY s.name"
        )
        .bind(school_id).bind(class_name).bind(start).bind(end)
        .fetch_all(&mut *conn).await?;

        let mut total_present = 0i64;
        let mut total_absent = 0i64;
        let mut total_leave = 0i64;
        let students: Vec<Value> = rows.iter().map(|r| {
            let p: i64 = r.get("present_days");
            let a: i64 = r.get("absent_days");
            let l: i64 = r.get("leave_days");
            let t: i64 = r.get("total_days");
            total_present += p; total_absent += a; total_leave += l;
            let pct = if t > 0 { (p as f64 / t as f64 * 100.0).round() as i64 } else { 0 };
            json!({"student_id": r.get::<String, _>("student_id"), "student_name": r.get::<Option<String>, _>("student_name"), "total_days": t, "present_days": p, "absent_days": a, "leave_days": l, "attendance_percentage": pct})
        }).collect();

        let total_all = total_present + total_absent + total_leave;
        let overall = if total_all > 0 { (total_present as f64 / total_all as f64 * 100.0).round() as i64 } else { 0 };

        Ok(json!({
            "class_name": class_name, "period": {"start_date": start_date, "end_date": end_date},
            "summary": {"total_students": students.len(), "total_days": total_all, "total_present": total_present, "total_absent": total_absent, "total_leave": total_leave, "overall_percentage": overall},
            "students": students
        }))
    }

    async fn get_filtered_attendance(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
        user_type: Option<&str>,
        class_name: Option<&str>,
        user_ids: Option<&str>,
    ) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut sql = String::from(
            "SELECT a.user_id, a.role, a.date, a.status, a.in_time, a.out_time, a.class_name, a.reason,
                    COALESCE(s.name, e.data->>'name') as name,
                    COALESCE(s.profile_image_url, e.profile_image_url) as image_url
             FROM attendance a
             LEFT JOIN students s ON a.user_id = s.student_id AND a.school_id = s.school_id
             LEFT JOIN employees e ON a.user_id = e.employee_id AND a.school_id = e.school_id
             WHERE a.school_id = $1 AND a.date >= $2::date AND a.date <= $3::date"
        );
        let mut params: Vec<String> = vec![school_id.to_string(), start_date.to_string(), end_date.to_string()];
        let mut idx = 4;

        if let Some(ut) = user_type {
            sql.push_str(&format!(" AND a.role = ${}", idx));
            params.push(ut.to_string());
            idx += 1;
        }
        if let Some(cn) = class_name {
            sql.push_str(&format!(" AND a.class_name = ${}", idx));
            params.push(cn.to_string());
            idx += 1;
        }
        if let Some(uids) = user_ids {
            sql.push_str(&format!(" AND a.user_id = ANY(${}::text[])", idx));
            params.push(uids.to_string());
        }

        let mut q = sqlx::query(&sql);
        for p in &params { q = q.bind(p); }
        let rows = q.fetch_all(&mut *conn).await?;

        Ok(rows.iter().map(|r| {
            json!({
                "user_id": r.get::<String, _>("user_id"),
                "user_type": r.get::<String, _>("role"),
                "name": r.get::<Option<String>, _>("name"),
                "image_url": r.get::<Option<String>, _>("image_url"),
                "date": r.get::<chrono::NaiveDate, _>("date").to_string(),
                "status": r.get::<String, _>("status"),
                "in_time": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("in_time").map(|dt| dt.to_rfc3339()),
                "out_time": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("out_time").map(|dt| dt.to_rfc3339()),
                "class_name": r.get::<Option<String>, _>("class_name"),
                "reason": r.get::<Option<String>, _>("reason")
            })
        }).collect())
    }
}
