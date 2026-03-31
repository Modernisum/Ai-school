use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use bigdecimal::ToPrimitive;
use serde_json::{json, Value};
use sqlx::{Acquire, Row};
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
        let res = sqlx::query("INSERT INTO complains (school_id, student_id, title, description, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING id")
            .bind(school_id).bind(data["studentId"].as_str()).bind(data["title"].as_str()).bind(data["description"].as_str()).fetch_one(&mut *conn).await?;
        let mut ret = data.clone();
        ret["id"] = json!(res.get::<i32, _>("id"));
        Ok(ret)
    }

    async fn get_complains(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = if let Some(sid) = student_id {
            sqlx::query("SELECT id, title, description, status, created_at FROM complains WHERE school_id = $1 AND student_id = $2")
                .bind(school_id).bind(sid).fetch_all(&mut *conn).await?
        } else {
            sqlx::query("SELECT id, title, description, status, created_at FROM complains WHERE school_id = $1")
                .bind(school_id).fetch_all(&mut *conn).await?
        };
        Ok(rows.into_iter().map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title"), "status": r.get::<String, _>("status")})).collect())
    }

    async fn get_complain(
        &self,
        school_id: &str,
        complain_id: i32,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM complains WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(complain_id)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(row.map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title")})))
    }

    async fn delete_complain(&self, school_id: &str, complain_id: i32) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM complains WHERE school_id = $1 AND id = $2")
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
        let responsibility_id = format!("RESP{}", chrono::Utc::now().timestamp_millis());

        sqlx::query("INSERT INTO responsibilities (responsibility_id, school_id, name, description, per_day_price, time_period, employee_type, monthly_price, data, space_id, student_fee) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10)")
            .bind(&responsibility_id)
            .bind(school_id)
            .bind(data["name"].as_str())
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
        sqlx::query("INSERT INTO employee_responsibilities (school_id, employee_id, responsibility_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING")
            .bind(school_id).bind(employee_id).bind(responsibility_id).execute(&mut *conn).await?;
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
        sqlx::query("DELETE FROM employee_responsibilities WHERE school_id = $1 AND employee_id = $2 AND responsibility_id = $3")
            .bind(school_id).bind(employee_id).bind(responsibility_id).execute(&mut *conn).await?;
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

    async fn sync_subject_roles(&self, school_id: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut tx = conn.begin().await?;

        // 1. Fetch all subjects
        let subjects = sqlx::query("SELECT name, class_name FROM subjects WHERE school_id = $1")
            .bind(school_id)
            .fetch_all(&mut *tx)
            .await?;

        for sub in subjects {
            let subject_name: String = sub.get("name");
            let class_name: String = sub
                .get::<Option<String>, _>("class_name")
                .unwrap_or_else(|| "General".to_string());
            let role_name = format!("{} Teacher - {}", subject_name, class_name);
            let role_id = format!(
                "ROLE_{}_{}",
                subject_name
                    .to_uppercase()
                    .replace(" ", "_")
                    .replace(|c: char| !c.is_alphanumeric() && c != '_', ""),
                class_name
                    .to_uppercase()
                    .replace(" ", "_")
                    .replace(|c: char| !c.is_alphanumeric() && c != '_', "")
            );

            // 3. Create or update responsibility with required_employee count = 0 (in data JSONB)
            sqlx::query(
                "INSERT INTO responsibilities (responsibility_id, school_id, name, description, data) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (responsibility_id) 
                 DO UPDATE SET 
                    name = EXCLUDED.name, 
                    description = EXCLUDED.description,
                    data = COALESCE(responsibilities.data, EXCLUDED.data)"
            )
            .bind(&role_id)
            .bind(school_id)
            .bind(&role_name)
            .bind(format!("Teaching responsibility for {} in {}", subject_name, class_name))
            .bind(json!({"required_employee": 0}))
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(())
    }
}
