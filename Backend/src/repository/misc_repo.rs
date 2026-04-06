use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use bigdecimal::ToPrimitive;
use serde_json::{json, Value};
use sqlx::{Acquire, Row};
use rand::Rng;
use std::sync::Arc;

// --- OCR Repository ---
pub struct PostgresOCRRepository {
    pub client: Arc<DbClient>,
    pub pipeline: Arc<crate::logic::ocr_pipeline::OcrPipeline>,
}

#[async_trait]
impl crate::repository::traits::OCRRepository for PostgresOCRRepository {
    async fn process_ocr(
        &self,
        file_path: &str,
        _engine: &str,
    ) -> Result<Value, crate::repository::traits::AppError> {
        self.pipeline
            .process_image(file_path)
            .await
            .map_err(|e| e.into())
    }

    async fn save_ocr_result(
        &self,
        school_id: &str,
        result_data: Value,
    ) -> Result<(), crate::repository::traits::AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO ocr_logs (school_id, result_data) VALUES ($1, $2)")
            .bind(school_id)
            .bind(result_data)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }
}

// --- Award Repository ---
pub struct PostgresAwardRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::AwardRepository for PostgresAwardRepository {
    async fn add_award(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let res = sqlx::query("INSERT INTO awards (school_id, student_id, title, description, date) VALUES ($1, $2, $3, $4, $5) RETURNING id")
            .bind(school_id)
            .bind(data["studentId"].as_str())
            .bind(data["title"].as_str())
            .bind(data["description"].as_str())
            .bind(data["date"].as_str().map(|d| d.parse::<chrono::NaiveDate>().unwrap_or_else(|_| chrono::Utc::now().date_naive())))
            .fetch_one(&mut *conn).await?;

        let mut ret = data.clone();
        ret["id"] = json!(res.get::<i32, _>("id"));
        Ok(ret)
    }

    async fn get_awards(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = if let Some(sid) = student_id {
            sqlx::query("SELECT id, title, description, date FROM awards WHERE school_id = $1 AND student_id = $2")
                .bind(school_id).bind(sid).fetch_all(&mut *conn).await?
        } else {
            sqlx::query("SELECT id, title, description, date FROM awards WHERE school_id = $1")
                .bind(school_id)
                .fetch_all(&mut *conn)
                .await?
        };
        Ok(rows.into_iter().map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title"), "description": r.get::<Option<String>, _>("description"), "date": r.get::<Option<chrono::NaiveDate>, _>("date")})).collect())
    }

    async fn get_award(&self, school_id: &str, award_id: i32) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM awards WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(award_id)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(row.map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title")})))
    }

    async fn delete_award(&self, school_id: &str, award_id: i32) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM awards WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(award_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }
}

// --- Complain Repository ---
pub struct PostgresComplainRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::ComplainRepository for PostgresComplainRepository {
    async fn add_complain(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        // Generate Unique Complaint ID: CMP-YYYYMMDD-RAND
        let random_part: u32 = rand::thread_rng().gen_range(10000..99999);
        let complaint_id = format!("CMP-{}-{}", chrono::Utc::now().format("%Y%m%d"), random_part);

        let res = sqlx::query(
            "INSERT INTO complaints (
                complaint_id, school_id, sender_id, sender_type, 
                target_id, target_type, subject, description, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING id"
        )
        .bind(&complaint_id)
        .bind(school_id)
        .bind(data["senderId"].as_str())
        .bind(data["senderType"].as_str())
        .bind(data["targetId"].as_str())
        .bind(data["targetType"].as_str())
        .bind(data["subject"].as_str().or(data["title"].as_str())) // Handle both for backward compatibility
        .bind(data["description"].as_str())
        .fetch_one(&mut *conn)
        .await?;

        let mut ret = data.clone();
        ret["id"] = json!(res.get::<i32, _>("id"));
        ret["complaintId"] = json!(complaint_id);
        Ok(ret)
    }

