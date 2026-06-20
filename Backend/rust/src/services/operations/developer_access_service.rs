use crate::repository::Repositories;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;
use chrono::{DateTime, Utc};
use crate::error::{AppError, AppResult};

/// Service for managing developer access controls and security
pub struct DeveloperAccessService {
    repos: Arc<Repositories>,
}

impl DeveloperAccessService {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
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
        let valid_roles = ["readonly", "emergency", "audit", "data_engineer"];
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

        let (request_id, created_at) = self.repos.developer_access.insert_access_request(
            developer_id,
            developer_email,
            requested_role,
            justification,
            &requested_tables,
            duration_hours,
        ).await?;

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
        let (developer_id, developer_email, requested_role, duration_hours) = self.repos.developer_access
            .get_pending_request_by_id(request_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Access request not found or already processed".to_string()))?;

        self.repos.developer_access.update_request_and_approve(
            request_id,
            approver_id,
            approver_email,
            approval_notes,
            duration_hours,
        ).await?;

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
        // Map role to PostgreSQL role name
        let pg_role = match role {
            "readonly" => "developer_readonly",
            "emergency" => "developer_emergency",
            "audit" => "developer_audit",
            "data_engineer" => "developer_data_engineer",
            _ => return Err(AppError::Validation(format!("Invalid role: {}", role))),
        };

        let grant_id = self.repos.developer_access.call_grant_developer_access(
            developer_id,
            developer_email,
            pg_role,
            duration_hours,
        ).await?;

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
        let developer_id = self.repos.developer_access
            .get_active_grant_by_id(grant_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Active access grant not found".to_string()))?;

        self.repos.developer_access.call_revoke_developer_access(grant_id, reason).await?;

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
        let result = self.repos.developer_access.get_active_grants_for_developer(developer_id).await?;
        Ok(result)
    }

    /// Get all pending access requests
    pub async fn get_pending_requests(&self) -> AppResult<Vec<Value>> {
        let result = self.repos.developer_access.get_pending_requests().await?;
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
        self.repos.developer_access.log_developer_activity(
            developer_id,
            developer_email,
            action_type,
            target_table,
            query_text,
            details,
        ).await?;
        Ok(())
    }

    /// Check and auto-revoke expired access grants
    pub async fn cleanup_expired_grants(&self) -> AppResult<i32> {
        let revoked_count = self.repos.developer_access.call_check_expired_access_grants().await?;

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
        let result = self.repos.developer_access.get_developer_activity(
            developer_id,
            start_date,
            end_date,
            limit,
        ).await?;
        Ok(result)
    }
}