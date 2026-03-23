use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresAuditRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl crate::repository::traits::AuditRepository for PostgresAuditRepository {
    async fn log_action(
        &self,
        school_id: &str,
        admin_id: &str,
        entity_type: &str,
        entity_id: &str,
        action_type: &str,
        changed_data: Value,
    ) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "INSERT INTO system_audit_logs (school_id, admin_id, entity_type, entity_id, action_type, changed_data) 
             VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(school_id)
        .bind(admin_id)
        .bind(entity_type)
        .bind(entity_id)
        .bind(action_type)
        .bind(changed_data)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    async fn get_logs(
        &self,
        school_id: &str,
        entity_type: Option<&str>,
        limit: i64,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let mut q = "SELECT * FROM system_audit_logs WHERE school_id = $1".to_string();
        if entity_type.is_some() {
            q.push_str(" AND entity_type = $2 ORDER BY created_at DESC LIMIT $3");
        } else {
            q.push_str(" ORDER BY created_at DESC LIMIT $2");
        }

        let mut query = sqlx::query(&q).bind(school_id);
        if let Some(et) = entity_type {
            query = query.bind(et).bind(limit);
        } else {
            query = query.bind(limit);
        }

        let rows = query.fetch_all(&mut *conn).await?;
        
        Ok(rows.into_iter().map(|r| {
            json!({
                "id": r.get::<i32, _>("id"),
                "schoolId": r.get::<String, _>("school_id"),
                "adminId": r.get::<String, _>("admin_id"),
                "entityType": r.get::<String, _>("entity_type"),
                "entityId": r.get::<String, _>("entity_id"),
                "actionType": r.get::<String, _>("action_type"),
                "changedData": r.get::<Value, _>("changed_data"),
                "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
            })
        }).collect())
    }

    async fn get_log_by_id(
        &self,
        school_id: &str,
        log_id: i32,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM system_audit_logs WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(log_id)
            .fetch_optional(&mut *conn)
            .await?;
            
        Ok(row.map(|r| {
            json!({
                "id": r.get::<i32, _>("id"),
                "schoolId": r.get::<String, _>("school_id"),
                "adminId": r.get::<String, _>("admin_id"),
                "entityType": r.get::<String, _>("entity_type"),
                "entityId": r.get::<String, _>("entity_id"),
                "actionType": r.get::<String, _>("action_type"),
                "changedData": r.get::<Value, _>("changed_data"),
                "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
            })
        }))
    }
}