    async fn get_complains(
        &self,
        school_id: &str,
        user_id: Option<&str>,
        user_role: Option<&str>,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let rows = if let Some(uid) = user_id {
            // Filter by sender OR target
            sqlx::query(
                "SELECT id, complaint_id, sender_id, sender_type, target_id, target_type, subject, description, status, created_at 
                 FROM complaints 
                 WHERE school_id = $1 AND (sender_id = $2 OR target_id = $2)"
            )
            .bind(school_id)
            .bind(uid)
            .fetch_all(&mut *conn)
            .await?
        } else {
            // Admin view: all complaints for the school
            sqlx::query(
                "SELECT id, complaint_id, sender_id, sender_type, target_id, target_type, subject, description, status, created_at 
                 FROM complaints 
                 WHERE school_id = $1"
            )
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?
        };

        Ok(rows.into_iter().map(|r| json!({
            "id": r.get::<i32, _>("id"),
            "complaintId": r.get::<Option<String>, _>("complaint_id"),
            "senderId": r.get::<Option<String>, _>("sender_id"),
            "senderType": r.get::<Option<String>, _>("sender_type"),
            "targetId": r.get::<Option<String>, _>("target_id"),
            "targetType": r.get::<Option<String>, _>("target_type"),
            "subject": r.get::<String, _>("subject"),
            "description": r.get::<String, _>("description"),
            "status": r.get::<String, _>("status"),
            "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at")
        })).collect())
    }

    async fn get_complain(
        &self,
        school_id: &str,
        complain_id: i32,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM complaints WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(complain_id)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(row.map(|r| json!({"id": r.get::<i32, _>("id"), "subject": r.get::<String, _>("subject")})))
    }

    async fn delete_complain(&self, school_id: &str, complain_id: i32) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM complaints WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(complain_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }
}

// --- Reminder Repository ---
pub struct PostgresReminderRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::ReminderRepository for PostgresReminderRepository {
    async fn add_reminder(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let res = sqlx::query("INSERT INTO reminders (school_id, title, description, remind_at) VALUES ($1, $2, $3, $4) RETURNING id")
            .bind(school_id).bind(data["title"].as_str()).bind(data["description"].as_str()).bind(data["remindAt"].as_str().map(|d| d.parse::<chrono::NaiveDateTime>().unwrap_or_else(|_| chrono::Utc::now().naive_utc()))).fetch_one(&mut *conn).await?;
        let mut ret = data.clone();
        ret["id"] = json!(res.get::<i32, _>("id"));
        Ok(ret)
    }

    async fn get_reminders(&self, school_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT id, title, remind_at FROM reminders WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;
        Ok(rows
            .into_iter()
            .map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title")}))
            .collect())
    }

    async fn get_reminder(
        &self,
        school_id: &str,
        reminder_id: i32,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM reminders WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(reminder_id)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(row.map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title")})))
    }

    async fn delete_reminder(&self, school_id: &str, reminder_id: i32) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM reminders WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(reminder_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }
}

// --- DocumentBox Repository ---
pub struct PostgresDocumentBoxRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::DocumentBoxRepository for PostgresDocumentBoxRepository {
    async fn add_document(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let res = sqlx::query("INSERT INTO documents (school_id, student_id, title, file_url) VALUES ($1, $2, $3, $4) RETURNING id")
            .bind(school_id).bind(data["studentId"].as_str()).bind(data["title"].as_str()).bind(data["fileUrl"].as_str()).fetch_one(&mut *conn).await?;
        let mut ret = data.clone();
        ret["id"] = json!(res.get::<i32, _>("id"));
        Ok(ret)
    }

