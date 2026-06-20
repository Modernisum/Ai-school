use super::AdminService;
use serde_json::{json, Value};
use std::error::Error;
use crate::logic::password_helper::hash_password;

impl AdminService {
    pub async fn list_all_schools(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let schools = self.repos.school.list_all_schools().await?;
        Ok(json!(schools))
    }

    pub async fn get_school_full(
        &self,
        school_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let school = self.repos.school.get_school_full(school_id).await?
            .ok_or_else(|| format!("School {} not found", school_id))?;
        Ok(school)
    }

    pub async fn update_school(
        &self,
        school_id: &str,
        data: serde_json::Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos.school.update_school_details(school_id, data).await?;
        Ok(())
    }

    pub async fn delete_school(&self, school_id: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        tracing::info!("Deleting school data for: {}", school_id);
        self.repos.school.delete_school(school_id).await?;
        tracing::info!("School {} and all associated data deleted.", school_id);
        Ok(())
    }

    pub async fn set_school_status(
        &self,
        school_id: &str,
        status: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let is_blocked = status == "blocked";
        self.repos.school.set_school_status(school_id, status, is_blocked).await?;
        Ok(())
    }

    pub async fn change_school_password(
        &self,
        school_id: &str,
        new_password: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let hashed = hash_password(new_password)
            .map_err(|e| format!("Password hashing error: {}", e))?;
        self.repos.school.change_school_password(school_id, &hashed).await?;
        Ok(())
    }

    pub async fn set_session_duration(
        &self,
        school_id: &str,
        hours: i32,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos.school.update_session_duration_hours(school_id, hours).await?;
        Ok(())
    }

    pub async fn expire_school_sessions(
        &self,
        school_id: &str,
    ) -> Result<u64, Box<dyn Error + Send + Sync>> {
        let count = self.repos.school.delete_school_sessions(school_id).await?;
        Ok(count)
    }

    pub async fn get_school_sessions(
        &self,
        school_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let sessions = self.repos.school.get_school_sessions(school_id).await?;
        Ok(json!(sessions))
    }

    pub async fn set_notification(
        &self,
        school_id: &str,
        notification: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos.school.set_notification(school_id, Some(notification)).await?;
        Ok(())
    }

    pub async fn clear_notification(
        &self,
        school_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos.school.set_notification(school_id, None).await?;
        Ok(())
    }

    pub async fn get_notification(
        &self,
        school_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let school = self.repos.school.get_school(school_id).await?
            .ok_or_else(|| format!("School {} not found", school_id))?;
        let notification = school.get("notification").cloned().unwrap_or(json!(null));
        Ok(notification)
    }
}
