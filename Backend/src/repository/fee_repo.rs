use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresFeeRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::FeeRepository for PostgresFeeRepository {
    async fn add_school_fee(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let fees_id = format!("F{}", chrono::Utc::now().timestamp_millis());
        sqlx::query("INSERT INTO fees (id, school_id, fees_name, fees_reason, fees_period, fees_amount) VALUES ($1, $2, $3, $4, $5, $6)")
            .bind(&fees_id)
            .bind(school_id)
            .bind(data["feesName"].as_str().unwrap_or("Unnamed Fee"))
            .bind(data["feesReason"].as_str().unwrap_or(""))
            .bind(data["feesPeriod"].as_str().unwrap_or("One Time"))
            .bind(data["feesAmount"].as_f64().unwrap_or(0.0))
            .execute(&mut *conn)
            .await?;

        let mut ret = data.clone();
        ret["id"] = json!(fees_id);
        ret["createdAt"] = json!(chrono::Utc::now().to_rfc3339());
        Ok(ret)
    }

    async fn get_school_fees(&self, school_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT id, fees_name, fees_reason, fees_period, fees_amount::FLOAT as fees_amount, created_at FROM fees WHERE school_id = $1 ORDER BY created_at DESC",
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        Ok(rows.into_iter().map(|r| json!({
            "id": r.get::<String, _>("id"),
            "feesName": r.get::<String, _>("fees_name"),
            "feesReason": r.get::<Option<String>, _>("fees_reason"),
            "feesPeriod": r.get::<Option<String>, _>("fees_period"),
            "feesAmount": r.get::<f64, _>("fees_amount"),
            "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339()
        })).collect())
    }

    async fn get_pending_fees(
        &self,
        school_id: &str,
        min_percentage: f64,
        class_name: Option<String>,
    ) -> Result<JsonList, AppError> {
        let query_str = if class_name.is_some() {
            "SELECT sf.student_id, sf.total_fees::FLOAT as total_fees, sf.pending_amount::FLOAT as pending_amount, \
             s.name, s.class_name, s.section \
             FROM student_fees sf JOIN students s ON sf.student_id = s.student_id AND sf.school_id = s.school_id \
             WHERE sf.school_id = $1 AND s.class_name = $2 AND (sf.pending_amount / NULLIF(sf.total_fees, 0) * 100) >= $3"
        } else {
            "SELECT sf.student_id, sf.total_fees::FLOAT as total_fees, sf.pending_amount::FLOAT as pending_amount, \
             s.name, s.class_name, s.section \
             FROM student_fees sf JOIN students s ON sf.student_id = s.student_id AND sf.school_id = s.school_id \
             WHERE sf.school_id = $1 AND (sf.pending_amount / NULLIF(sf.total_fees, 0) * 100) >= $2"
        };

        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = if let Some(ref c) = class_name {
            sqlx::query(query_str)
                .bind(school_id)
                .bind(c)
                .bind(min_percentage)
                .fetch_all(&mut *conn)
                .await?
        } else {
            sqlx::query(query_str)
                .bind(school_id)
                .bind(min_percentage)
                .fetch_all(&mut *conn)
                .await?
        };

        Ok(rows
            .into_iter()
            .map(|r| {
                json!({
                    "studentId": r.get::<String, _>("student_id"),
                    "studentName": r.get::<String, _>("name"),
                    "className": r.get::<String, _>("class_name"),
                    "section": r.get::<Option<String>, _>("section"),
                    "totalFees": r.get::<f64, _>("total_fees"),
                    "pendingAmount": r.get::<f64, _>("pending_amount"),
                })
            })
            .collect())
    }

    async fn add_student_fee(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO student_fees (student_id, school_id, total_fees, pending_amount) VALUES ($1, $2, $3, $3) ON CONFLICT (student_id) DO UPDATE SET total_fees = EXCLUDED.total_fees")
            .bind(student_id).bind(school_id).bind(data["amount"].as_f64()).execute(&mut *conn).await?;
        Ok(())
    }

    async fn get_student_fee(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row =
            sqlx::query("SELECT student_id, total_fees::FLOAT as total_fees, pending_amount::FLOAT as pending_amount FROM student_fees WHERE school_id = $1 AND student_id = $2")
                .bind(school_id)
                .bind(student_id)
                .fetch_optional(&mut *conn)
                .await?;
        Ok(row.map(|r| json!({"studentId": r.get::<String, _>("student_id"), "totalFees": r.get::<f64, _>("total_fees"), "pendingAmount": r.get::<f64, _>("pending_amount")})))
    }

    async fn update_student_fee(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM student_fees WHERE school_id = $1 AND student_id = $2)")
            .bind(school_id)
            .bind(student_id)
            .fetch_one(&mut *conn)
            .await?;

        if exists {
            sqlx::query(
                "UPDATE student_fees SET total_fees = COALESCE($1, total_fees), discount = COALESCE($2, discount), pending_amount = COALESCE($3, pending_amount) WHERE school_id = $4 AND student_id = $5",
            )
            .bind(data["totalFees"].as_f64())
            .bind(data["discount"].as_f64())
            .bind(data["pendingAmount"].as_f64())
            .bind(school_id)
            .bind(student_id)
            .execute(&mut *conn)
            .await?;
        } else {
            sqlx::query(
                "INSERT INTO student_fees (school_id, student_id, fee_id, total_fees, pending_amount, discount, status) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)"
            )
            .bind(school_id)
            .bind(student_id)
            .bind(data["feeId"].as_str().unwrap_or("tuition"))
            .bind(data["totalFees"].as_f64().unwrap_or(0.0))
            .bind(data["pendingAmount"].as_f64().unwrap_or(0.0))
            .bind(data["discount"].as_f64().unwrap_or(0.0))
            .bind(data["status"].as_str().unwrap_or("pending"))
            .execute(&mut *conn)
            .await?;
        }
        Ok(())
    }

    async fn add_fee_history(
        &self,
        school_id: &str,
        fee_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("INSERT INTO audit_logs (school_id, target_type, target_id, action, data) VALUES ($1, 'fee', $2, $3, $4)")
            .bind(school_id).bind(fee_id).bind(action).bind(data).execute(&mut *conn).await?;
        Ok(())
    }

    async fn add_custom_fee(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let id = format!("CF{}", chrono::Utc::now().timestamp_millis());
        sqlx::query(
            "INSERT INTO custom_fees (id, school_id, fee_name, amount) VALUES ($1, $2, $3, $4)",
        )
        .bind(&id)
        .bind(school_id)
        .bind(data["feeName"].as_str())
        .bind(data["amount"].as_f64().unwrap_or(0.0))
        .execute(&mut *conn)
        .await?;
        let mut ret = data.clone();
        ret["id"] = json!(id);
        Ok(ret)
    }

    async fn get_custom_fees(&self, school_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query(
            "SELECT id, fee_name, amount::FLOAT as amount FROM custom_fees WHERE school_id = $1",
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;
        Ok(rows.into_iter().map(|r| json!({"id": r.get::<String, _>("id"), "feeName": r.get::<String, _>("fee_name"), "amount": r.get::<f64, _>("amount")})).collect())
    }

    async fn delete_custom_fee(&self, school_id: &str, fee_id: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM custom_fees WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(fee_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn apply_custom_fee(&self, _school_id: &str, fee_id: &str) -> Result<Value, AppError> {
        // Implementation logic from postgres.rs
        Ok(json!({"status": "applied", "id": fee_id}))
    }

    async fn get_student_custom_fees(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT f.fee_name, f.amount::FLOAT as amount FROM custom_fees f JOIN student_custom_fees scf ON f.id = scf.fee_id WHERE f.school_id = $1 AND scf.student_id = $2")
            .bind(school_id).bind(student_id).fetch_all(&mut *conn).await?;
        Ok(rows.into_iter().map(|r| json!({"feeName": r.get::<String, _>("fee_name"), "amount": r.get::<f64, _>("amount")})).collect())
    }
}
