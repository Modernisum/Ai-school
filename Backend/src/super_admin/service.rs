use serde_json::{json, Value};
use sqlx::{PgPool, Row};
use std::error::Error;

pub struct AdminService {
    pub pool: PgPool,
}

impl AdminService {
    // ───── Auth ─────

    pub async fn admin_login(
        &self,
        username: &str,
        password: &str,
    ) -> Result<String, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query("SELECT password_hash FROM super_admin WHERE username = $1")
            .bind(username)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(r) = row {
            let hash: String = r.try_get("password_hash")?;
            if bcrypt::verify(password, &hash)? {
                let secret = std::env::var("SUPER_ADMIN_SECRET")
                    .unwrap_or_else(|_| "superadminsecret2024".to_string());
                let ts = chrono::Utc::now().timestamp();
                let raw = format!("{}:{}:{}", username, ts, secret);
                let token = base64::encode(&raw);
                return Ok(token);
            }
        }
        Err("Invalid super admin credentials".into())
    }

    pub fn verify_admin_token(&self, token: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        let secret = std::env::var("SUPER_ADMIN_SECRET")
            .unwrap_or_else(|_| "superadminsecret2024".to_string());
        let decoded = base64::decode(token).map_err(|_| "Invalid token")?;
        let s = String::from_utf8(decoded).map_err(|_| "Invalid token encoding")?;
        let parts: Vec<&str> = s.splitn(3, ':').collect();
        if parts.len() != 3 || parts[2] != secret {
            return Err("Invalid or tampered token".into());
        }
        let ts: i64 = parts[1].parse().map_err(|_| "Invalid token timestamp")?;
        let age = chrono::Utc::now().timestamp() - ts;
        if age > 86400 * 7 {
            return Err("Token expired".into());
        }
        Ok(())
    }

    // ───── School List ─────

    pub async fn list_all_schools(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query(
            r#"
            SELECT
                s.school_id, s.school_name, s.status, s.is_blocked,
                s.session_duration_hours, s.notification, s.created_at,
                s.updated_at, s.data
            FROM schools s
            ORDER BY s.created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let schools: Vec<Value> = rows
            .iter()
            .map(|r| {
                json!({
                    "schoolId":             r.try_get::<String, _>("school_id").unwrap_or_default(),
                    "schoolName":           r.try_get::<String, _>("school_name").unwrap_or_default(),
                    "status":               r.try_get::<String, _>("status").unwrap_or_default(),
                    "isBlocked":            r.try_get::<bool, _>("is_blocked").unwrap_or(false),
                    "sessionDurationHours": r.try_get::<i32, _>("session_duration_hours").unwrap_or(24),
                    "notification":         r.try_get::<Option<Value>, _>("notification").ok().flatten(),
                    "createdAt":            r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                                              .ok().map(|t| t.to_rfc3339()),
                    "updatedAt":            r.try_get::<chrono::DateTime<chrono::Utc>, _>("updated_at")
                                              .ok().map(|t| t.to_rfc3339()),
                    "data":                 r.try_get::<Value, _>("data").unwrap_or(json!({})),
                })
            })
            .collect();

        Ok(json!(schools))
    }

    pub async fn get_school_full(
        &self,
        school_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query(
            "SELECT * FROM schools WHERE school_id = $1"
        )
        .bind(school_id)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            None => Err(format!("School {} not found", school_id).into()),
            Some(r) => Ok(json!({
                "schoolId":             r.try_get::<String, _>("school_id").unwrap_or_default(),
                "schoolName":           r.try_get::<String, _>("school_name").unwrap_or_default(),
                "status":               r.try_get::<String, _>("status").unwrap_or_default(),
                "isBlocked":            r.try_get::<bool, _>("is_blocked").unwrap_or(false),
                "sessionDurationHours": r.try_get::<i32, _>("session_duration_hours").unwrap_or(24),
                "notification":         r.try_get::<Option<Value>, _>("notification").ok().flatten(),
                "createdAt":            r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                                          .ok().map(|t| t.to_rfc3339()),
                "updatedAt":            r.try_get::<chrono::DateTime<chrono::Utc>, _>("updated_at")
                                          .ok().map(|t| t.to_rfc3339()),
                "data":                 r.try_get::<Value, _>("data").unwrap_or(json!({})),
            })),
        }
    }

    // ───── CRUD ─────

    pub async fn update_school(
        &self,
        school_id: &str,
        updates: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query(
            "UPDATE schools SET data = data || $1, updated_at = NOW() WHERE school_id = $2",
        )
        .bind(&updates)
        .bind(school_id)
        .execute(&self.pool)
        .await?;

        if let Some(name) = updates["schoolName"].as_str() {
            sqlx::query(
                "UPDATE schools SET school_name = $1 WHERE school_id = $2",
            )
            .bind(name)
            .bind(school_id)
            .execute(&self.pool)
            .await?;
        }

        if let Some(rate) = updates["perStudentRate"].as_i64() {
            let apply_to_all = updates["applyToAll"].as_bool().unwrap_or(false);
            if apply_to_all {
                sqlx::query(
                    "UPDATE schools SET per_student_rate = $1"
                )
                .bind(rate as i32)
                .execute(&self.pool)
                .await?;
            } else {
                sqlx::query(
                    "UPDATE schools SET per_student_rate = $1 WHERE school_id = $2",
                )
                .bind(rate as i32)
                .bind(school_id)
                .execute(&self.pool)
                .await?;
            }
        }
        Ok(())
    }

    pub async fn delete_school(
        &self,
        school_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let tables = [
            "students", "employees", "classes", "subjects", "fees",
            "student_fees", "fee_templates", "attendance", "spaces", "items",
            "materials", "material_locations", "tokens", "auth_logs", "audit_logs",
            "announcements", "events", "complains", "reminders", "document_box",
            "tasks", "awards", "responsibilities", "salaries", "employee_salaries",
            "employee_payments", "employee_responsibilities", "exams", "topics",
            "chapters", "class_streams", "class_periods", "auth",
        ];
        for table in &tables {
            let _ = sqlx::query(&format!("DELETE FROM {} WHERE school_id = $1", table))
                .bind(school_id)
                .execute(&self.pool)
                .await;
        }
        sqlx::query("DELETE FROM schools WHERE school_id = $1")
            .bind(school_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ───── Status ─────

    pub async fn set_school_status(
        &self,
        school_id: &str,
        status: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let is_blocked = status == "blocked";
        sqlx::query(
            "UPDATE schools SET status=$1, is_blocked=$2, updated_at=NOW() WHERE school_id=$3",
        )
        .bind(status)
        .bind(is_blocked)
        .bind(school_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // ───── Password ─────

    pub async fn change_school_password(
        &self,
        school_id: &str,
        new_password: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let hashed = bcrypt::hash(new_password, 10)?;
        sqlx::query(
            "UPDATE auth SET data = data || $1 WHERE school_id = $2",
        )
        .bind(json!({"password": hashed}))
        .bind(school_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // ───── Sessions ─────

    pub async fn set_session_duration(
        &self,
        school_id: &str,
        hours: i32,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query(
            "UPDATE schools SET session_duration_hours=$1, updated_at=NOW() WHERE school_id=$2",
        )
        .bind(hours)
        .bind(school_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn expire_school_sessions(
        &self,
        school_id: &str,
    ) -> Result<u64, Box<dyn Error + Send + Sync>> {
        let result = sqlx::query("DELETE FROM tokens WHERE school_id = $1")
            .bind(school_id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }

    pub async fn get_school_sessions(
        &self,
        school_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query(
            "SELECT token_id, school_id, user_type, status, created_at, expires_at
             FROM tokens WHERE school_id = $1 ORDER BY created_at DESC",
        )
        .bind(school_id)
        .fetch_all(&self.pool)
        .await?;

        let now = chrono::Utc::now();
        let sessions: Vec<Value> = rows
            .iter()
            .map(|r| {
                let expires = r
                    .try_get::<chrono::DateTime<chrono::Utc>, _>("expires_at")
                    .unwrap_or(now);
                let token_id: String = r.try_get("token_id").unwrap_or_default();
                json!({
                    "tokenId": &token_id[..token_id.len().min(8)],
                    "userType": r.try_get::<String, _>("user_type").unwrap_or_default(),
                    "status": r.try_get::<String, _>("status").unwrap_or_default(),
                    "createdAt": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                                   .ok().map(|t| t.to_rfc3339()),
                    "expiresAt": expires.to_rfc3339(),
                    "isExpired": expires < now,
                })
            })
            .collect();

        Ok(json!(sessions))
    }

    // ───── Notifications ─────

    pub async fn set_notification(
        &self,
        school_id: &str,
        notification: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query(
            "UPDATE schools SET notification=$1, updated_at=NOW() WHERE school_id=$2",
        )
        .bind(notification)
        .bind(school_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn clear_notification(
        &self,
        school_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query(
            "UPDATE schools SET notification=NULL, updated_at=NOW() WHERE school_id=$1",
        )
        .bind(school_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_notification(
        &self,
        school_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query(
            "SELECT notification FROM schools WHERE school_id = $1",
        )
        .bind(school_id)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(r) => Ok(r
                .try_get::<Option<Value>, _>("notification")
                .ok()
                .flatten()
                .unwrap_or(json!(null))),
            None => Err(format!("School {} not found", school_id).into()),
        }
    }

    // ───── Support Requests ─────

    pub async fn create_support_request(
        &self,
        school_name: &str,
        contact_info: &str,
        message: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query(
            "INSERT INTO support_requests (school_name, contact_info, message) VALUES ($1, $2, $3)"
        )
        .bind(school_name)
        .bind(contact_info)
        .bind(message)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn list_support_requests(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query(
            "SELECT id, school_name, contact_info, message, status, created_at 
             FROM support_requests ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        let requests: Vec<Value> = rows.iter().map(|r| {
            json!({
                "id": r.try_get::<i32, _>("id").unwrap_or(0),
                "schoolName": r.try_get::<String, _>("school_name").unwrap_or_default(),
                "contactInfo": r.try_get::<String, _>("contact_info").unwrap_or_default(),
                "message": r.try_get::<String, _>("message").unwrap_or_default(),
                "status": r.try_get::<String, _>("status").unwrap_or_default(),
                "createdAt": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                               .ok().map(|t| t.to_rfc3339()),
            })
        }).collect();

        Ok(json!(requests))
    }

    pub async fn resolve_support_request(&self, id: i32) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("UPDATE support_requests SET status = 'resolved' WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ───── Export / Import ─────

    async fn fetch_table_for_school(
        &self,
        table: &str,
        school_id: &str,
    ) -> Vec<Value> {
        let q = format!(
            "SELECT row_to_json(t) as j FROM {} t WHERE school_id = $1",
            table
        );
        sqlx::query(&q)
            .bind(school_id)
            .fetch_all(&self.pool)
            .await
            .unwrap_or_default()
            .into_iter()
            .filter_map(|r| r.try_get::<Value, _>("j").ok())
            .collect()
    }

    pub async fn export_school_data(
        &self,
        school_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let school = self.get_school_full(school_id).await?;

        Ok(json!({
            "exportedAt":    chrono::Utc::now().to_rfc3339(),
            "exportVersion": "1.0",
            "school":        school,
            "students":      self.fetch_table_for_school("students", school_id).await,
            "employees":     self.fetch_table_for_school("employees", school_id).await,
            "classes":       self.fetch_table_for_school("classes", school_id).await,
            "subjects":      self.fetch_table_for_school("subjects", school_id).await,
            "fees":          self.fetch_table_for_school("fees", school_id).await,
            "attendance":    self.fetch_table_for_school("attendance", school_id).await,
            "announcements": self.fetch_table_for_school("announcements", school_id).await,
            "events":        self.fetch_table_for_school("events", school_id).await,
            "complains":     self.fetch_table_for_school("complains", school_id).await,
            "spaces":        self.fetch_table_for_school("spaces", school_id).await,
        }))
    }

    pub async fn export_all_schools(
        &self,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let ids: Vec<String> = sqlx::query("SELECT school_id FROM schools")
            .fetch_all(&self.pool)
            .await?
            .into_iter()
            .filter_map(|r| r.try_get::<String, _>("school_id").ok())
            .collect();

        let mut exports = Vec::new();
        for id in &ids {
            match self.export_school_data(id).await {
                Ok(data) => exports.push(data),
                Err(e) => exports.push(json!({"schoolId": id, "error": e.to_string()})),
            }
        }
        Ok(json!({
            "exportedAt":    chrono::Utc::now().to_rfc3339(),
            "exportVersion": "1.0",
            "totalSchools":  exports.len(),
            "schools":       exports,
        }))
    }

    pub async fn import_school_data(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        if data["exportVersion"].is_null() {
            return Err("Invalid backup file: missing exportVersion".into());
        }
        let mut imported = 0u64;
        if let Some(students) = data["students"].as_array() {
            for s in students {
                let _ = sqlx::query(
                    "INSERT INTO students (student_id, school_id, data, created_at, updated_at)
                     VALUES ($1, $2, $3, NOW(), NOW())
                     ON CONFLICT (student_id) DO UPDATE SET data = EXCLUDED.data",
                )
                .bind(s["student_id"].as_str().unwrap_or(""))
                .bind(school_id)
                .bind(s)
                .execute(&self.pool)
                .await;
                imported += 1;
            }
        }
        Ok(json!({
            "success": true,
            "imported": imported,
            "message": format!("Imported {} records for school {}", imported, school_id),
        }))
    }

    // ───── Promo Codes ─────

    pub async fn create_promo_code(
        &self,
        code: &str,
        credit_amount: bigdecimal::BigDecimal,
        free_days: i32,
        max_uses: i32,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        sqlx::query(
            "INSERT INTO promo_codes (code, credit_amount, free_days, max_uses, current_uses, created_at)
             VALUES ($1, $2, $3, $4, 0, NOW())"
        )
        .bind(code)
        .bind(credit_amount.to_string().parse::<bigdecimal::BigDecimal>()?) // Ensure type safety
        .bind(free_days)
        .bind(max_uses)
        .execute(&self.pool)
        .await?;

        Ok(json!({
            "success": true,
            "message": format!("Promo code {} created successfully", code)
        }))
    }

    pub async fn list_promo_codes(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let rows = sqlx::query(
            "SELECT id, code, credit_amount, free_days, max_uses, current_uses, expires_at, created_at 
             FROM promo_codes ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        let promos: Vec<Value> = rows.iter().map(|r| {
            let credit: bigdecimal::BigDecimal = r.try_get("credit_amount").unwrap_or_default();
            json!({
                "id": r.try_get::<i32, _>("id").unwrap_or(0),
                "code": r.try_get::<String, _>("code").unwrap_or_default(),
                "creditAmount": credit.to_string(),
                "freeDays": r.try_get::<i32, _>("free_days").unwrap_or(0),
                "maxUses": r.try_get::<i32, _>("max_uses").unwrap_or(1),
                "currentUses": r.try_get::<i32, _>("current_uses").unwrap_or(0),
                "createdAt": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                               .ok().map(|t| t.to_rfc3339()),
            })
        }).collect();

        Ok(json!(promos))
    }
}
