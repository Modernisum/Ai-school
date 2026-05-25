use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::Value;
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
}
