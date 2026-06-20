use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::{Row, Acquire};
use sqlx::types::BigDecimal;
use chrono::{DateTime, Utc};
use std::sync::Arc;

pub struct PostgresSchoolRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl SchoolRepository for PostgresSchoolRepository {
    async fn get_school(&self, school_id: &str) -> Result<Option<Value>, AppError> {
        let row = sqlx::query("SELECT * FROM schools WHERE school_id = $1")
            .bind(school_id)
            .fetch_optional(&self.client.pool)
            .await?;
        Ok(row.map(|r| r.get::<Value, _>("data")))
    }

    async fn get_session_duration_hours(&self, school_id: &str) -> Result<Option<i32>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT session_duration_hours FROM schools WHERE school_id = $1")
            .bind(school_id)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(row.map(|r| r.get::<i32, _>("session_duration_hours")))
    }

    async fn update_school_data(&self, school_id: &str, data: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "UPDATE schools SET data = COALESCE(data, '{}'::jsonb) || $1::jsonb, updated_at = NOW() WHERE school_id = $2"
        )
        .bind(&data)
        .bind(school_id)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    async fn update_session_duration_hours(&self, school_id: &str, hours: i32) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("UPDATE schools SET session_duration_hours = $1 WHERE school_id = $2")
            .bind(hours)
            .bind(school_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn get_school_billing_info(
        &self,
        school_id: &str,
    ) -> Result<Option<(String, Option<DateTime<Utc>>, BigDecimal, BigDecimal)>, AppError> {
        let row = sqlx::query("SELECT billing_status, trial_ends_at, wallet_balance, per_student_rate FROM schools WHERE school_id = $1")
            .bind(school_id)
            .fetch_optional(&self.client.pool)
            .await?;
        if let Some(r) = row {
            let status: String = r.get("billing_status");
            let trial_ends_at: Option<DateTime<Utc>> = r.get("trial_ends_at");
            let wallet_balance: BigDecimal = r.get("wallet_balance");
            let per_student_rate: BigDecimal = r.get("per_student_rate");
            Ok(Some((status, trial_ends_at, wallet_balance, per_student_rate)))
        } else {
            Ok(None)
        }
    }

    async fn get_session_durations(&self, school_ids: &[String]) -> Result<Vec<i64>, AppError> {
        let rows = sqlx::query("SELECT session_duration_hours FROM schools WHERE school_id = ANY($1)")
            .bind(school_ids)
            .fetch_all(&self.client.pool)
            .await?;
        let durations = rows.iter().map(|r| r.get::<i32, _>("session_duration_hours") as i64).collect();
        Ok(durations)
    }

    async fn setup_school_transaction(
        &self,
        payload: SchoolSetupPayload,
    ) -> Result<(), AppError> {
        // Start a database transaction on the global pool
        let mut conn = self.client.pool.acquire().await?;
        let mut tx = conn.begin().await?;

        // 1. Create School (global table)
        sqlx::query("INSERT INTO schools (school_id, school_name, school_logo_url, data) VALUES ($1, $2, $3, $4)")
            .bind(&payload.school_id)
            .bind(&payload.school_name)
            .bind(&payload.school_logo_url)
            .bind(&payload.school_data)
            .execute(&mut *tx)
            .await?;

        if let Some(ref url) = payload.school_logo_url {
            sqlx::query("UPDATE app_files SET is_permanent = TRUE WHERE public_url = $1")
                .bind(url)
                .execute(&mut *tx)
                .await?;
        }

        // Set RLS connection context inside transaction session (so RLS doesn't block subsequent inserts on the same transaction connection)
        crate::db::connection_utils::ConnectionUtils::set_rls_session(&mut *tx, &payload.school_id).await?;

        // 2. Create Auth record (tenant auth table)
        sqlx::query("INSERT INTO auth (school_id, password) VALUES ($1, $2) ON CONFLICT (school_id) DO UPDATE SET password = $2")
            .bind(&payload.school_id)
            .bind(&payload.hashed_password)
            .execute(&mut *tx)
            .await?;

        // 3. Create Space Categories & Spaces (tenant resource tables)
        for (category, space_name) in &payload.spaces {
            sqlx::query("INSERT INTO space_categories (school_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING")
                .bind(&payload.school_id)
                .bind(category)
                .execute(&mut *tx)
                .await?;

            let space_id = space_name.to_lowercase().replace(' ', "-");
            let space_data = serde_json::json!({"name": space_name, "category": category});
            sqlx::query("INSERT INTO spaces (school_id, space_id, name, space_category, data) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (school_id, name) DO NOTHING")
                .bind(&payload.school_id)
                .bind(&space_id)
                .bind(space_name)
                .bind(category)
                .bind(&space_data)
                .execute(&mut *tx)
                .await?;
        }

        // 4. Create Items (tenant resource table)
        for (space_name, item_data) in &payload.items {
            let raw_id = item_data["id"].as_str().unwrap_or("").to_string();
            let item_id = format!(
                "{}-{}-{}",
                space_name,
                raw_id,
                &payload.school_id[..4]
            );

            // Resolve space_name to space_id from spaces table
            let space_id: Option<String> = sqlx::query_scalar(
                "SELECT space_id FROM spaces WHERE school_id = $1 AND (name = $2 OR space_id = $2)"
            )
            .bind(&payload.school_id)
            .bind(space_name)
            .fetch_optional(&mut *tx)
            .await?;
            let sid = space_id.as_deref().unwrap_or(space_name);

            sqlx::query("INSERT INTO items (item_id, school_id, space_id, item_name, room_number, class_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (school_id, space_id, item_id) DO NOTHING")
                .bind(&item_id)
                .bind(&payload.school_id)
                .bind(sid)
                .bind(item_data["itemName"].as_str().unwrap_or(item_data["materialName"].as_str().unwrap_or("")))
                .bind(item_data["roomNumber"].as_str().unwrap_or(""))
                .bind(item_data["classId"].as_str())
                .execute(&mut *tx)
                .await?;
        }

        // 5. Create Responsibilities (tenant responsibility table)
        for resp in &payload.responsibilities {
            let name = resp["name"].as_str().unwrap_or("");
            let desc = resp["description"].as_str();
            let space_cat = resp["spaceCategory"].as_str();
            let emp_type = resp["employeeType"].as_str();
            let work_lvl = resp["workLevel"].as_str();
            let work_amt = resp["workAmount"].as_f64().unwrap_or(0.0);
            let work_per = resp["workPeriod"].as_str();
            let student_fee = resp["studentFee"].as_f64().unwrap_or(0.0);

            // Derive responsibility_id
            let responsibility_id = name
                .to_uppercase()
                .chars()
                .filter(|c| c.is_alphanumeric() || c.is_whitespace())
                .collect::<String>()
                .split_whitespace()
                .collect::<Vec<_>>()
                .join("_");

            // Extract the first space_id from space_ids array if present
            let space_id = resp["spaceIds"].as_array()
                .and_then(|arr| arr.first())
                .and_then(|val| val.as_str())
                .unwrap_or("");

            sqlx::query(
                "INSERT INTO responsibilities (
                    responsibility_id, school_id, name, description, space_category, 
                    employee_type, work_level, work_amount, work_period, space_id, student_fee
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 ON CONFLICT (responsibility_id) DO NOTHING"
            )
            .bind(&responsibility_id)
            .bind(&payload.school_id)
            .bind(name)
            .bind(desc)
            .bind(space_cat)
            .bind(emp_type)
            .bind(work_lvl)
            .bind(work_amt)
            .bind(work_per)
            .bind(space_id)
            .bind(student_fee)
            .execute(&mut *tx)
            .await?;
        }

        // 6. Create Admin Employee (tenant employee table)
        let emp_type_str = payload.admin_employee["employeeType"].as_str().unwrap_or("permanent");
        let email_str = payload.admin_employee["email"].as_str();
        let phone_str = payload.admin_employee["phone"].as_str();
        let aadhaar_number = payload.admin_employee["aadhaarNumber"].as_str();

        sqlx::query("INSERT INTO employees (employee_id, school_id, employee_type, data, aadhaar_number, contact, email) VALUES ($1, $2, $3, $4, $5, $6, $7)")
            .bind(&payload.admin_id)
            .bind(&payload.school_id)
            .bind(emp_type_str)
            .bind(&payload.admin_employee)
            .bind(aadhaar_number)
            .bind(phone_str)
            .bind(email_str)
            .execute(&mut *tx)
            .await?;

        // 7. Create default holidays (tenant school_holidays table)
        for hol in &payload.holidays {
            let id = hol["id"].as_str().unwrap_or("");
            let title = hol["title"].as_str().unwrap_or("");
            let desc = hol["description"].as_str().unwrap_or("");
            let from_date = hol["fromDate"].as_str().unwrap_or("");
            let to_date = hol["toDate"].as_str().unwrap_or("");
            let classes = hol["classes"].clone();
            let exempt_emp = hol["exemptEmployees"].clone();
            let exempt_std = hol["exemptStudents"].clone();
            let created_at = hol["createdAt"].as_str().unwrap_or("");

            sqlx::query("INSERT INTO school_holidays (id, school_id, title, description, from_date, to_date, classes, exempt_employees, exempt_students, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)")
                .bind(id)
                .bind(&payload.school_id)
                .bind(title)
                .bind(desc)
                .bind(from_date)
                .bind(to_date)
                .bind(classes)
                .bind(exempt_emp)
                .bind(exempt_std)
                .bind(created_at)
                .execute(&mut *tx)
                .await?;
        }

        // 8. Create default fee structure templates (tenant fees table)
        for fee in &payload.fees {
            let fees_id = format!("F{}", chrono::Utc::now().timestamp_millis());
            let name = fee["feesName"].as_str().unwrap_or("Unnamed Fee");
            let desc = fee["feesReason"].as_str().unwrap_or("");
            let amount = fee["feesAmount"].as_f64().unwrap_or(0.0);
            let period = fee["feesPeriod"].as_str().unwrap_or("One Time");

            sqlx::query("INSERT INTO fees (id, school_id, fees_name, fees_reason, fees_period, fees_amount) VALUES ($1, $2, $3, $4, $5, $6)")
                .bind(&fees_id)
                .bind(&payload.school_id)
                .bind(name)
                .bind(desc)
                .bind(period)
                .bind(amount)
                .execute(&mut *tx)
                .await?;
        }

        // 9. System Audit Log (tenant system_audit_logs table)
        sqlx::query("INSERT INTO system_audit_logs (school_id, admin_id, entity_type, entity_id, action_type, changed_data) VALUES ($1, $2, 'SCHOOL', $3, 'SETUP', $4)")
            .bind(&payload.school_id)
            .bind(&payload.admin_id)
            .bind(&payload.school_id)
            .bind(&payload.school_data)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }

    async fn list_all_schools(&self) -> Result<Vec<Value>, AppError> {
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
        .fetch_all(&self.client.pool)
        .await?;

        let schools = rows
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

        Ok(schools)
    }

    async fn get_school_full(&self, school_id: &str) -> Result<Option<Value>, AppError> {
        let row = sqlx::query(
            r#"
            SELECT s.*, 
                (SELECT COUNT(*) FROM students st WHERE st.school_id = s.school_id AND st.status = 'active') as active_student_count
            FROM schools s 
            WHERE s.school_id = $1
            "#
        )
            .bind(school_id)
            .fetch_optional(&self.client.pool)
            .await?;

        if let Some(r) = row {
            Ok(Some(json!({
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
            })))
        } else {
            Ok(None)
        }
    }

    async fn update_school_details(&self, school_id: &str, data: Value) -> Result<(), AppError> {
        let mut conn = self.client.pool.acquire().await?;
        
        if let Some(name) = data["schoolName"].as_str() {
            sqlx::query("UPDATE schools SET school_name = $1 WHERE school_id = $2")
                .bind(name)
                .bind(school_id)
                .execute(&mut *conn)
                .await?;
        }

        if let Some(logo) = data["schoolLogoUrl"].as_str() {
            let old_logo: Option<String> = sqlx::query_scalar("SELECT school_logo_url FROM schools WHERE school_id = $1")
                .bind(school_id)
                .fetch_optional(&mut *conn)
                .await?;

            sqlx::query("UPDATE schools SET school_logo_url = $1 WHERE school_id = $2")
                .bind(logo)
                .bind(school_id)
                .execute(&mut *conn)
                .await?;
            
            sqlx::query("UPDATE app_files SET is_permanent = TRUE WHERE public_url = $1")
                .bind(logo)
                .execute(&mut *conn)
                .await?;

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

    async fn delete_school(&self, school_id: &str) -> Result<(), AppError> {
        let mut conn = self.client.pool.acquire().await?;
        let mut tx = conn.begin().await?;
        
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

        for table in &tables {
            let sp_name = format!("sp_{}", table);
            if let Err(e) = sqlx::query(&format!("SAVEPOINT {}", sp_name)).execute(&mut *tx).await {
                tracing::error!("Failed to create savepoint for {}: {:?}", table, e);
                continue;
            }

            if let Err(e) = sqlx::query(&format!("DELETE FROM {} WHERE school_id = $1", table))
                .bind(school_id)
                .execute(&mut *tx)
                .await {
                    tracing::error!("Error deleting from table {}: {:?}", table, e);
                    let _ = sqlx::query(&format!("ROLLBACK TO SAVEPOINT {}", sp_name)).execute(&mut *tx).await;
                } else {
                    let _ = sqlx::query(&format!("RELEASE SAVEPOINT {}", sp_name)).execute(&mut *tx).await;
                }
        }

        sqlx::query("DELETE FROM schools WHERE school_id = $1")
            .bind(school_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }

    async fn set_school_status(&self, school_id: &str, status: &str, is_blocked: bool) -> Result<(), AppError> {
        let mut conn = self.client.pool.acquire().await?;
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

    async fn change_school_password(&self, school_id: &str, hashed_pass: &str) -> Result<(), AppError> {
        let mut conn = self.client.pool.acquire().await?;
        sqlx::query("UPDATE auth SET password = $1, updated_at = NOW() WHERE school_id = $2")
            .bind(hashed_pass)
            .bind(school_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn get_school_sessions(&self, school_id: &str) -> Result<Vec<Value>, AppError> {
        let mut conn = self.client.pool.acquire().await?;
        let rows = sqlx::query(
            "SELECT token_id, school_id, user_type, status, created_at, expires_at
             FROM tokens WHERE school_id = $1 ORDER BY created_at DESC",
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let now = chrono::Utc::now();
        let sessions = rows
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

        Ok(sessions)
    }

    async fn delete_school_sessions(&self, school_id: &str) -> Result<u64, AppError> {
        let mut conn = self.client.pool.acquire().await?;
        let result = sqlx::query("DELETE FROM tokens WHERE school_id = $1")
            .bind(school_id)
            .execute(&mut *conn)
            .await?;
        Ok(result.rows_affected())
    }

    async fn set_notification(&self, school_id: &str, notification: Option<Value>) -> Result<(), AppError> {
        let mut conn = self.client.pool.acquire().await?;
        if let Some(notif) = notification {
            sqlx::query("UPDATE schools SET notification=$1, updated_at=NOW() WHERE school_id=$2")
                .bind(notif)
                .bind(school_id)
                .execute(&mut *conn)
                .await?;
        } else {
            sqlx::query("UPDATE schools SET notification=NULL, updated_at=NOW() WHERE school_id=$1")
                .bind(school_id)
                .execute(&mut *conn)
                .await?;
        }
        Ok(())
    }

    async fn create_support_request(
        &self,
        school_name: &str,
        contact_info: &str,
        message: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO support_requests (school_name, contact_info, message) VALUES ($1, $2, $3)",
        )
        .bind(school_name)
        .bind(contact_info)
        .bind(message)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }

    async fn list_support_requests(&self) -> Result<Vec<Value>, AppError> {
        let rows = sqlx::query(
            "SELECT id, school_name, contact_info, message, status, created_at \
             FROM support_requests ORDER BY created_at DESC",
        )
        .fetch_all(&self.client.pool)
        .await?;

        let requests = rows
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

        Ok(requests)
    }

    async fn resolve_support_request(&self, id: i32) -> Result<(), AppError> {
        sqlx::query("UPDATE support_requests SET status = 'resolved' WHERE id = $1")
            .bind(id)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn run_daily_billing_metering(&self) -> Result<(), AppError> {
        let now = chrono::Utc::now();
        let pool = &self.client.pool;

        // 0. Revert expired promos
        let expired_result = sqlx::query(
            "UPDATE schools 
             SET active_promo_id = NULL, promo_expires_at = NULL, per_student_rate = base_rate
             WHERE active_promo_id IS NOT NULL AND promo_expires_at < $1",
        )
        .bind(now)
        .execute(pool)
        .await?;

        if expired_result.rows_affected() > 0 {
            tracing::info!(
                "[Nightly Cashier] Reverted {} schools to base rate due to expired promos.",
                expired_result.rows_affected()
            );
        }

        // 1. Fetch all schools that are active
        let schools = sqlx::query(
            "SELECT school_id, per_student_rate, wallet_balance, trial_ends_at, billing_status, last_billing_date 
             FROM schools 
             WHERE status = 'active'"
        )
        .fetch_all(pool)
        .await?;

        for row in schools {
            let school_id: String = row.get("school_id");
            let per_student_rate: BigDecimal = row.get("per_student_rate");
            let current_balance: BigDecimal = row.get("wallet_balance");
            let trial_ends_at: Option<chrono::DateTime<chrono::Utc>> = row.try_get("trial_ends_at").ok().flatten();
            let billing_status: String = row.get("billing_status");
            let last_billing_date: Option<chrono::DateTime<chrono::Utc>> = row.try_get("last_billing_date").ok().flatten();

            // Count active students
            let count_row = sqlx::query(
                "SELECT COUNT(*) as count FROM students WHERE school_id = $1 AND status = 'active'",
            )
            .bind(&school_id)
            .fetch_one(pool)
            .await?;

            let active_students: i64 = count_row.get("count");
            
            use bigdecimal::ToPrimitive;
            let students_bd = BigDecimal::from(active_students);
            let required_balance = &per_student_rate * &students_bd;

            // Immediate unblock check
            if billing_status == "suspended" && current_balance >= required_balance {
                tracing::info!("[Nightly Cashier] School {} recharged and has enough balance. Unsuspending.", school_id);
                sqlx::query(
                    "UPDATE schools SET billing_status = 'active', is_blocked = false WHERE school_id = $1"
                )
                .bind(&school_id)
                .execute(pool)
                .await?;

                let notif = json!({
                    "title": "Account Restored",
                    "message": "Your wallet has sufficient credits. Your account has been restored.",
                    "type": "success",
                    "sentAt": now.to_rfc3339(),
                    "dismissible": true
                });
                sqlx::query("UPDATE schools SET notification = $1 WHERE school_id = $2")
                    .bind(notif)
                    .bind(&school_id)
                    .execute(pool)
                    .await?;
            }

            if billing_status == "suspended" && current_balance < required_balance {
                continue;
            }

            if let Some(end_date) = trial_ends_at {
                if now < end_date {
                    continue;
                }
            }

            let lbd = last_billing_date.unwrap_or(now);
            let days_since_last_billing = (now - lbd).num_days();

            if days_since_last_billing >= 30 {
                use std::str::FromStr;
                if required_balance > BigDecimal::from_str("0.00").unwrap() {
                    let new_balance = &current_balance - &required_balance;
                    let deduction_amount = -(&required_balance);

                    let mut tx = pool.begin().await?;

                    sqlx::query(
                        "UPDATE schools SET wallet_balance = $1, last_billing_date = CURRENT_TIMESTAMP WHERE school_id = $2"
                    )
                    .bind(&new_balance)
                    .bind(&school_id)
                    .execute(&mut *tx)
                    .await?;

                    sqlx::query(
                        "INSERT INTO billing_ledger (school_id, amount, transaction_type, description, balance_after) \
                         VALUES ($1, $2, 'monthly_usage', $3, $4)"
                    )
                    .bind(&school_id)
                    .bind(&deduction_amount)
                    .bind(format!("30-Day billing: {} active students", active_students))
                    .bind(&new_balance)
                    .execute(&mut *tx)
                    .await?;

                    if new_balance < required_balance {
                        sqlx::query(
                            "UPDATE schools SET billing_status = 'suspended', is_blocked = true WHERE school_id = $1"
                        )
                        .bind(&school_id)
                        .execute(&mut *tx)
                        .await?;

                        let notif = json!({
                            "title": "Payment Required",
                            "message": "Your wallet balance is insufficient for the current student count. Your account has been suspended.",
                            "type": "error",
                            "sentAt": now.to_rfc3339(),
                            "dismissible": false
                        });
                        sqlx::query("UPDATE schools SET notification = $1 WHERE school_id = $2")
                            .bind(notif)
                            .bind(&school_id)
                            .execute(&mut *tx)
                            .await?;
                    }

                    tx.commit().await?;
                } else {
                    sqlx::query(
                        "UPDATE schools SET last_billing_date = CURRENT_TIMESTAMP WHERE school_id = $1",
                    )
                    .bind(&school_id)
                    .execute(pool)
                    .await?;
                }
            }
        }
        Ok(())
    }

    async fn get_school_admin_email(&self, school_id: &str) -> Result<Option<String>, AppError> {
        let row = sqlx::query("SELECT admin_email FROM schools WHERE school_id = $1")
            .bind(school_id)
            .fetch_optional(&self.client.pool)
            .await?;
        
        let admin_email: Option<String> = row.and_then(|r| r.try_get("admin_email").ok().flatten());
        Ok(admin_email)
    }

    async fn get_active_school_ids(&self) -> Result<Vec<String>, AppError> {
        let rows = sqlx::query_as::<_, (String,)>("SELECT school_id FROM schools WHERE status = 'active'")
            .fetch_all(&self.client.pool)
            .await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    async fn insert_scheduled_report(
        &self,
        school_id: &str,
        report_type: &str,
        report_data: Option<&Value>,
        period_start: &str,
        period_end: &str,
        generated_at: chrono::DateTime<chrono::Utc>,
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO scheduled_reports (school_id, report_type, report_data, period_start, period_end, generated_at) \
             VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(school_id)
        .bind(report_type)
        .bind(report_data)
        .bind(period_start)
        .bind(period_end)
        .bind(generated_at)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }
}