    async fn get_documents(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = if let Some(sid) = student_id {
            sqlx::query("SELECT id, title, file_url FROM documents WHERE school_id = $1 AND student_id = $2")
                .bind(school_id).bind(sid).fetch_all(&mut *conn).await?
        } else {
            sqlx::query("SELECT id, title, file_url FROM documents WHERE school_id = $1")
                .bind(school_id)
                .fetch_all(&mut *conn)
                .await?
        };
        Ok(rows.into_iter().map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title"), "fileUrl": r.get::<String, _>("file_url")})).collect())
    }

    async fn get_document(
        &self,
        school_id: &str,
        document_id: i32,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM documents WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(document_id)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(row.map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title")})))
    }

    async fn delete_document(&self, school_id: &str, document_id: i32) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM documents WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(document_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }
}

// --- School Repository ---
pub struct PostgresSchoolRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::SchoolRepository for PostgresSchoolRepository {
    async fn get_school(&self, school_id: &str) -> Result<Option<Value>, AppError> {
        let row = sqlx::query("SELECT * FROM schools WHERE school_id = $1")
            .bind(school_id)
            .fetch_optional(&self.client.pool)
            .await?;
        Ok(row.map(|r| r.get::<Value, _>("data")))
    }
}

// --- Responsibility Repository ---
pub struct PostgresResponsibilityRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::ResponsibilityRepository for PostgresResponsibilityRepository {
    async fn get_responsibilities(&self, school_id: &str, employee_type: Option<String>) -> Result<JsonList, AppError> {
        let mut conn = self
            .client
            .acquire_tenant_connection(school_id)
            .await?;

        let rows = if let Some(ref e_type) = employee_type {
            sqlx::query("SELECT * FROM responsibilities WHERE school_id = $1 AND employee_type = $2")
                .bind(school_id)
                .bind(e_type)
                .fetch_all(&mut *conn)
                .await?
        } else {
            sqlx::query("SELECT * FROM responsibilities WHERE school_id = $1")
                .bind(school_id)
                .fetch_all(&mut *conn)
                .await?
        };

        Ok(rows.into_iter().map(|r| {
             let rid: String = r.try_get("responsibility_id").unwrap_or_default();
             json!({
                "responsibilityId": rid,
                "name": r.try_get::<String, _>("name").unwrap_or_default(),
                "description": r.try_get::<Option<String>, _>("description").ok().flatten(),
                "spaceId": r.try_get::<Option<String>, _>("space_id").ok().flatten(),
                "employeeType": r.try_get::<Option<String>, _>("employee_type").ok().flatten(),
                "monthlyPrice": r.try_get::<bigdecimal::BigDecimal, _>("monthly_price").ok().map(|b| b.to_string()).unwrap_or_else(|| "0.00".to_string()),
                "perDayPrice": r.try_get::<bigdecimal::BigDecimal, _>("per_day_price").ok().map(|b| b.to_string()).unwrap_or_else(|| "0.00".to_string()),
                "studentFee": r.try_get::<bigdecimal::BigDecimal, _>("student_fee").ok().map(|b| b.to_string()).unwrap_or_else(|| "0.00".to_string()),
                "createdAt": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
            })
        }).collect())
    }

    async fn add_responsibility(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let name = data["name"].as_str().ok_or_else(|| AppError::from("Name is required"))?;
        let responsibility_id = name.to_uppercase()
            .chars()
            .filter(|c| c.is_alphanumeric() || c.is_whitespace())
            .collect::<String>()
            .split_whitespace()
            .collect::<Vec<_>>()
            .join("_");

        sqlx::query("INSERT INTO responsibilities (responsibility_id, school_id, name, description, per_day_price, time_period, employee_type, monthly_price, data, space_id, student_fee) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10) ON CONFLICT (responsibility_id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description")
            .bind(&responsibility_id)
            .bind(school_id)
            .bind(name)
            .bind(data["description"].as_str())
            .bind(data["perDayPrice"].as_f64().unwrap_or(0.0))
            .bind(data["timePeriod"].as_i64().unwrap_or(0) as i32)
            .bind(data["employeeType"].as_str())
            .bind(data["monthlyPrice"].as_f64().unwrap_or(0.0))
            .bind(json!({})) // Empty JSON for now
            .bind(data["studentFee"].as_f64().unwrap_or(0.0))
            .execute(&mut *conn).await?;

        let mut ret = data.clone();
        ret["responsibilityId"] = json!(responsibility_id);
        Ok(ret)
    }

    async fn assign_employees_with_spaces(
        &self,
        school_id: &str,
        responsibility_id: &str,
        assignments: Vec<(String, Vec<String>)>,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        for (emp_id, space_ids) in assignments {
            sqlx::query(
                "INSERT INTO employee_responsibilities (school_id, employee_id, responsibility_id, space_ids) 
                 VALUES ($1, $2, $3, $4) 
                 ON CONFLICT (school_id, employee_id, responsibility_id) 
                 DO UPDATE SET space_ids = EXCLUDED.space_ids"
            )
            .bind(school_id)
            .bind(&emp_id)
            .bind(responsibility_id)
            .bind(serde_json::to_value(&space_ids)?)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(())
    }

    async fn assign_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        // 1. Update Join Table
        sqlx::query("INSERT INTO employee_responsibilities (school_id, employee_id, responsibility_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING")
            .bind(school_id).bind(employee_id).bind(responsibility_id).execute(&mut *tx).await?;

        // 2. Sync to Employee Data (ID Integration)
        sqlx::query(
            "UPDATE employees 
             SET data = jsonb_set(
                 COALESCE(data, '{}'::jsonb), 
                 '{responsibilities}', 
                 (SELECT json_agg(responsibility_id) FROM employee_responsibilities WHERE school_id = $1 AND employee_id = $2)::jsonb, 
                 true
             )
             WHERE school_id = $1 AND employee_id = $2"
        )
        .bind(school_id)
        .bind(employee_id)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(())
    }

    async fn bulk_assign_responsibilities(
        &self,
        school_id: &str,
        employee_ids: Vec<String>,
        responsibility_ids: Vec<String>,
        space_ids: Vec<String>,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        for emp_id in &employee_ids {
            for resp_id in &responsibility_ids {
                sqlx::query(
                    "INSERT INTO employee_responsibilities (school_id, employee_id, responsibility_id, space_ids) 
                     VALUES ($1, $2, $3, $4) 
                     ON CONFLICT (school_id, employee_id, responsibility_id) 
                     DO UPDATE SET space_ids = EXCLUDED.space_ids"
                )
                .bind(school_id)
                .bind(emp_id)
                .bind(resp_id)
                .bind(serde_json::to_value(&space_ids)?)
                .execute(&mut *tx)
                .await?;
            }
        }

        tx.commit().await?;
        Ok(())
    }

    async fn remove_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        // 1. Remove from Join Table
        sqlx::query("DELETE FROM employee_responsibilities WHERE school_id = $1 AND employee_id = $2 AND responsibility_id = $3")
            .bind(school_id).bind(employee_id).bind(responsibility_id).execute(&mut *tx).await?;

        // 2. Sync to Employee Data (ID Integration) - Re-calculate list or set to empty if none
        sqlx::query(
            "UPDATE employees 
             SET data = jsonb_set(
                 COALESCE(data, '{}'::jsonb), 
                 '{responsibilities}', 
                 (SELECT COALESCE(json_agg(responsibility_id), '[]'::json) FROM employee_responsibilities WHERE school_id = $1 AND employee_id = $2)::jsonb, 
                 true
             )
             WHERE school_id = $1 AND employee_id = $2"
        )
        .bind(school_id)
        .bind(employee_id)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(())
    }

    async fn get_student_fee_sum_for_space(&self, school_id: &str, space_id: &str) -> Result<f64, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let result: Option<bigdecimal::BigDecimal> = sqlx::query_scalar(
            "SELECT SUM(r.student_fee) FROM responsibilities r 
             JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id 
             WHERE er.school_id = $1 AND er.space_ids @> to_jsonb($2::text)"
        )
        .bind(school_id)
        .bind(space_id)
        .fetch_optional(&mut *conn)
        .await?;

        Ok(result.map(|val| val.to_f64().unwrap_or(0.0)).unwrap_or(0.0))
    }

