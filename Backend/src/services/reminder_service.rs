use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

pub struct PostgresReminderService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl ReminderService for PostgresReminderService {
    async fn create_reminder(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.repos.reminder.add_reminder(school_id, data.clone()).await?;
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "REMINDER",
            &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()),
            "CREATE",
            data
        ).await;
        Ok(res)
    }

    async fn list_reminders(
        &self,
        school_id: &str,
    ) -> AppResult<Vec<Value>> {
        Ok(self.repos.reminder.get_reminders(school_id).await?)
    }

    async fn delete_reminder(
        &self,
        school_id: &str,
        admin_id: &str,
        reminder_id: i32,
    ) -> AppResult<()> {
        let reminder = self.repos.reminder.get_reminder(school_id, reminder_id).await?
            .ok_or_else(|| AppError::NotFound("Reminder not found".to_string()))?;

        self.repos.reminder.delete_reminder(school_id, reminder_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "REMINDER",
            &reminder_id.to_string(),
            "DELETE",
            reminder
        ).await;

        Ok(())
    }
}
