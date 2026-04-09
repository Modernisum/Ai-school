use crate::error::{AppError, AppResult};
use crate::repository::Repositories;
use serde_json::{json, Value};
use chrono::Utc;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub enum ResponsibilityNotificationType {
    Assigned,
    Removed,
    Updated,
    SpaceAssigned,
    SpaceRemoved,
    BulkUpdate,
}

impl ResponsibilityNotificationType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ResponsibilityNotificationType::Assigned => "responsibility_assigned",
            ResponsibilityNotificationType::Removed => "responsibility_removed",
            ResponsibilityNotificationType::Updated => "responsibility_updated",
            ResponsibilityNotificationType::SpaceAssigned => "space_assigned",
            ResponsibilityNotificationType::SpaceRemoved => "space_removed",
            ResponsibilityNotificationType::BulkUpdate => "bulk_update",
        }
    }
}

pub struct AssignmentNotifier {
    repos: Arc<Repositories>,
}

impl AssignmentNotifier {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn send_assignment_notification(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
        responsibility_name: &str,
        assigned_by: &str,
    ) -> AppResult<()> {
        let notification = json!({
            "id": format!("NOTIF{}", Utc::now().timestamp_millis()),
            "type": ResponsibilityNotificationType::Assigned.as_str(),
            "recipient_id": employee_id,
            "title": "New Responsibility Assigned",
            "message": format!("You have been assigned to: {}", responsibility_name),
            "timestamp": Utc::now().to_rfc3339(),
            "read": false,
            "data": {
                "responsibilityId": responsibility_id,
                "responsibilityName": responsibility_name,
                "assignedBy": assigned_by,
            }
        });

        // Log the notification
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                assigned_by,
                "RESPONSIBILITY_NOTIFICATION",
                responsibility_id,
                "ASSIGNMENT",
                notification.clone(),
            )
            .await;

        // TODO: Send email notification if enabled
        // self.send_email_notification(employee_id, &notification).await;

        Ok(())
    }

    pub async fn send_space_assignment_notification(
        &self,
        school_id: &str,
        responsibility_id: &str,
        responsibility_name: &str,
        space_ids: &[String],
        assigned_by: &str,
    ) -> AppResult<()> {
        let notification = json!({
            "id": format!("NOTIF{}", Utc::now().timestamp_millis()),
            "type": ResponsibilityNotificationType::SpaceAssigned.as_str(),
            "title": "Spaces Assigned to Responsibility",
            "message": format!("{} spaces have been assigned to: {}", space_ids.len(), responsibility_name),
            "timestamp": Utc::now().to_rfc3339(),
            "read": false,
            "data": {
                "responsibilityId": responsibility_id,
                "responsibilityName": responsibility_name,
                "spaceIds": space_ids,
                "assignedBy": assigned_by,
            }
        });

        // Log the notification
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                assigned_by,
                "RESPONSIBILITY_NOTIFICATION",
                responsibility_id,
                "SPACE_ASSIGNMENT",
                notification.clone(),
            )
            .await;

        Ok(())
    }
}
