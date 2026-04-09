use crate::repository::Repositories;
use crate::services::traits::*;
use serde_json::{json, Value};
use std::sync::Arc;
use sqlx::Row;

pub struct ResponsibilityHistory {
    pub repos: Arc<Repositories>,
}

impl ResponsibilityHistory {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn get_assignment_history(
        &self,
        school_id: &str,
        responsibility_id: Option<&str>,
        employee_id: Option<&str>,
        limit: i64,
    ) -> AppResult<Vec<Value>> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let mut query = "SELECT * FROM responsibility_assignment_history WHERE school_id = $1".to_string();
        let mut param_count = 1;
        
        if let Some(rid) = responsibility_id {
            query.push_str(&format!(" AND responsibility_id = ${}", param_count + 1));
            param_count += 1;
        }
        
        if let Some(eid) = employee_id {
            query.push_str(&format!(" AND employee_id = ${}", param_count + 1));
            param_count += 1;
        }
        
        query.push_str(&format!(" ORDER BY performed_at DESC LIMIT ${}", param_count + 1));
        
        let rows = sqlx::query(&query)
            .bind(school_id)
            .bind(responsibility_id.unwrap_or(""))
            .bind(employee_id.unwrap_or(""))
            .bind(limit)
            .fetch_all(&mut *conn)
            .await
            .map_err(|e| AppError::Database(e))?;
        
        let mut history = Vec::new();
        for row in rows {
            history.push(json!({
                "id": row.get::<i32, _>("id"),
                "schoolId": row.get::<String, _>("school_id"),
                "responsibilityId": row.get::<String, _>("responsibility_id"),
                "employeeId": row.get::<String, _>("employee_id"),
                "spaceIds": row.get::<Option<Vec<String>>, _>("space_ids").unwrap_or_default(),
                "action": row.get::<String, _>("action"),
                "previousSpaceIds": row.get::<Option<Vec<String>>, _>("previous_space_ids").unwrap_or_default(),
                "performedBy": row.get::<String, _>("performed_by"),
                "performedAt": row.get::<chrono::DateTime<chrono::Utc>, _>("performed_at").to_rfc3339(),
                "reason": row.get::<Option<String>, _>("reason"),
                "version": row.get::<i32, _>("version"),
                "metadata": row.get::<serde_json::Value, _>("metadata"),
            }));
        }
        
