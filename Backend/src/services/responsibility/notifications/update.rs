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

pub struct UpdateNotifier {
    repos: Arc<Repositories>,
}

impl UpdateNotifier {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn send_update_notification(
        &self,
        school_id: &str,
        responsibility_id: &str,
        responsibility_name: &str,
        field: &str,
        old_value: Value,
        new_value: Value,
        updated_by: &str,
    ) -> AppResult<()> {
        let notification = json!({
            "id": format!("NOTIF{}", Utc::now().timestamp_millis()),
            "type": ResponsibilityNotificationType::Updated.as_str(),
            "title": "Responsibility Updated",
            "message": format!("{} has been updated", responsibility_name),
            "timestamp": Utc::now().to_rfc3339(),
            "read": false,
            "data": {
                "responsibilityId": responsibility_id,
                "responsibilityName": responsibility_name,
                "field": field,
                "oldValue": old_value,
                "newValue": new_value,
                "updatedBy": updated_by,
            }
        });

        // Log the notification
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                updated_by,
                "RESPONSIBILITY_NOTIFICATION",
                responsibility_id,
                "UPDATE",
                notification.clone(),
            )
            .await;

        // TODO: Send email notification to affected employees
        // self.send_bulk_email_notification(affected_employees, &notification).await;

        Ok(())
    }

    pub async fn send_bulk_update_notification(
        &self,
        school_id: &str,
        responsibility_id: &str,
        responsibility_name: &str,
        employee_ids: &[String],
        action: &str,
        performed_by: &str,
    ) -> AppResult<()> {
        let notification = json!({
            "id": format!("NOTIF{}", Utc::now().timestamp_millis()),
            "type": ResponsibilityNotificationType::BulkUpdate.as_str(),
            "title": format!("Bulk Responsibility {}", action),
            "message": format!("{} employees have been {} to: {}", employee_ids.len(), action, responsibility_name),
            "timestamp": Utc::now().to_rfc3339(),
            "read": false,
            "data": {
                "responsibilityId": responsibility_id,
                "responsibilityName": responsibility_name,
                "employeeIds": employee_ids,
                "action": action,
                "performedBy": performed_by,
            }
        });

        // Log the notification
        let _ = self
            .repos
            .audit
            .log_action(
                school_id,
                performed_by,
                "RESPONSIBILITY_NOTIFICATION",
                responsibility_id,
                "BULK_UPDATE",
                notification.clone(),
            )
            .await;

        // Send individual notifications to each employee
        for employee_id in employee_ids {
            let employee_notification = json!({
                "id": format!("NOTIF{}", Utc::now().timestamp_millis()),
                "type": ResponsibilityNotificationType::BulkUpdate.as_str(),
                "recipient_id": employee_id,
                "title": format!("Responsibility {}", action),
                "message": format!("You have been {} to: {}", action, responsibility_name),
                "timestamp": Utc::now().to_rfc3339(),
                "read": false,
                "data": {
                    "responsibilityId": responsibility_id,
                    "responsibilityName": responsibility_name,
                    "action": action,
                    "performedBy": performed_by,
                }
            });

            let _ = self
                .repos
                .audit
                .log_action(
                    school_id,
                    performed_by,
                    "RESPONSIBILITY_NOTIFICATION",
                    employee_id,
                    "BULK_UPDATE_INDIVIDUAL",
                    employee_notification.clone(),
                )
                .await;

            // TODO: Send email notification to employee
            // self.send_email_notification(employee_id, &employee_notification).await;
        }

        Ok(())
    }

    // TODO: Implement email notification service
    // async fn send_email_notification(&self, recipient_id: &str, notification: &Value) -> AppResult<()> {
    //     // Get employee email from database
    //     // Send email using SMTP service
    //     Ok(())
    // }

    // async fn send_bulk_email_notification(&self, recipient_ids: &[String], notification: &Value) -> AppResult<()> {
    //     for recipient_id in recipient_ids {
    //         self.send_email_notification(recipient_id, notification).await?;
    //     }
    //     Ok(())
    // }
}