    async fn get_responsibility_analytics(&self, school_id: &str, responsibility_id: &str) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        // 1. Get employees assigned and aggregate space IDs
        let emp_rows = sqlx::query(
            "SELECT er.employee_id, e.data->>'name' as employee_name, er.space_ids
             FROM employee_responsibilities er 
             LEFT JOIN employees e ON er.employee_id = e.employee_id AND er.school_id = e.school_id
             WHERE er.school_id = $1 AND er.responsibility_id = $2"
        )
        .bind(school_id)
        .bind(responsibility_id)
        .fetch_all(&mut *conn)
        .await?;

        let mut assigned_employees = Vec::new();
        let mut all_space_ids = std::collections::HashSet::new();

        for row in emp_rows {
            let emp_id: String = row.get("employee_id");
            let emp_name: Option<String> = row.get("employee_name");
            
            assigned_employees.push(json!({
                "employeeId": emp_id,
                "name": emp_name.unwrap_or_default()
            }));

            if let Ok(spaces) = row.try_get::<Value, _>("space_ids") {
                if let Some(arr) = spaces.as_array() {
                    for s in arr {
                        if let Some(space_str) = s.as_str() {
                            all_space_ids.insert(space_str.to_string());
                        }
                    }
                }
            }
        }

        let active_spaces: Vec<String> = all_space_ids.into_iter().collect();
        
