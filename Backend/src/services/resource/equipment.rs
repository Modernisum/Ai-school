use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

pub struct EquipmentOperations {
    pub repos: Arc<Repositories>,
}

impl EquipmentOperations {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn create_announcement(
        &self,
        school_id: &str,
        admin_id: &str,
        type_str: &str,
        user_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        self.repos
            .resource
            .add_announcement(school_id, type_str, user_id, data.clone())
            .await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "ANNOUNCEMENT",
            user_id,
            "CREATE",
            data.clone()
        ).await;

        Ok(data)
    }

    pub async fn delete_announcement(
        &self,
        school_id: &str,
        admin_id: &str,
        announcement_id: i32,
    ) -> AppResult<()> {
        let announcement = self.repos.resource.get_announcement(school_id, announcement_id).await?
            .ok_or_else(|| AppError::NotFound("Announcement not found".to_string()))?;

        self.repos.resource.delete_announcement(school_id, announcement_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "ANNOUNCEMENT",
            &announcement_id.to_string(),
            "DELETE",
            announcement
        ).await;

        Ok(())
    }

    pub async fn create_event(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.repos.resource.add_event_summary(school_id, data.clone()).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "EVENT",
            &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()),
            "CREATE",
            data
        ).await;
        Ok(res)
    }

    pub async fn list_events(&self, school_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.resource.get_events(school_id).await?)
    }

    pub async fn update_event(
        &self,
        school_id: &str,
        admin_id: &str,
        event_id: i32,
        data: Value,
    ) -> AppResult<()> {
        self.repos.resource.update_event(school_id, event_id, data.clone()).await?;
        let _ = self.repos.audit.log_action(
            school_id, admin_id, "EVENT", &event_id.to_string(), "UPDATE", data
        ).await;
        Ok(())
    }

    pub async fn delete_event(
        &self,
        school_id: &str,
        admin_id: &str,
        event_id: i32,
    ) -> AppResult<()> {
        let event = self.repos.resource.get_event(school_id, event_id).await?
            .ok_or_else(|| AppError::NotFound("Event not found".to_string()))?;

        self.repos.resource.delete_event(school_id, event_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "EVENT",
            &event_id.to_string(),
            "DELETE",
            event
        ).await;

        Ok(())
    }
}
