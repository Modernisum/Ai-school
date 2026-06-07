use super::AdminService;
use sqlx::{Row, Connection};
use std::error::Error;
use serde_json::{json, Value};
use crate::logic::password_helper::hash_password;

impl AdminService {
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

    pub async fn delete_school(&self, school_id: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut tx = self.db.pool.begin().await?;
        
        // Comprehensive list of tables with school_id partitioning
        // Ordered roughly from leaf to root to avoid FK violations
        let tables = [
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

        tracing::info!("Deleting school data for: {}", school_id);

        for table in &tables {
            let sp_name = format!("sp_{}", table);
            // Create a savepoint before attempting the deletion
            if let Err(e) = sqlx::query(&format!("SAVEPOINT {}", sp_name)).execute(&mut *tx).await {
                tracing::error!("Failed to create savepoint for {}: {:?}", table, e);
                continue;
            }

            if let Err(e) = sqlx::query(&format!("DELETE FROM {} WHERE school_id = $1", table))
                .bind(school_id)
                .execute(&mut *tx)
                .await {
                    tracing::error!("Error deleting from table {}: {:?}", table, e);
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
        tracing::info!("School {} and all associated data deleted.", school_id);
        Ok(())
    }

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

    pub async fn change_school_password(
        &self,
        school_id: &str,
        new_password: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let hashed = hash_password(new_password)
            .map_err(|e| format!("Password hashing error: {}", e))?;
        sqlx::query("UPDATE auth SET password = $1, updated_at = NOW() WHERE school_id = $2")
            .bind(&hashed)
            .bind(school_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

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
}
