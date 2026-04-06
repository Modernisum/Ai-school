use sqlx::{Row, Connection};
use std::error::Error;
use futures_util::TryStreamExt;
use serde_json::{json, Value};
// use std::str::FromStr;

pub struct AdminService {
    pub db: std::sync::Arc<crate::db::DbClient>,
}

impl AdminService {
    // ───── Auth ─────

    pub async fn admin_login(
        &self,
        username: &str,
        password: &str,
    ) -> Result<String, Box<dyn Error + Send + Sync>> {
        println!("[DEBUG] Login attempt for username: '{}'", username);
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let row = sqlx::query("SELECT password_hash FROM super_admin WHERE username = $1")
            .bind(username)
            .fetch_optional(&mut *conn)
            .await?;

        if let Some(r) = row {
            let hash: String = r.try_get("password_hash")?;
            println!("[DEBUG] Found hash for user: '{}'", hash);
            match bcrypt::verify(password, &hash) {
                Ok(true) => {
                    println!("[DEBUG] Password verified SUCCESSFULLY");
                    let secret = std::env::var("SUPER_ADMIN_SECRET")
                    .unwrap_or_else(|_| "superadminsecret2024".to_string());
                let ts = chrono::Utc::now().timestamp();
                let raw = format!("{}:{}:{}", username, ts, secret);
                use base64::{engine::general_purpose, Engine as _};
                let token = general_purpose::STANDARD.encode(raw.as_bytes());
                return Ok(token);
                },
                Ok(false) => println!("[DEBUG] Password verification FAILED (mismatch)"),
                Err(e) => println!("[DEBUG] bcrypt error: {:?}", e),
            }
        } else {
            println!("[DEBUG] User '{}' NOT FOUND in super_admin table", username);
        }
        Err("Invalid super admin credentials".into())
    }

    pub async fn update_admin_credentials(
        &self,
        current_username: &str,
        current_password: &str,
        new_username: &str,
        new_password: &str,
        profile_image_url: Option<String>,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let mut tx = conn.begin().await?;

        // 1. Verify access via current password
        let mut authorized = false;
        let mut old_photo: Option<String> = None;

        let row = sqlx::query("SELECT password_hash, profile_image_url FROM super_admin WHERE username = $1")
            .bind(current_username)
            .fetch_optional(&mut *tx)
            .await?;

        if let Some(r) = row {
            let hash: String = r.try_get("password_hash")?;
            old_photo = r.try_get("profile_image_url").ok();
            match bcrypt::verify(current_password, &hash) {
                Ok(true) => { authorized = true; },
                _ => {}
            }
        }

        if !authorized {
            return Err("Authorization failed: Invalid current credentials".into());
        }

        // 2. Perform Update
        let hashed_pwd = bcrypt::hash(new_password, 10)?;
        
        if current_username != new_username {
            sqlx::query("DELETE FROM super_admin WHERE username = $1")
                .bind(current_username)
                .execute(&mut *tx)
                .await?;
        }

        sqlx::query(
            "INSERT INTO super_admin (username, password_hash, profile_image_url) VALUES ($1, $2, $3)
             ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, profile_image_url = EXCLUDED.profile_image_url"
        )
        .bind(new_username)
        .bind(hashed_pwd)
        .bind(&profile_image_url)
        .execute(&mut *tx)
        .await?;

        // 3. Handle photo transitions
        if let Some(url) = &profile_image_url {
            sqlx::query("UPDATE app_files SET is_permanent = TRUE WHERE public_url = $1")
                .bind(url)
                .execute(&mut *tx)
                .await?;
        }

        if let Some(old_url) = old_photo {
            if let Some(new_url) = &profile_image_url {
                if old_url != *new_url {
                    sqlx::query("UPDATE app_files SET is_permanent = FALSE WHERE public_url = $1")
                        .bind(old_url)
                        .execute(&mut *tx)
                        .await?;
                }
            } else {
                 sqlx::query("UPDATE app_files SET is_permanent = FALSE WHERE public_url = $1")
                    .bind(old_url)
                    .execute(&mut *tx)
                    .await?;
            }
        }

        tx.commit().await?;
        Ok(())
    }

