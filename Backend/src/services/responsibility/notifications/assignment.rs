use crate::error::{AppError, AppResult};
use crate::repository::Repositories;
use crate::logic::EmailService;
use serde_json::{json, Value};
use chrono::{Utc, Datelike};
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
    email_service: Arc<EmailService>,
}

impl AssignmentNotifier {
    pub fn new(repos: Arc<Repositories>, email_service: Arc<EmailService>) -> Self {
        Self { repos, email_service }
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

        // Send email notification if enabled
        if let Err(e) = self.send_email_notification(school_id, employee_id, responsibility_name, assigned_by).await {
            // Log email failure but don't fail the whole operation
            let _ = self
                .repos
                .audit
                .log_action(
                    school_id,
                    assigned_by,
                    "EMAIL_NOTIFICATION",
                    responsibility_id,
                    "FAILED",
                    json!({"error": e.to_string()}),
                )
                .await;
        }

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

    async fn send_email_notification(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_name: &str,
        assigned_by: &str,
    ) -> AppResult<()> {
        // Get employee email from repository
        let employee: Option<serde_json::Value> = self.repos.employee.get_employee(school_id, employee_id).await?;
        
        let email = match employee.as_ref().and_then(|e| e.get("email")).and_then(|v| v.as_str()) {
            Some(email) if !email.is_empty() => email,
            _ => {
                // No email found, skip sending
                return Ok(());
            }
        };

        let subject = format!("New Responsibility Assigned: {}", responsibility_name);
        
        let html_body = format!(
            r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>New Responsibility Assignment</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }}
        .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; }}
        .button {{ display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Responsibility Assigned</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>You have been assigned a new responsibility: <strong>{}</strong>.</p>
            <p>This responsibility was assigned by: <strong>{}</strong>.</p>
            <p>You can view and manage your responsibilities in the Vidhyam employee portal.</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="https://app.vidhyam.com/employee/responsibilities" class="button">View Responsibilities</a>
            </p>
            <p>If you have any questions about this assignment, please contact your administrator.</p>
            <p>Best regards,<br>The Vidhyam Team</p>
        </div>
        <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>© {} Vidhyam School Management System</p>
        </div>
    </div>
</body>
</html>"#,
            responsibility_name,
            assigned_by,
            chrono::Utc::now().year()
        );

        // Send HTML email
        self.email_service
            .send_html_email(email, &subject, &html_body, None)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to send email: {}", e)))?;

        Ok(())
    }
}
