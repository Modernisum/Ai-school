use crate::repository::Repositories;
use crate::services::traits::*;
use crate::services::utils::audit::log_audit;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;
use sqlx::Row;

pub struct PostgresAuxiliaryService {
    pub repos: Arc<Repositories>,
    pub ai: Arc<dyn AiService>,
}

impl PostgresAuxiliaryService {
    pub fn new(repos: Arc<Repositories>, ai: Arc<dyn AiService>) -> Self {
        Self { repos, ai }
    }
}

#[async_trait]
impl AwardService for PostgresAuxiliaryService {
    async fn create_award(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value> {
        let res = self.repos.award.add_award(school_id, data.clone()).await.map_err(AppError::from)?;
        let id = res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string());
        log_audit(&self.repos.audit, school_id, admin_id, "AWARD", &id, "CREATE", data).await;
        Ok(res)
    }

    async fn list_awards(&self, school_id: &str, student_id: Option<&str>) -> AppResult<Vec<Value>> {
        Ok(self.repos.award.get_awards(school_id, student_id).await.map_err(AppError::from)?)
    }

    async fn delete_award(&self, school_id: &str, admin_id: &str, award_id: i32) -> AppResult<()> {
        let award = self.repos.award.get_award(school_id, award_id).await?
            .ok_or_else(|| AppError::NotFound("Award not found".to_string()))?;
        self.repos.award.delete_award(school_id, award_id).await?;
        log_audit(&self.repos.audit, school_id, admin_id, "AWARD", &award_id.to_string(), "DELETE", award).await;
        Ok(())
    }
}

#[async_trait]
impl ComplainService for PostgresAuxiliaryService {
    async fn create_complain(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value> {
        let res = self.repos.complain.add_complain(school_id, data.clone()).await?;
        let id = res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string());
        log_audit(&self.repos.audit, school_id, admin_id, "COMPLAIN", &id, "CREATE", data).await;
        Ok(res)
    }

    async fn list_complains(&self, school_id: &str, user_id: Option<&str>, user_role: Option<&str>) -> AppResult<Vec<Value>> {
        Ok(self.repos.complain.get_complains(school_id, user_id, user_role).await?)
    }

    async fn delete_complain(&self, school_id: &str, admin_id: &str, complain_id: i32) -> AppResult<()> {
        let complain = self.repos.complain.get_complain(school_id, complain_id).await?
            .ok_or_else(|| AppError::NotFound("Complain not found".to_string()))?;
        self.repos.complain.delete_complain(school_id, complain_id).await?;
        log_audit(&self.repos.audit, school_id, admin_id, "COMPLAIN", &complain_id.to_string(), "DELETE", complain).await;
        Ok(())
    }
}

#[async_trait]
impl ReminderService for PostgresAuxiliaryService {
    async fn create_reminder(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value> {
        let res = self.repos.reminder.add_reminder(school_id, data.clone()).await?;
        let id = res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string());
        log_audit(&self.repos.audit, school_id, admin_id, "REMINDER", &id, "CREATE", data).await;
        Ok(res)
    }

    async fn list_reminders(&self, school_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.reminder.get_reminders(school_id).await?)
    }

    async fn delete_reminder(&self, school_id: &str, admin_id: &str, reminder_id: i32) -> AppResult<()> {
        let reminder = self.repos.reminder.get_reminder(school_id, reminder_id).await?
            .ok_or_else(|| AppError::NotFound("Reminder not found".to_string()))?;
        self.repos.reminder.delete_reminder(school_id, reminder_id).await?;
        log_audit(&self.repos.audit, school_id, admin_id, "REMINDER", &reminder_id.to_string(), "DELETE", reminder).await;
        Ok(())
    }
}

#[async_trait]
impl DocumentBoxService for PostgresAuxiliaryService {
    async fn upload_document(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value> {
        let res = self.repos.document_box.add_document(school_id, data.clone()).await?;
        let id = res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string());
        log_audit(&self.repos.audit, school_id, admin_id, "DOCUMENT", &id, "UPLOAD", data).await;
        Ok(res)
    }

    async fn list_documents(&self, school_id: &str, student_id: Option<&str>) -> AppResult<Vec<Value>> {
        Ok(self.repos.document_box.get_documents(school_id, student_id).await?)
    }

    async fn delete_document(&self, school_id: &str, admin_id: &str, document_id: i32) -> AppResult<()> {
        let document = self.repos.document_box.get_document(school_id, document_id).await?
            .ok_or_else(|| AppError::NotFound("Document not found".to_string()))?;
        self.repos.document_box.delete_document(school_id, document_id).await?;
        log_audit(&self.repos.audit, school_id, admin_id, "DOCUMENT", &document_id.to_string(), "DELETE", document).await;
        Ok(())
    }
}

#[async_trait]
impl SchoolService for PostgresAuxiliaryService {
    async fn get_school_details(&self, school_id: &str, filter: Option<String>) -> AppResult<Value> {
        if let Some(f) = filter {
            if f == "session" {
                return match self.repos.school.get_session_duration_hours(school_id).await? {
                    Some(hours) => Ok(json!({ "sessionDurationHours": hours })),
                    None => Err(AppError::NotFound("School not found".to_string())),
                };
            }
        }
        match self.repos.school.get_school(school_id).await? {
            Some(school) => Ok(school),
            None => Err(AppError::NotFound("School not found".to_string())),
        }
    }

    async fn update_school(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<()> {
        let old_school = self.get_school_details(school_id, None).await?;
        let old_level = old_school["data"]["classLevel"].as_i64()
            .or_else(|| old_school["data"]["classLevel"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(0);
        
        let new_level = data["classLevel"].as_i64()
            .or_else(|| data["classLevel"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(old_level);

        self.repos.school.update_school_data(school_id, data.clone()).await?;

        if let Some(hours) = data["sessionDurationHours"].as_i64() {
             self.repos.school.update_session_duration_hours(school_id, hours as i32).await?;
        }

        if new_level > old_level {
            log_audit(&self.repos.audit, school_id, admin_id, "CLASS", "AUTO_GENERATE", "CREATE", json!({})).await;
        }

        log_audit(&self.repos.audit, school_id, admin_id, "SCHOOL", "0", "UPDATE", data).await;
        Ok(())
    }
}