    pub async fn get_admin_profile(
        &self,
        username: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let row = sqlx::query("SELECT username, profile_image_url FROM super_admin WHERE username = $1")
            .bind(username)
            .fetch_optional(&mut *conn)
            .await?;

        match row {
            Some(r) => Ok(json!({
                "username": r.get::<String, _>("username"),
                "profileImageUrl": r.get::<Option<String>, _>("profile_image_url")
            })),
            None => Err("Admin not found".into()),
        }
    }

    pub fn verify_admin_token(&self, token: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        let secret = std::env::var("SUPER_ADMIN_SECRET")
            .unwrap_or_else(|_| "superadminsecret2024".to_string());
        use base64::{engine::general_purpose, Engine as _};
        let decoded = general_purpose::STANDARD
            .decode(token)
            .map_err(|_| "Invalid token")?;
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

    pub async fn get_system_config(&self, key: &str) -> Result<String, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let row = sqlx::query("SELECT config_value FROM system_config WHERE config_key = $1")
            .bind(key)
            .fetch_optional(&mut *conn)
            .await?;

        match row {
            Some(r) => Ok(r.get::<String, _>("config_value")),
            None => Err(format!("Config key '{}' not found", key).into()),
        }
    }

    pub async fn update_system_config(&self, key: &str, value: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        sqlx::query(
            "INSERT INTO system_config (config_key, config_value, updated_at) 
             VALUES ($1, $2, NOW()) 
             ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = EXCLUDED.updated_at"
        )
        .bind(key)
        .bind(value)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    // ───── School List ─────

    pub async fn list_all_schools(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let rows = sqlx::query(
            r#"
            SELECT
                s.school_id, s.school_name, s.status, s.is_blocked,
                s.session_duration_hours, s.notification, s.created_at,
                s.updated_at, s.data, s.per_student_rate, s.wallet_balance,
                s.billing_status, s.last_billing_date, s.school_logo_url,
                (SELECT COUNT(*) FROM students st WHERE st.school_id = s.school_id AND st.status = 'active') as active_student_count
            FROM schools s
            ORDER BY s.created_at DESC
            "#,
        )
        .fetch_all(&mut *conn)
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
                    "perStudentRate":       r.try_get::<bigdecimal::BigDecimal, _>("per_student_rate").ok().map(|b| b.to_string()).unwrap_or_else(|| "1.00".to_string()),
                    "walletBalance":        r.try_get::<bigdecimal::BigDecimal, _>("wallet_balance").ok().map(|b| b.to_string()).unwrap_or_else(|| "0.00".to_string()),
                    "billingStatus":        r.try_get::<String, _>("billing_status").unwrap_or_else(|_| "active".to_string()),
                    "lastBillingDate":      r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_billing_date").ok().flatten().map(|t| t.to_rfc3339()),
                    "activeStudentCount":   r.try_get::<i64, _>("active_student_count").unwrap_or(0),
                    "schoolLogoUrl":        r.try_get::<Option<String>, _>("school_logo_url").unwrap_or_default(),
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
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let row = sqlx::query(
            r#"
            SELECT s.*, 
                (SELECT COUNT(*) FROM students st WHERE st.school_id = s.school_id AND st.status = 'active') as active_student_count
            FROM schools s 
            WHERE s.school_id = $1
            "#
        )
            .bind(school_id)
            .fetch_optional(&mut *conn)
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
                "perStudentRate":       r.try_get::<bigdecimal::BigDecimal, _>("per_student_rate").ok().map(|b| b.to_string()).unwrap_or_else(|| "1.00".to_string()),
                "walletBalance":        r.try_get::<bigdecimal::BigDecimal, _>("wallet_balance").ok().map(|b| b.to_string()).unwrap_or_else(|| "0.00".to_string()),
                "billingStatus":        r.try_get::<String, _>("billing_status").unwrap_or_else(|_| "active".to_string()),
                "lastBillingDate":      r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_billing_date").ok().flatten().map(|t| t.to_rfc3339()),
                "activeStudentCount":   r.try_get::<i64, _>("active_student_count").unwrap_or(0),
                "activePromoId":        r.try_get::<Option<i32>, _>("active_promo_id").ok().flatten(),
                "promoExpiresAt":       r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("promo_expires_at").ok().flatten().map(|t| t.to_rfc3339()),
                "schoolLogoUrl":        r.try_get::<Option<String>, _>("school_logo_url").unwrap_or_default(),
                "data":                 r.try_get::<Value, _>("data").unwrap_or(json!({})),
            })),
        }
    }

    // ───── CRUD ─────

    pub async fn update_school(
        &self,
        school_id: &str,
        data: serde_json::Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        
        if let Some(name) = data["schoolName"].as_str() {
            sqlx::query("UPDATE schools SET school_name = $1 WHERE school_id = $2")
                .bind(name)
                .bind(school_id)
                .execute(&mut *conn)
                .await?;
        }

        if let Some(logo) = data["schoolLogoUrl"].as_str() {
            // 1. Get old logo
            let old_logo: Option<String> = sqlx::query_scalar("SELECT school_logo_url FROM schools WHERE school_id = $1")
                .bind(school_id)
                .fetch_optional(&mut *conn)
                .await?;

            // 2. Update
            sqlx::query("UPDATE schools SET school_logo_url = $1 WHERE school_id = $2")
                .bind(logo)
                .bind(school_id)
                .execute(&mut *conn)
                .await?;
            
            // 3. Mark new logo as permanent
            sqlx::query("UPDATE app_files SET is_permanent = TRUE WHERE public_url = $1")
                .bind(logo)
                .execute(&mut *conn)
                .await?;

            // 4. Orphan old logo
            if let Some(old_url) = old_logo {
                if old_url != logo {
                    sqlx::query("UPDATE app_files SET is_permanent = FALSE WHERE public_url = $1")
                        .bind(old_url)
                        .execute(&mut *conn)
                        .await?;
                }
            }
        }

        if let Some(rate_val) = data["perStudentRate"].as_str() {
            if let Ok(rate) = rate_val.parse::<bigdecimal::BigDecimal>() {
                let apply_to_all = data["applyToAll"].as_bool().unwrap_or(false);
                if apply_to_all {
                    sqlx::query("UPDATE schools SET per_student_rate = $1")
                        .bind(rate)
                        .execute(&mut *conn)
                        .await?;
                } else {
                    sqlx::query("UPDATE schools SET per_student_rate = $1 WHERE school_id = $2")
                        .bind(rate)
                        .bind(school_id)
                        .execute(&mut *conn)
                        .await?;
                }
            }
        }
        
        if !data["data"].is_null() {
            sqlx::query("UPDATE schools SET data = data || $1 WHERE school_id = $2")
                .bind(&data["data"])
                .bind(school_id)
                .execute(&mut *conn)
                .await?;
        }

        Ok(())
    }

    pub async fn get_churn_radar(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let rows = sqlx::query(
            r#"
            SELECT 
                s.school_id, 
                s.school_name, 
                cp.churn_probability, 
                cp.risk_factors,
                cp.last_calculated
            FROM school_churn_predictions cp
            JOIN schools s ON s.school_id = cp.school_id
            WHERE s.status = 'active'
            ORDER BY cp.churn_probability DESC
            LIMIT 20
            "#,
        )
        .fetch_all(&mut *conn)
        .await?;

        let radar: Vec<Value> = rows
            .iter()
            .map(|r| {
                json!({
                    "schoolId": r.try_get::<String, _>("school_id").unwrap_or_default(),
                    "schoolName": r.try_get::<String, _>("school_name").unwrap_or_default(),
                    "probability": r.try_get::<i32, _>("churn_probability").unwrap_or(0),
                    "factors": r.try_get::<Value, _>("risk_factors").unwrap_or(json!([])),
                    "lastCalculated": r.try_get::<chrono::DateTime<chrono::Utc>, _>("last_calculated")
                                       .ok().map(|t| t.to_rfc3339()),
                })
            })
            .collect();

        Ok(json!(radar))
    }

    pub async fn process_refund(
        &self,
        school_id: &str,
        amount: bigdecimal::BigDecimal,
        description: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let mut tx = conn.begin().await?;

        // Update wallet balance
        let row = sqlx::query(
            "UPDATE schools SET wallet_balance = wallet_balance + $1 WHERE school_id = $2 RETURNING wallet_balance"
        )
        .bind(&amount)
        .bind(school_id)
        .fetch_one(&mut *tx)
        .await?;

        let new_balance: bigdecimal::BigDecimal = row.get("wallet_balance");

        // Record in ledger
        sqlx::query(
            "INSERT INTO billing_ledger (school_id, amount, transaction_type, description, balance_after)
             VALUES ($1, $2, 'refund', $3, $4)"
        )
        .bind(school_id)
        .bind(&amount)
        .bind(description)
        .bind(&new_balance)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(json!({
            "success": true,
            "newBalance": new_balance.to_string(),
            "message": format!("Refund of ₹{} processed for school {}", amount, school_id)
        }))
    }

    pub async fn get_wallet_ledger(
        &self,
        school_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let rows = sqlx::query(
            "SELECT id, amount, transaction_type, description, balance_after, created_at
             FROM billing_ledger WHERE school_id = $1 ORDER BY created_at DESC"
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let ledger: Vec<Value> = rows.iter().map(|r| {
            let amount: bigdecimal::BigDecimal = r.try_get("amount").unwrap_or_default();
            let balance: bigdecimal::BigDecimal = r.try_get("balance_after").unwrap_or_default();
            json!({
                "id": r.try_get::<i32, _>("id").unwrap_or(0),
                "amount": amount.to_string(),
                "type": r.try_get::<String, _>("transaction_type").unwrap_or_default(),
                "description": r.try_get::<String, _>("description").unwrap_or_default(),
                "balanceAfter": balance.to_string(),
                "createdAt": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                               .ok().map(|t| t.to_rfc3339()),
            })
        }).collect();

        Ok(json!(ledger))
    }

    pub async fn delete_school(&self, school_id: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut tx = self.db.pool.begin().await?;
        
        // Comprehensive list of tables with school_id partitioning
        // Ordered roughly from leaf to root to avoid FK violations
        let tables = [
            "ocr_logs",
            "system_audit_logs",
            "audit_logs",
            "auth_logs",
            "billing_ledger",
            "webhook_endpoints",
            "messages",
            "api_keys",
            "tokens",
            "student_coupons",
            "coupons",
            "student_custom_fees",
            "custom_fee_records",
            "custom_fees",
            "student_fees",
            "fees",
            "student_history",
            "class_periods",
            "class_streams",
            "chapters",
            "topics",
            "subjects",
            "exams",
            "classes",
            "leave_applications",
            "awards",
            "complains",
            "reminders",
            "documents",
            "employee_responsibilities",
            "responsibilities",
            "employee_payments",
            "employee_salaries",
            "employee_experience",
            "employee_education",
            "attendance",
            "school_holidays",
            "material_locations",
            "space_materials",
            "space_employees",
            "items",
            "materials",
            "spaces",
            "space_categories",
            "announcements",
            "events",
            "document_embeddings",
            "school_promo_codes",
            "global_users",
            "students",
            "employees",
            "auth",
        ];

        println!("[SuperAdmin] Deleting school data for: {}", school_id);

        for table in &tables {
            let sp_name = format!("sp_{}", table);
            // Create a savepoint before attempting the deletion
            if let Err(e) = sqlx::query(&format!("SAVEPOINT {}", sp_name)).execute(&mut *tx).await {
                println!("[Delete Error] Failed to create savepoint for {}: {:?}", table, e);
                continue;
            }

            if let Err(e) = sqlx::query(&format!("DELETE FROM {} WHERE school_id = $1", table))
                .bind(school_id)
                .execute(&mut *tx)
                .await {
                    println!("[Delete Error] Table {}: {:?}", table, e);
                    // Rollback to the savepoint so the main transaction is not aborted
                    let _ = sqlx::query(&format!("ROLLBACK TO SAVEPOINT {}", sp_name)).execute(&mut *tx).await;
                } else {
                    // Release the savepoint on success
                    let _ = sqlx::query(&format!("RELEASE SAVEPOINT {}", sp_name)).execute(&mut *tx).await;
                }
        }

        // Finally delete the school record itself
        sqlx::query("DELETE FROM schools WHERE school_id = $1")
            .bind(school_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        println!("[SuperAdmin] School {} and all associated data deleted.", school_id);
        Ok(())
    }

    // ───── Status ─────

    pub async fn set_school_status(
        &self,
        school_id: &str,
        status: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let is_blocked = status == "blocked";
        sqlx::query(
            "UPDATE schools SET status=$1, is_blocked=$2, updated_at=NOW() WHERE school_id=$3",
        )
        .bind(status)
        .bind(is_blocked)
        .bind(school_id)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    // ───── Password ─────

    pub async fn change_school_password(
        &self,
        school_id: &str,
        new_password: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let hashed = bcrypt::hash(new_password, 10)?;
        sqlx::query("UPDATE auth SET password = $1, updated_at = NOW() WHERE school_id = $2")
            .bind(&hashed)
            .bind(school_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    // ───── Sessions ─────

    pub async fn set_session_duration(
        &self,
        school_id: &str,
        hours: i32,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        sqlx::query(
            "UPDATE schools SET session_duration_hours=$1, updated_at=NOW() WHERE school_id=$2",
        )
        .bind(hours)
        .bind(school_id)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    pub async fn expire_school_sessions(
        &self,
        school_id: &str,
    ) -> Result<u64, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let result = sqlx::query("DELETE FROM tokens WHERE school_id = $1")
            .bind(school_id)
            .execute(&mut *conn)
            .await?;
        Ok(result.rows_affected())
    }

    pub async fn get_school_sessions(
        &self,
        school_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let rows = sqlx::query(
            "SELECT token_id, school_id, user_type, status, created_at, expires_at
             FROM tokens WHERE school_id = $1 ORDER BY created_at DESC",
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
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
        let mut conn = self.db.acquire_super_admin_connection().await?;
        sqlx::query("UPDATE schools SET notification=$1, updated_at=NOW() WHERE school_id=$2")
            .bind(notification)
            .bind(school_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    pub async fn clear_notification(
        &self,
        school_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        sqlx::query("UPDATE schools SET notification=NULL, updated_at=NOW() WHERE school_id=$1")
            .bind(school_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    pub async fn get_notification(
        &self,
        school_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let row = sqlx::query("SELECT notification FROM schools WHERE school_id = $1")
            .bind(school_id)
            .fetch_optional(&mut *conn)
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

    // ───── Global Notifications ─────

    pub async fn set_global_notification(
        &self,
        notification: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let mut tx = conn.begin().await?;

        // 1. Deactivate existing global notifications
        sqlx::query("UPDATE global_notifications SET active = FALSE WHERE active = TRUE")
            .execute(&mut *tx)
            .await?;

        // 2. Insert new one
        sqlx::query("INSERT INTO global_notifications (notification, active) VALUES ($1, TRUE)")
            .bind(notification)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }

    pub async fn clear_global_notification(&self) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        sqlx::query("UPDATE global_notifications SET active = FALSE WHERE active = TRUE")
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    pub async fn get_global_notification(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let row = sqlx::query("SELECT notification FROM global_notifications WHERE active = TRUE ORDER BY created_at DESC LIMIT 1")
            .fetch_optional(&mut *conn)
            .await?;

        match row {
            Some(r) => Ok(r.try_get::<Value, _>("notification")?),
            None => Ok(json!(null)),
        }
    }

    // ───── Support Requests ─────

    pub async fn create_support_request(
        &self,
        school_name: &str,
        contact_info: &str,
        message: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        sqlx::query(
            "INSERT INTO support_requests (school_name, contact_info, message) VALUES ($1, $2, $3)",
        )
        .bind(school_name)
        .bind(contact_info)
        .bind(message)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    pub async fn list_support_requests(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let rows = sqlx::query(
            "SELECT id, school_name, contact_info, message, status, created_at 
             FROM support_requests ORDER BY created_at DESC",
        )
        .fetch_all(&mut *conn)
        .await?;

        let requests: Vec<Value> = rows
            .iter()
            .map(|r| {
                json!({
                    "id": r.try_get::<i32, _>("id").unwrap_or(0),
                    "schoolName": r.try_get::<String, _>("school_name").unwrap_or_default(),
                    "contactInfo": r.try_get::<String, _>("contact_info").unwrap_or_default(),
                    "message": r.try_get::<String, _>("message").unwrap_or_default(),
                    "status": r.try_get::<String, _>("status").unwrap_or_default(),
                    "createdAt": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                                   .ok().map(|t| t.to_rfc3339()),
                })
            })
            .collect();

        Ok(json!(requests))
    }

    pub async fn resolve_support_request(
        &self,
        id: i32,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        sqlx::query("UPDATE support_requests SET status = 'resolved' WHERE id = $1")
            .bind(id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    // ───── Export / Import (Internal) ─────

    async fn fetch_table_for_school(&self, table: &str, school_id: &str) -> Vec<Value> {
        let mut conn = match self.db.acquire_super_admin_connection().await {
            Ok(c) => c,
            Err(_) => return Vec::new(),
        };
        let q = format!("SELECT row_to_json(t) as j FROM {} t WHERE school_id = $1", table);
        let mut rows = sqlx::query(&q).bind(school_id).fetch(&mut *conn);
        let mut results = Vec::new();
        while let Ok(Some(row)) = TryStreamExt::try_next(&mut rows).await {
            if let Ok(val) = row.try_get::<Value, _>(0) {
               results.push(val);
            }
        }
        results
    }

    pub async fn export_school_data_stream(
        &self,
        school_id: &str,
    ) -> Result<axum::body::Body, Box<dyn Error + Send + Sync>> {
        use futures_util::StreamExt;
        
        let school = self.get_school_full(school_id).await?;
        let school_id_owned = school_id.to_string();
        let db = self.db.clone();

        let stream = async_stream::stream! {
            // yield prefix
            yield Ok::<_, sqlx::Error>(format!(
                "{{\"exportedAt\":\"{}\",\"exportVersion\":\"1.1\",\"school\":{},",
                chrono::Utc::now().to_rfc3339(),
                serde_json::to_string(&school).unwrap_or_else(|_| "null".to_string())
            ));

            let tables = [
                "students", "employees", "classes", "subjects", "fees", 
                "attendance", "announcements", "events", "complains", "spaces"
            ];

            for (i, table) in tables.iter().enumerate() {
                yield Ok(format!("\"{}\":[", table));
                
                let mut conn = match db.acquire_super_admin_connection().await {
                    Ok(c) => c,
                    Err(e) => {
                        yield Err(e);
                        return;
                    }
                };

                let q = format!("SELECT row_to_json(t) as j FROM {} t WHERE school_id = $1", table);
                let mut rows = sqlx::query(&q).bind(&school_id_owned).fetch(&mut *conn);
                
                let mut first = true;
                while let Some(row_result) = rows.next().await {
                    match row_result {
                        Ok(row) => {
                            if let Ok(val) = row.try_get::<Value, _>(0) {
                                if !first { yield Ok(",".to_string()); }
                                yield Ok(serde_json::to_string(&val).unwrap_or_default());
                                first = false;
                            }
                        },
                        Err(e) => {
                            yield Err(e);
                            return;
                        }
                    }
                }
                
                if i < tables.len() - 1 {
                    yield Ok("],".to_string());
                } else {
                    yield Ok("]".to_string());
                }
            }
            
            yield Ok("}".to_string());
        };

        Ok(axum::body::Body::from_stream(stream))
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

    pub async fn export_all_schools(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let ids: Vec<String> = sqlx::query("SELECT school_id FROM schools")
            .fetch_all(&mut *conn)
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
            let mut conn = self.db.acquire_super_admin_connection().await?;
            for s in students {
                let _ = sqlx::query(
                    "INSERT INTO students (student_id, school_id, data, created_at, updated_at)
                     VALUES ($1, $2, $3, NOW(), NOW())
                     ON CONFLICT (student_id) DO UPDATE SET data = EXCLUDED.data",
                )
                .bind(s["student_id"].as_str().unwrap_or(""))
                .bind(school_id)
                .bind(s)
                .execute(&mut *conn)
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
        discount_percentage: bigdecimal::BigDecimal,
        expires_at: Option<chrono::DateTime<chrono::Utc>>,
        max_uses: i32,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        sqlx::query(
            "INSERT INTO promo_codes (code, credit_amount, free_days, discount_percentage, expires_at, max_uses, current_uses, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, 0, NOW())"
        )
        .bind(code)
        .bind(credit_amount.to_string().parse::<bigdecimal::BigDecimal>()?) // Ensure type safety
        .bind(free_days)
        .bind(discount_percentage)
        .bind(expires_at)
        .bind(max_uses)
        .execute(&mut *conn)
        .await?;

        Ok(json!({
            "success": true,
            "message": format!("Promo code {} created successfully", code)
        }))
    }

    pub async fn list_promo_codes(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let rows = sqlx::query(
            "SELECT id, code, credit_amount, free_days, discount_percentage, max_uses, current_uses, expires_at, created_at 
             FROM promo_codes ORDER BY created_at DESC"
        )
        .fetch_all(&mut *conn)
        .await?;

        let promos: Vec<Value> = rows
            .iter()
            .map(|r| {
                let credit: bigdecimal::BigDecimal = r.try_get("credit_amount").unwrap_or_default();
                let discount: bigdecimal::BigDecimal =
                    r.try_get("discount_percentage").unwrap_or_default();
                json!({
                    "id": r.try_get::<i32, _>("id").unwrap_or(0),
                    "code": r.try_get::<String, _>("code").unwrap_or_default(),
                    "creditAmount": credit.to_string(),
                    "discountPercentage": discount.to_string(),
                    "freeDays": r.try_get::<i32, _>("free_days").unwrap_or(0),
                    "maxUses": r.try_get::<i32, _>("max_uses").unwrap_or(1),
                    "currentUses": r.try_get::<i32, _>("current_uses").unwrap_or(0),
                    "expiresAt": r.try_get::<chrono::DateTime<chrono::Utc>, _>("expires_at")
                                   .ok().map(|t| t.to_rfc3339()),
                    "createdAt": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                                   .ok().map(|t| t.to_rfc3339()),
                })
            })
            .collect();

        Ok(json!(promos))
    }

    pub async fn apply_promo_code(
        &self,
        school_id: &str,
        code: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let promo = sqlx::query("SELECT * FROM promo_codes WHERE code = $1")
            .bind(code)
            .fetch_optional(&mut *conn)
            .await?;

        let p = match promo {
            Some(p) => p,
            None => return Err("Invalid promo code".into()),
        };

        let promo_id: i32 = p.get("id");
        let credit: bigdecimal::BigDecimal = p.get("credit_amount");
        let free_days: i32 = p.get("free_days");
        let discount_percentage: bigdecimal::BigDecimal =
            p.try_get("discount_percentage").unwrap_or_default();
        let max_uses: i32 = p.get("max_uses");
        let current_uses: i32 = p.get("current_uses");
        let expires_at: Option<chrono::DateTime<chrono::Utc>> = p.get("expires_at");

        if let Some(exp) = expires_at {
            if exp < chrono::Utc::now() {
                return Err("Promo code has expired".into());
            }
        }

        if current_uses >= max_uses {
            return Err("Promo code usage limit reached".into());
        }

        // Check if school already used it
        let already_used = sqlx::query(
            "SELECT 1 FROM school_promo_codes WHERE school_id = $1 AND promo_code_id = $2",
        )
        .bind(school_id)
        .bind(promo_id)
        .fetch_optional(&mut *conn)
        .await?;

        if already_used.is_some() {
            return Err("Promo code already applied to this school".into());
        }

        let mut tx = conn.begin().await?;

        // Fetch current school billing data
        let school_data = sqlx::query("SELECT per_student_rate, wallet_balance, base_rate, active_promo_id FROM schools WHERE school_id = $1")
            .bind(school_id)
            .fetch_one(&mut *tx)
            .await?;

        let active_promo_id: Option<i32> = school_data.get("active_promo_id");
        if active_promo_id.is_some() {
            return Err("A promo code is already active for this school. It must expire before another can be applied.".into());
        }

        let mut balance: bigdecimal::BigDecimal = school_data.get("wallet_balance");
        let mut per_student_rate: bigdecimal::BigDecimal = school_data.get("per_student_rate");
        let base_rate: bigdecimal::BigDecimal = school_data.get("base_rate");

        // Calculate promo_expires_at
        let mut promo_expires_at: Option<chrono::DateTime<chrono::Utc>> = p.get("expires_at");
        if promo_expires_at.is_none() && free_days > 0 {
            promo_expires_at = Some(chrono::Utc::now() + chrono::Duration::days(free_days as i64));
        }

        use bigdecimal::BigDecimal;
        use std::str::FromStr;

        let mut rate_updated = false;
        if discount_percentage > BigDecimal::from_str("0").unwrap() {
            let one_hundred = BigDecimal::from_str("100").unwrap();
            let discount_factor = (&one_hundred - &discount_percentage) / &one_hundred;

            // Apply discount to base_rate, not the current per_student_rate
            per_student_rate = (&base_rate * &discount_factor).round(2);

            sqlx::query(
                "UPDATE schools SET per_student_rate = $1, active_promo_id = $2, promo_expires_at = $3 WHERE school_id = $4"
            )
            .bind(&per_student_rate)
            .bind(promo_id)
            .bind(promo_expires_at)
            .bind(school_id)
            .execute(&mut *tx)
            .await?;
            rate_updated = true;
        } else {
            // Apply credit only, but still track active_promo_id if it has an expiry
            sqlx::query(
                "UPDATE schools SET active_promo_id = $1, promo_expires_at = $2 WHERE school_id = $3"
            )
            .bind(promo_id)
            .bind(promo_expires_at)
            .bind(school_id)
            .execute(&mut *tx)
            .await?;
        }

        // Apply Wallet Credit
        if credit > BigDecimal::from_str("0").unwrap() {
            sqlx::query(
                "UPDATE schools SET wallet_balance = wallet_balance + $1 WHERE school_id = $2",
            )
            .bind(&credit)
            .bind(school_id)
            .execute(&mut *tx)
            .await?;

            balance = balance + &credit;

            sqlx::query(
                "INSERT INTO billing_ledger (school_id, amount, transaction_type, description, balance_after)
                 VALUES ($1, $2, 'promo_credit', $3, $4)"
            )
            .bind(school_id)
            .bind(&credit)
            .bind(format!("Promo code applied: {}", code))
            .bind(&balance)
            .execute(&mut *tx)
            .await?;
        }

        // Track usage
        sqlx::query("INSERT INTO school_promo_codes (school_id, promo_code_id) VALUES ($1, $2)")
            .bind(school_id)
            .bind(promo_id)
            .execute(&mut *tx)
            .await?;

        sqlx::query("UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = $1")
            .bind(promo_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        let msg = if rate_updated {
            format!(
                "Promo {} applied. New rate: ₹{}/student",
                code, per_student_rate
            )
        } else {
            format!("Promo code {} applied successfully", code)
        };

        Ok(json!({
            "success": true,
            "message": msg
        }))
    }


    pub async fn get_promo_usage(
        &self,
        promo_id: i32,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let rows = sqlx::query(
            "SELECT sp.school_id, s.school_name, sp.applied_at
             FROM school_promo_codes sp
             JOIN schools s ON sp.school_id = s.school_id
             WHERE sp.promo_code_id = $1
             ORDER BY sp.applied_at DESC",
        )
        .bind(promo_id)
        .fetch_all(&mut *conn)
        .await?;

        let usage: Vec<Value> = rows.iter().map(|r| {
            json!({
                "schoolId": r.get::<String, _>("school_id"),
                "schoolName": r.get::<String, _>("school_name"),
                "appliedAt": r.get::<chrono::DateTime<chrono::Utc>, _>("applied_at").to_rfc3339()
            })
        }).collect();

        Ok(json!(usage))
    }

    pub async fn get_admin_stats(&self) -> Result<serde_json::Value, Box<dyn Error>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;

        // 1. School Metrics
        let school_metrics = sqlx::query!(
            r#"
            SELECT 
                COUNT(*) as total_schools,
                COUNT(*) FILTER (WHERE status = 'Active') as active_schools,
                COUNT(*) FILTER (WHERE status = 'Trial') as trial_schools
            FROM schools
            "#
        )
        .fetch_one(&mut *conn)
        .await?;

        // 2. Revenue (Last 30 days) - Based on deductions from schools
        // We take the sum of absolute values of 'monthly_usage' transactions
        let revenue_metrics = sqlx::query!(
            r#"
            SELECT 
                ABS(COALESCE(SUM(amount), 0)) as total_revenue
            FROM billing_ledger
            WHERE transaction_type = 'monthly_usage'
            AND created_at > NOW() - INTERVAL '30 days'
            "#
        )
        .fetch_one(&mut *conn)
        .await?;

        // 3. System Load (Simplified)
        let system_load = sqlx::query!(
            r#"
            SELECT
                (SELECT COUNT(*) FROM students) as total_students,
                (SELECT COUNT(*) FROM employees) as total_employees
            "#
        )
        .fetch_one(&mut *conn)
        .await?;

        Ok(json!({
            "schools": {
                "total": school_metrics.total_schools,
                "active": school_metrics.active_schools,
                "trial": school_metrics.trial_schools
            },
            "revenue": {
                "thirty_days": revenue_metrics.total_revenue.unwrap_or_else(|| bigdecimal::BigDecimal::from(0)).to_string()
            },
            "load": {
                "students": system_load.total_students,
                "employees": system_load.total_employees
            }
        }))
    }
}