        // 2. Find students across these active spaces
        let mut total_students = 0;
        let mut classes_distribution = serde_json::Map::new();
        
        if !active_spaces.is_empty() {
            let st_rows = sqlx::query(
                "SELECT class_name, COUNT(*) as student_count 
                 FROM students 
                 WHERE school_id = $1 AND room_number = ANY($2) AND status = 'active'
                 GROUP BY class_name"
            )
            .bind(school_id)
            .bind(&active_spaces)
            .fetch_all(&mut *conn)
            .await?;

            for row in st_rows {
                let cname: String = row.get("class_name");
                let count: i64 = row.get("student_count");
                total_students += count;
                classes_distribution.insert(cname, json!(count));
            }
        }

        // 3. Get responsibility fee to calculate total projected revenue
        let fee: Option<bigdecimal::BigDecimal> = sqlx::query_scalar(
            "SELECT student_fee FROM responsibilities WHERE school_id = $1 AND responsibility_id = $2"
        )
        .bind(school_id)
        .bind(responsibility_id)
        .fetch_optional(&mut *conn)
        .await?;
        
        let fee_val = fee.map(|v| v.to_f64().unwrap_or(0.0)).unwrap_or(0.0);
        let combined_fee_generated = fee_val * (total_students as f64);

        Ok(json!({
            "responsibilityId": responsibility_id,
            "assignedEmployees": assigned_employees,
            "activeSpaces": active_spaces,
            "consumingStudents": {
                "totalCount": total_students,
                "byClass": classes_distribution,
                "combinedFeeGenerated": combined_fee_generated
            }
        }))
    }

    async fn get_student_responsibilities(&self, school_id: &str, student_id: &str) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        // 1. Get student's class details
        let info_opt = sqlx::query(
            "SELECT class_name, section FROM students WHERE school_id = $1 AND student_id = $2"
        )
        .bind(school_id)
        .bind(student_id)
        .fetch_optional(&mut *conn)
        .await?;
        
        let rn = match info_opt {
            Some(row) => {
                let class_name = row.get::<Option<String>, _>("class_name").unwrap_or_default();
                let section = row.get::<Option<String>, _>("section").unwrap_or_default();
                if class_name.is_empty() || section.is_empty() {
                    return Ok(vec![]);
                }
                format!("{}-{}", class_name, section)
            },
            None => return Ok(vec![])
        };

        // 2. Fetch responsibilities where assigned space_ids contain this room
        let rows = sqlx::query(
            "SELECT DISTINCT r.responsibility_id, r.name, r.student_fee 
             FROM responsibilities r 
             JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id AND r.school_id = er.school_id 
             WHERE er.school_id = $1 AND er.space_ids @> to_jsonb($2::text)"
        )
        .bind(school_id)
        .bind(&rn)
        .fetch_all(&mut *conn)
        .await?;

