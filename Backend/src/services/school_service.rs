use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;
use sqlx::Row;

pub struct PostgresSchoolService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl SchoolService for PostgresSchoolService {
    async fn get_school_details(
        &self,
        school_id: &str,
        filter: Option<String>,
    ) -> AppResult<Value> {
        if let Some(f) = filter {
            if f == "session" {
                let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
                let row = sqlx::query("SELECT session_duration_hours FROM schools WHERE school_id = $1")
                    .bind(school_id)
                    .fetch_optional(&mut *conn)
                    .await?;
                
                return match row {
                    Some(r) => Ok(json!({ "sessionDurationHours": sqlx::Row::get::<i32, _>(&r, "session_duration_hours") })),
                    None => Err(AppError::NotFound("School not found".to_string())),
                };
            }
        }

        match self.repos.school.get_school(school_id).await? {
            Some(school) => Ok(school),
            None => Err(AppError::NotFound("School not found".to_string())),
        }
    }

    async fn update_school(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()> {
        // 1. Fetch old data to check classLevel increase
        let old_school = self.get_school_details(school_id, None).await?;
        let old_level = old_school["data"]["classLevel"].as_i64()
            .or_else(|| old_school["data"]["classLevel"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(0);
        
        let new_level = data["classLevel"].as_i64()
            .or_else(|| data["classLevel"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(old_level);

        // 2. Update database
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await.map_err(AppError::Database)?;
        
        let update_data = data.clone();
        sqlx::query(
            "UPDATE schools SET data = COALESCE(data, '{}'::jsonb) || $1::jsonb, updated_at = NOW() WHERE school_id = $2"
        )
        .bind(&update_data)
        .bind(school_id)
        .execute(&mut *conn)
        .await
        .map_err(AppError::Database)?;

        if let Some(hours) = data["sessionDurationHours"].as_i64() {
             sqlx::query("UPDATE schools SET session_duration_hours = $1 WHERE school_id = $2")
                .bind(hours as i32)
                .bind(school_id)
                .execute(&mut *conn)
                .await
                .map_err(AppError::Database)?;
        }

        // 3. Trigger auto-generation if level increased
        if new_level > old_level {
            let _ = self.repos.audit.log_action(school_id, admin_id, "CLASS", "AUTO_GENERATE", "CREATE", json!({})).await;
        }

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SCHOOL",
            "0",
            "UPDATE",
            data
        ).await;

        Ok(())
    }
}