        Ok(history)
    }
    
    pub async fn get_responsibility_versions(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> AppResult<Vec<Value>> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let rows = sqlx::query(
            "SELECT * FROM responsibility_version
             WHERE school_id = $1 AND responsibility_id = $2
             ORDER BY version DESC"
        )
        .bind(school_id)
        .bind(responsibility_id)
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        
        let mut versions = Vec::new();
        for row in rows {
            versions.push(json!({
                "id": row.get::<i32, _>("id"),
                "schoolId": row.get::<String, _>("school_id"),
                "responsibilityId": row.get::<String, _>("responsibility_id"),
                "version": row.get::<i32, _>("version"),
                "name": row.get::<String, _>("name"),
                "description": row.get::<Option<String>, _>("description"),
                "employeeType": row.get::<Option<String>, _>("employee_type"),
                "revenue": row.get::<Option<f64>, _>("revenue"),
                "spaceIds": row.get::<Option<Vec<String>>, _>("space_ids").unwrap_or_default(),
                "createdBy": row.get::<String, _>("created_by"),
                "createdAt": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                "isCurrent": row.get::<bool, _>("is_current"),
                "metadata": row.get::<serde_json::Value, _>("metadata"),
            }));
        }
        
        Ok(versions)
    }
    
    pub async fn rollback_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
        version: i32,
        admin_id: &str,
    ) -> AppResult<()> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        // Get version to rollback to
        let version_row = sqlx::query(
            "SELECT * FROM responsibility_version
             WHERE school_id = $1 AND responsibility_id = $2 AND version = $3"
        )
        .bind(school_id)
        .bind(responsibility_id)
        .bind(version)
        .fetch_optional(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        
        let version_data = version_row.ok_or_else(|| AppError::NotFound("Version not found".to_string()))?;
        
        // Update responsibility with version data
        sqlx::query(
            "UPDATE responsibilities
             SET name = $1, description = $2, employee_type = $3, revenue = $4, space_ids = $5
             WHERE school_id = $6 AND responsibility_id = $7"
        )
        .bind(version_data.try_get::<String, _>("name").unwrap_or_else(|_| String::new()))
        .bind(version_data.try_get::<Option<String>, _>("description").unwrap_or(None))
        .bind(version_data.try_get::<Option<String>, _>("employee_type").unwrap_or(None))
        .bind(version_data.try_get::<Option<f64>, _>("revenue").unwrap_or(None))
        .bind(version_data.try_get::<Option<Vec<String>>, _>("space_ids").unwrap_or(None))
        .bind(school_id)
        .bind(responsibility_id)
        .execute(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        
        // Create a new version entry for rollback
        let new_version: i32 = sqlx::query_scalar(
            "SELECT COALESCE(MAX(version), 0) + 1 FROM responsibility_version
             WHERE responsibility_id = $1"
        )
        .bind(responsibility_id)
        .fetch_one(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        
        sqlx::query(
            "INSERT INTO responsibility_version
             (school_id, responsibility_id, version, name, description, employee_type, revenue, space_ids, created_by, is_current, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)"
        )
        .bind(school_id)
        .bind(responsibility_id)
        .bind(new_version)
        .bind(version_data.try_get::<String, _>("name").unwrap_or_else(|_| String::new()))
        .bind(version_data.try_get::<Option<String>, _>("description").unwrap_or(None))
        .bind(version_data.try_get::<Option<String>, _>("employee_type").unwrap_or(None))
        .bind(version_data.try_get::<Option<f64>, _>("revenue").unwrap_or(None))
        .bind(version_data.try_get::<Option<Vec<String>>, _>("space_ids").unwrap_or(None))
        .bind(admin_id)
        .bind(json!({"rollbackFrom": version}))
        .execute(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        
        // Log rollback action
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "RESPONSIBILITY",
            responsibility_id,
            "ROLLBACK",
            json!({
                "fromVersion": version,
                "toVersion": new_version,
                "rolledBackBy": admin_id
            })
        ).await;
        
        Ok(())
    }
    
    pub async fn create_responsibility_version(
        &self,
        school_id: &str,
        responsibility_id: &str,
        admin_id: &str,
    ) -> AppResult<i32> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        // Get current responsibility data
        let resp_row = sqlx::query(
            "SELECT * FROM responsibilities
             WHERE school_id = $1 AND responsibility_id = $2"
        )
        .bind(school_id)
        .bind(responsibility_id)
        .fetch_optional(&mut *conn)
        .await
        .map_err(|e| AppError::Database(e))?;
        
        let resp_data = resp_row.ok_or_else(|| AppError::NotFound("Responsibility not found".to_string()))?;
        
        // Get next version number
        let version: i32 = sqlx::query_scalar(
            "SELECT COALESCE(MAX(version), 0) + 1 FROM responsibility_version
             WHERE responsibility_id = $1"
        )
        .bind(responsibility_id)
        .fetch_one(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        
        // Insert new version
        sqlx::query(
            "INSERT INTO responsibility_version
             (school_id, responsibility_id, version, name, description, employee_type, revenue, space_ids, created_by, is_current, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)"
        )
        .bind(school_id)
        .bind(responsibility_id)
        .bind(version)
        .bind(resp_data.try_get::<String, _>("name").unwrap_or_else(|_| String::new()))
        .bind(resp_data.try_get::<Option<String>, _>("description").unwrap_or(None))
        .bind(resp_data.try_get::<Option<String>, _>("employee_type").unwrap_or(None))
        .bind(resp_data.try_get::<Option<f64>, _>("revenue").unwrap_or(None))
        .bind(resp_data.try_get::<Option<Vec<String>>, _>("space_ids").unwrap_or(None))
        .bind(admin_id)
        .bind(json!({}))
        .execute(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        
        Ok(version)
    }
}
