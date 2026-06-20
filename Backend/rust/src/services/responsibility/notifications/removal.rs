use crate::error::{AppError, AppResult};
use crate::logic::EmailService;
use crate::repository::Repositories;
use serde_json::{json, Value};
use chrono::{Utc, Datelike};
use std::sync::Arc;

use super::ResponsibilityNotificationType;

pub struct RemovalNotifier {
    repos: Arc<Repositories>,
    email_service: Arc<EmailService>,
}

impl RemovalNotifier {
    pub fn new(repos: Arc<Repositories>, email_service: Arc<EmailService>) -> Self {
        Self { repos, email_service }
    }

    pub async fn send_removal_notification(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
        responsibility_name: &str,
        removed_by: &str,
    ) -> AppResult<()> {
        let notification = json!({
            "id": format!("NOTIF{}", Utc::now().timestamp_millis()),
            "type": ResponsibilityNotificationType::Removed.as_str(),
            "recipient_id": employee_id,
            "title": "Responsibility Removed",
            "message": format!("You have been removed from: {}", responsibility_name),
            "timestamp": Utc::now().to_rfc3339(),
            "read": false,
            "data": {
                "responsibilityId": responsibility_id,
                "responsibilityName": responsibility_name,
                "removedBy": removed_by,
            }
        });

        // Log the notification
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                removed_by,
                "RESPONSIBILITY_NOTIFICATION",
                responsibility_id,
                "REMOVAL",
                notification.clone(),
            )
            .await;

        // Send email notification if enabled
        if self.email_service.is_enabled() {
            let _ = self
                .email_service
                .send_email(
                    &format!("employee_{}@school.com", employee_id),
                    "Responsibility Removed",
                    &format!("You have been removed from: {}", responsibility_name),
                )
                .await;
        }

        Ok(())
    }

    pub async fn send_space_removal_notification(
        &self,
        school_id: &str,
        responsibility_id: &str,
        responsibility_name: &str,
        space_ids: &[String],
        removed_by: &str,
    ) -> AppResult<()> {
        let notification = json!({
            "id": format!("NOTIF{}", Utc::now().timestamp_millis()),
            "type": ResponsibilityNotificationType::SpaceRemoved.as_str(),
            "title": "Spaces Removed from Responsibility",
            "message": format!("{} spaces have been removed from: {}", space_ids.len(), responsibility_name),
            "timestamp": Utc::now().to_rfc3339(),
            "read": false,
            "data": {
                "responsibilityId": responsibility_id,
                "responsibilityName": responsibility_name,
                "spaceIds": space_ids,
                "removedBy": removed_by,
            }
        });

        // Log the notification
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                removed_by,
                "RESPONSIBILITY_NOTIFICATION",
                responsibility_id,
                "SPACE_REMOVAL",
                notification.clone(),
            )
            .await;

        Ok(())
    }
}
