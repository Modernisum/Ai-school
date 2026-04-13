use crate::repository::Repositories;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;
use chrono::{DateTime, Utc};
use sqlx::{Postgres, Pool, Row};
use crate::error::{AppError, AppResult};

/// Service for managing developer access controls and security
pub struct DeveloperAccessService {
    repos: Arc<Repositories>,
    db_pool: Pool<Postgres>,
}

impl DeveloperAccessService {
    pub fn new(repos: Arc<Repositories>, db_pool: Pool<Postgres>) -> Self {
        Self { repos, db_pool }
    }

    /// Request access to production data for development purposes
    pub async fn request_access(
        &self,
        developer_id: &str,
        developer_email: &str,
        requested_role: &str,
        justification: &str,
        requested_tables: Vec<String>,
        duration_hours: i32,
    ) -> AppResult<Value> {
        // Validate role
        let valid_roles = vec!["readonly", "emergency", "audit", "data_engineer"];
        if !valid_roles.contains(&requested_role) {
            return Err(AppError::Validation(format!("Invalid role: {}", requested_role)));
        }

        // Validate duration (max 24 hours for emergency, 8 hours for others)
        let max_hours = if requested_role == "emergency" { 24 } else { 8 };
        if duration_hours > max_hours {
            return Err(AppError::Validation(format!("Duration cannot exceed {} hours for {} role", max_hours, requested_role)));
        }

        // Check if developer has active access
        let active_grants = self.get_active_grants_for_developer(developer_id).await?;
        if !active_grants.is_empty() {
            return Err(AppError::Validation("Developer already has active access grants".to_string()));
        }

        // Create access request
        let request_data = json!({
            "developer_id": developer_id,
            "developer_email": developer_email,
            "requested_role": requested_role,
            "justification": justification,
            "requested_tables": requested_tables,
            "duration_hours": duration_hours,
            "status": "pending"
        });

        // Store the request
        let mut conn = self.db_pool.acquire().await.map_err(|e| AppError::Internal(format!("Database connection error: {}", e)))?;
        
        let request = sqlx::query(
            "INSERT INTO developer_access_requests 
            (developer_id, developer_email, requested_role, justification, requested_tables, duration_hours, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, created_at"
        )
        .bind(developer_id)
        .bind(developer_email)
        .bind(requested_role)
        .bind(justification)
        .bind(&requested_tables)
        .bind(duration_hours)
        .bind("pending")
        .fetch_one(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to create access request: {}", e)))?;

        let request_id: i32 = request.get("id");
        let created_at: DateTime<Utc> = request.get("created_at");

        // Determine approvers based on role
        let approvers = self.determine_approvers(requested_role).await?;

        // Log the request
        self.log_developer_activity(
            developer_id,
            developer_email,
            "access_request",
            Some("developer_access_requests"),
            Some(&format!("Requested {} access for {} hours", requested_role, duration_hours)),
            None,
        ).await?;

        Ok(json!({
            "request_id": request_id,
            "status": "pending",
            "created_at": created_at.to_rfc3339(),
            "approvers": approvers,
            "message": "Access request submitted for approval"
        }))
    }

    /// Approve an access request
    pub async fn approve_access_request(
        &self,
        request_id: i32,
        approver_id: &str,
        approver_email: &str,
        approval_notes: Option<&str>,
    ) -> AppResult<Value> {
        let mut conn = self.db_pool.acquire().await.map_err(|e| AppError::Internal(format!("Database connection error: {}", e)))?;

        // Get the request
        let request = sqlx::query(
            "SELECT * FROM developer_access_requests WHERE id = $1 AND status = 'pending'"
        )
        .bind(request_id)
        .fetch_optional(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to fetch request: {}", e)))?;

        let request = match request {
            Some(r) => r,
            None => return Err(AppError::NotFound("Access request not found or already processed".to_string())),
        };

        let developer_id: String = request.get("developer_id");
        let developer_email: String = request.get("developer_email");
        let requested_role: String = request.get("requested_role");
        let duration_hours: i32 = request.get("duration_hours");

        // Update request status
        sqlx::query(
            "UPDATE developer_access_requests 
            SET status = 'approved', approver_id = $2, approver_email = $3, 
                approval_notes = $4, approved_at = NOW(), expires_at = NOW() + ($5 || ' hours')::INTERVAL
            WHERE id = $1"
        )
        .bind(request_id)
        .bind(approver_id)
        .bind(approver_email)
        .bind(approval_notes)
        .bind(duration_hours)
        .execute(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to approve request: {}", e)))?;

        // Grant the access
        let grant_id = self.grant_access(
            &developer_id,
            &developer_email,
            &requested_role,
            duration_hours,
        ).await?;

        // Log the approval
        self.log_developer_activity(
            approver_id,
            approver_email,
            "access_approval",
            Some("developer_access_requests"),
            Some(&format!("Approved {} access for {}", requested_role, developer_email)),
            None,
        ).await?;

        Ok(json!({
            "grant_id": grant_id,
            "developer_id": developer_id,
            "role": requested_role,
            "duration_hours": duration_hours,
            "message": "Access granted successfully"
        }))
    }

    /// Grant access to a developer
    async fn grant_access(
        &self,
        developer_id: &str,
        developer_email: &str,
        role: &str,
        duration_hours: i32,
    ) -> AppResult<i32> {
        let mut conn = self.db_pool.acquire().await.map_err(|e| AppError::Internal(format!("Database connection error: {}", e)))?;

        // Map role to PostgreSQL role name
        let pg_role = match role {
            "readonly" => "developer_readonly",
            "emergency" => "developer_emergency",
            "audit" => "developer_audit",
            "data_engineer" => "developer_data_engineer",
            _ => return Err(AppError::Validation(format!("Invalid role: {}", role))),
        };

        // Call the PostgreSQL function to grant access
        let grant = sqlx::query(
            "SELECT grant_developer_access($1, $2, $3, $4) as grant_id"
        )
        .bind(developer_id)
        .bind(developer_email)
        .bind(pg_role)
        .bind(duration_hours)
        .fetch_one(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to grant access: {}", e)))?;

        let grant_id: i32 = grant.get("grant_id");

        Ok(grant_id)
    }

    /// Revoke access from a developer
    pub async fn revoke_access(
        &self,
        grant_id: i32,
        revoker_id: &str,
        revoker_email: &str,
        reason: &str,
    ) -> AppResult<()> {
        let mut conn = self.db_pool.acquire().await.map_err(|e| AppError::Internal(format!("Database connection error: {}", e)))?;

        // Get grant details
        let grant = sqlx::query(
            "SELECT * FROM developer_access_grants WHERE id = $1 AND is_active = TRUE"
        )
        .bind(grant_id)
        .fetch_optional(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to fetch grant: {}", e)))?;

        let grant = match grant {
            Some(g) => g,
            None => return Err(AppError::NotFound("Active access grant not found".to_string())),
        };

        let developer_id: String = grant.get("developer_id");

        // Call the PostgreSQL function to revoke access
        sqlx::query(
            "SELECT revoke_developer_access($1, $2)"
        )
        .bind(grant_id)
        .bind(reason)
        .execute(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to revoke access: {}", e)))?;

        // Log the revocation
        self.log_developer_activity(
            revoker_id,
            revoker_email,
            "access_revocation",
            Some("developer_access_grants"),
            Some(&format!("Revoked access for {}: {}", developer_id, reason)),
            None,
        ).await?;

        Ok(())
    }

    /// Get active access grants for a developer
    pub async fn get_active_grants_for_developer(
        &self,
        developer_id: &str,
    ) -> AppResult<Vec<Value>> {
        let mut conn = self.db_pool.acquire().await.map_err(|e| AppError::Internal(format!("Database connection error: {}", e)))?;

        let grants = sqlx::query(
            "SELECT * FROM developer_access_grants 
            WHERE developer_id = $1 AND is_active = TRUE AND end_time > NOW()
            ORDER BY start_time DESC"
        )
        .bind(developer_id)
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to fetch grants: {}", e)))?;

        let mut result = Vec::new();
        for grant in grants {
            result.push(json!({
                "id": grant.get::<i32, _>("id"),
                "granted_role": grant.get::<String, _>("granted_role"),
                "start_time": grant.get::<DateTime<Utc>, _>("start_time").to_rfc3339(),
                "end_time": grant.get::<DateTime<Utc>, _>("end_time").to_rfc3339(),
                "pg_role_name": grant.get::<String, _>("pg_role_name"),
            }));
        }

        Ok(result)
    }

    /// Get all pending access requests
    pub async fn get_pending_requests(&self) -> AppResult<Vec<Value>> {
        let mut conn = self.db_pool.acquire().await.map_err(|e| AppError::Internal(format!("Database connection error: {}", e)))?;

        let requests = sqlx::query(
            "SELECT * FROM developer_access_requests 
            WHERE status = 'pending'
            ORDER BY created_at DESC"
        )
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to fetch requests: {}", e)))?;

        let mut result = Vec::new();
        for request in requests {
            result.push(json!({
                "id": request.get::<i32, _>("id"),
                "developer_id": request.get::<String, _>("developer_id"),
                "developer_email": request.get::<String, _>("developer_email"),
                "requested_role": request.get::<String, _>("requested_role"),
                "justification": request.get::<String, _>("justification"),
                "duration_hours": request.get::<i32, _>("duration_hours"),
                "created_at": request.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
                "requested_tables": request.get::<Vec<String>, _>("requested_tables"),
            }));
        }

        Ok(result)
    }

    /// Log developer activity for audit purposes
    pub async fn log_developer_activity(
        &self,
        developer_id: &str,
        developer_email: &str,
        action_type: &str,
        target_table: Option<&str>,
        details: Option<&str>,
        query_text: Option<&str>,
    ) -> AppResult<()> {
        let mut conn = self.db_pool.acquire().await.map_err(|e| AppError::Internal(format!("Database connection error: {}", e)))?;

        sqlx::query(
            "INSERT INTO developer_activity_audit 
            (developer_id, developer_email, action_type, target_table, query_text, details)
            VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(developer_id)
        .bind(developer_email)
        .bind(action_type)
        .bind(target_table)
        .bind(query_text)
        .bind(details)
        .execute(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to log activity: {}", e)))?;

        Ok(())
    }

    /// Check and auto-revoke expired access grants
    pub async fn cleanup_expired_grants(&self) -> AppResult<i32> {
        let mut conn = self.db_pool.acquire().await.map_err(|e| AppError::Internal(format!("Database connection error: {}", e)))?;

        let result = sqlx::query(
            "SELECT check_expired_access_grants() as revoked_count"
        )
        .fetch_one(&mut *conn)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to cleanup expired grants: {}", e)))?;

        let revoked_count: i32 = result.get("revoked_count");

        if revoked_count > 0 {
            tracing::info!("Auto-revoked {} expired developer access grants", revoked_count);
        }

        Ok(revoked_count)
    }

    /// Determine approvers based on requested role
    async fn determine_approvers(&self, requested_role: &str) -> AppResult<Vec<String>> {
        // In a real implementation, this would query a team structure or configuration
        // For now, return placeholder approvers based on role sensitivity
        match requested_role {
            "readonly" => Ok(vec!["senior_developer".to_string(), "team_lead".to_string()]),
            "data_engineer" => Ok(vec!["data_team_lead".to_string(), "security_engineer".to_string()]),
            "audit" => Ok(vec!["security_engineer".to_string(), "compliance_officer".to_string()]),
            "emergency" => Ok(vec!["security_engineer".to_string(), "cto".to_string(), "ciso".to_string()]),
            _ => Err(AppError::Validation(format!("Unknown role: {}", requested_role))),
        }
    }

    /// Get developer activity logs (for audit purposes)
    pub async fn get_developer_activity(
        &self,
        developer_id: Option<&str>,
        start_date: Option<DateTime<Utc>>,
        end_date: Option<DateTime<Utc>>,
        limit: i64,
    ) -> AppResult<Vec<Value>> {
        let mut conn = self.db_pool.acquire().await.map_err(|e| AppError::Internal(format!("Database connection error: {}", e)))?;

        let mut query = "SELECT * FROM developer_activity_audit WHERE 1=1".to_string();
        let mut params: Vec<String> = Vec::new();
        let mut param_count = 0;

        if let Some(dev_id) = developer_id {
            param_count += 1;
            query.push_str(&format!(" AND developer_id = ${}", param_count));
            params.push(dev_id.to_string());
        }

        if let Some(start) = start_date {
            param_count += 1;
            query.push_str(&format!(" AND created_at >= ${}", param_count));
            params.push(start.to_rfc3339());
        }

        if let Some(end) = end_date {
            param_count += 1;
            query.push_str(&format!(" AND created_at <= ${}", param_count));
            params.push(end.to_rfc3339());
        }

        query.push_str(&format!(" ORDER BY created_at DESC LIMIT {}", limit));

        let mut sqlx_query = sqlx::query(&query);
        for param in params {
            sqlx_query = sqlx_query.bind(param);
        }

        let activities = sqlx_query
            .fetch_all(&mut *conn)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to fetch activity logs: {}", e)))?;

        let mut result = Vec::new();
        for activity in activities {
            result.push(json!({
                "id": activity.get::<i32, _>("id"),
                "developer_id": activity.get::<String, _>("developer_id"),
                "developer_email": activity.get::<String, _>("developer_email"),
                "action_type": activity.get::<String, _>("action_type"),
                "target_table": activity.get::<Option<String>, _>("target_table"),
                "query_text": activity.get::<Option<String>, _>("query_text"),
                "details": activity.get::<Option<String>, _>("details"),
                "created_at": activity.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
            }));
        }

        Ok(result)
    }
}