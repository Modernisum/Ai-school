use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use rand::Rng;
use serde_json::{json, Value};
use sqlx::{Acquire, Row};
use std::sync::Arc;

pub struct PostgresComplainRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl ComplainRepository for PostgresComplainRepository {
    async fn add_complain(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;

        // Generate Unique Complaint ID: CMP-YYYYMMDD-RAND
        let random_part: u32 = rand::thread_rng().gen_range(10000..99999);
        let complaint_id = format!(
            "CMP-{}-{}",
            chrono::Utc::now().format("%Y%m%d"),
            random_part
        );

        // Try to insert with new schema (sender_id, sender_type)
        // If it fails due to missing columns, fall back to old schema (student_id)
        let res = match sqlx::query(
            "INSERT INTO complaints (
                complaint_id, school_id, sender_id, sender_type,
                target_id, target_type, subject, description, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING id",
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
        .await
        {
            Ok(res) => res,
            Err(e) => {
                // If error is about missing sender_id column, fall back to student_id
                if e.to_string().contains("sender_id") || e.to_string().contains("column") {
                    sqlx::query(
                        "INSERT INTO complaints (
                            complaint_id, school_id, student_id,
                            target_id, target_type, subject, description, status
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING id",
                    )
                    .bind(&complaint_id)
                    .bind(school_id)
                    .bind(data["senderId"].as_str())
                    .bind(data["targetId"].as_str())
                    .bind(data["targetType"].as_str())
                    .bind(data["subject"].as_str().or(data["title"].as_str()))
                    .bind(data["description"].as_str())
                    .fetch_one(&mut *conn)
                    .await?
                } else {
                    return Err(e.into());
                }
            }
        };

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

        // Check if sender_id column exists, fallback to student_id
        let rows = if let Some(uid) = user_id {
            // Filter by sender OR target
            sqlx::query(
                "SELECT id, complaint_id,
                 COALESCE(sender_id, student_id) as sender_id,
                 COALESCE(sender_type, 'student') as sender_type,
                 target_id, target_type, subject, description, status, created_at
                 FROM complaints
                 WHERE school_id = $1 AND (COALESCE(sender_id, student_id) = $2 OR target_id = $2)",
            )
            .bind(school_id)
            .bind(uid)
            .fetch_all(&mut *conn)
            .await?
        } else {
            // Admin view: all complaints for the school
            sqlx::query(
                "SELECT id, complaint_id,
                 COALESCE(sender_id, student_id) as sender_id,
                 COALESCE(sender_type, 'student') as sender_type,
                 target_id, target_type, subject, description, status, created_at
                 FROM complaints
                 WHERE school_id = $1",
            )
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?
        };

        Ok(rows
            .into_iter()
            .map(|r| {
                json!({
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
                })
            })
            .collect())
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
        Ok(row.map(
            |r| json!({"id": r.get::<i32, _>("id"), "subject": r.get::<String, _>("subject")}),
        ))
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