        let items: Vec<Value> = rows.into_iter().map(|row| json!({
            "responsibilityId": row.get::<String, _>("responsibility_id"),
            "name": row.get::<String, _>("name"),
            "studentFee": row.try_get::<bigdecimal::BigDecimal, _>("student_fee")
                .unwrap_or_default()
                .to_f64()
                .unwrap_or(0.0)
        })).collect();

        // 3. Return grouped logically by space
        Ok(vec![json!({
            "spaceName": rn,
            "items": items
        })])
    }


    async fn get_responsibility(&self, school_id: &str, responsibility_id: &str) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM responsibilities WHERE school_id = $1 AND responsibility_id = $2")
            .bind(school_id)
            .bind(responsibility_id)
            .fetch_optional(&mut *conn)
            .await?;

        if let Some(r) = row {
            Ok(Some(json!({
                "responsibilityId": r.get::<String, _>("responsibility_id"),
                "name": r.get::<String, _>("name"),
                "description": r.get::<Option<String>, _>("description"),
                "perDayPrice": r.get::<bigdecimal::BigDecimal, _>("per_day_price").to_f64().unwrap_or(0.0),
                "timePeriod": r.get::<i32, _>("time_period"),
                "employeeType": r.get::<Option<String>, _>("employee_type"),
                "monthlyPrice": r.get::<bigdecimal::BigDecimal, _>("monthly_price").to_f64().unwrap_or(0.0),
                "studentFee": r.get::<bigdecimal::BigDecimal, _>("student_fee").to_f64().unwrap_or(0.0),
                "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at")
            })))
        } else {
            Ok(None)
        }
    }

    async fn update_responsibility(&self, school_id: &str, responsibility_id: &str, data: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        sqlx::query(
            "UPDATE responsibilities SET 
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                per_day_price = COALESCE($3, per_day_price),
                time_period = COALESCE($4, time_period),
                employee_type = COALESCE($5, employee_type),
                monthly_price = COALESCE($6, monthly_price),
                student_fee = COALESCE($7, student_fee)
             WHERE school_id = $8 AND responsibility_id = $9"
        )
        .bind(data["name"].as_str())
        .bind(data["description"].as_str())
        .bind(data["perDayPrice"].as_f64())
        .bind(data["timePeriod"].as_i64().map(|v| v as i32))
        .bind(data["employeeType"].as_str())
        .bind(data["monthlyPrice"].as_f64())
        .bind(data["studentFee"].as_f64())
        .bind(school_id)
        .bind(responsibility_id)
        .execute(&mut *conn)
        .await?;

        Ok(())
    }

    async fn delete_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM responsibilities WHERE school_id = $1 AND responsibility_id = $2")
            .bind(school_id)
            .bind(responsibility_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn get_employee_responsibilities(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT r.*, er.space_ids as assigned_space_ids 
             FROM responsibilities r 
             JOIN employee_responsibilities er ON r.responsibility_id = er.responsibility_id 
             WHERE er.school_id = $1 AND er.employee_id = $2",
        )
        .bind(school_id)
        .bind(employee_id)
        .fetch_all(&mut *conn)
        .await?;

        Ok(rows.into_iter().map(|r| json!({
            "responsibilityId": r.get::<String, _>("responsibility_id"),
            "name": r.get::<String, _>("name"),
            "description": r.get::<Option<String>, _>("description"),
            "spaceId": r.get::<Option<String>, _>("space_id"), // Base spaceId for the role
            "assignedSpaceIds": r.get::<Option<Value>, _>("assigned_space_ids").unwrap_or_else(|| json!([])), // Specific spaces for this assignment
            "employeeType": r.get::<Option<String>, _>("employee_type"),
            "monthlyPrice": r.get::<bigdecimal::BigDecimal, _>("monthly_price").to_f64().unwrap_or(0.0),
            "perDayPrice": r.get::<bigdecimal::BigDecimal, _>("per_day_price").to_f64().unwrap_or(0.0),
            "studentFee": r.get::<bigdecimal::BigDecimal, _>("student_fee").to_f64().unwrap_or(0.0)
        })).collect())
    }

}
