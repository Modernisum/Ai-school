use crate::repository::Repositories;
use crate::services::traits::*;
use serde_json::{json, Value};
use std::sync::Arc;

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
        let history = self.repos.responsibility.get_assignment_history(school_id, responsibility_id, employee_id, limit).await?;
        Ok(history)
    }
    
    pub async fn get_responsibility_versions(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> AppResult<Vec<Value>> {
        let versions = self.repos.responsibility.get_responsibility_versions(school_id, responsibility_id).await?;
        Ok(versions)
    }
    
    pub async fn rollback_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
        version: i32,
        admin_id: &str,
    ) -> AppResult<()> {
        self.repos.responsibility.rollback_responsibility(school_id, responsibility_id, version, admin_id).await?;
        
        // Log rollback action
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "RESPONSIBILITY",
            responsibility_id,
            "ROLLBACK",
            json!({
                "fromVersion": version,
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
        let version = self.repos.responsibility.create_responsibility_version(school_id, responsibility_id, admin_id).await?;
        Ok(version)
    }
}

