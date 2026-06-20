use crate::error::{AppError, AppResult};
use crate::logic::EmailService;
use crate::repository::Repositories;
use serde_json::{json, Value};
use chrono::{Utc, Datelike};
use std::sync::Arc;

use super::ResponsibilityNotificationType;

pub struct UpdateNotifier {
    repos: Arc<Repositories>,
    email_service: Arc<EmailService>,
}

impl UpdateNotifier {
    pub fn new(repos: Arc<Repositories>, email_service: Arc<EmailService>) -> Self {
        Self { repos, email_service }
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

        // Send email notification for critical updates
        if field != "description" && self.email_service.is_enabled() {
            let _ = self
                .email_service
                .send_email(
                    "admin@school.com",
                    &format!("Responsibility Updated: {}", responsibility_name),
                    &format!("Field '{}' was updated for responsibility '{}'.\nOld value: {}\nNew value: {}\nUpdated by: {}",
                        field, responsibility_name, old_value, new_value, updated_by),
                )
                .await;
        }

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

            // Send email notification if enabled
            if self.email_service.is_enabled() {
                let _ = self
                    .email_service
                    .send_email(
                        &format!("employee_{}@school.com", employee_id),
                        &format!("Responsibility {}", action),
                        &format!("You have been {} to: {}", action, responsibility_name),
                    )
                    .await;
            }
        }

        Ok(())
    }

    }
