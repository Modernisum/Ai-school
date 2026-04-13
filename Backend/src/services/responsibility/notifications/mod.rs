pub mod assignment;
pub mod removal;
pub mod update;

pub use assignment::{AssignmentNotifier, ResponsibilityNotificationType as AssignmentNotificationType};
pub use removal::{RemovalNotifier, ResponsibilityNotificationType as RemovalNotificationType};
pub use update::{UpdateNotifier, ResponsibilityNotificationType as UpdateNotificationType};

use crate::error::{AppError, AppResult};
use crate::repository::Repositories;
use crate::logic::EmailService;
use serde_json::Value;
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

pub struct ResponsibilityNotificationService {
    repos: Arc<Repositories>,
    email_service: Arc<EmailService>,
    assignment: AssignmentNotifier,
    removal: RemovalNotifier,
    update: UpdateNotifier,
}

impl ResponsibilityNotificationService {
    pub fn new(repos: Arc<Repositories>, email_service: Arc<EmailService>) -> Self {
        let assignment = AssignmentNotifier::new(repos.clone(), email_service.clone());
        let removal = RemovalNotifier::new(repos.clone());
        let update = UpdateNotifier::new(repos.clone());
        Self {
            repos,
            email_service,
            assignment,
            removal,
            update,
        }
    }

    pub async fn send_assignment_notification(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
        responsibility_name: &str,
        assigned_by: &str,
    ) -> AppResult<()> {
        self.assignment
            .send_assignment_notification(
                school_id,
                employee_id,
                responsibility_id,
                responsibility_name,
                assigned_by,
            )
            .await
    }

    pub async fn send_removal_notification(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
        responsibility_name: &str,
        removed_by: &str,
    ) -> AppResult<()> {
        self.removal
            .send_removal_notification(
                school_id,
                employee_id,
                responsibility_id,
                responsibility_name,
                removed_by,
            )
            .await
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
        self.update
            .send_update_notification(
                school_id,
                responsibility_id,
                responsibility_name,
                field,
                old_value,
                new_value,
                updated_by,
            )
            .await
    }

    pub async fn send_space_assignment_notification(
        &self,
        school_id: &str,
        responsibility_id: &str,
        responsibility_name: &str,
        space_ids: &[String],
        assigned_by: &str,
    ) -> AppResult<()> {
        self.assignment
            .send_space_assignment_notification(
                school_id,
                responsibility_id,
                responsibility_name,
                space_ids,
                assigned_by,
            )
            .await
    }

    pub async fn send_space_removal_notification(
        &self,
        school_id: &str,
        responsibility_id: &str,
        responsibility_name: &str,
        space_ids: &[String],
        removed_by: &str,
    ) -> AppResult<()> {
        self.removal
            .send_space_removal_notification(
                school_id,
                responsibility_id,
                responsibility_name,
                space_ids,
                removed_by,
            )
            .await
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
        self.update
            .send_bulk_update_notification(
                school_id,
                responsibility_id,
                responsibility_name,
                employee_ids,
                action,
                performed_by,
            )
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_notification_type_as_str() {
        assert_eq!(ResponsibilityNotificationType::Assigned.as_str(), "responsibility_assigned");
        assert_eq!(ResponsibilityNotificationType::Removed.as_str(), "responsibility_removed");
        assert_eq!(ResponsibilityNotificationType::Updated.as_str(), "responsibility_updated");
        assert_eq!(ResponsibilityNotificationType::SpaceAssigned.as_str(), "space_assigned");
        assert_eq!(ResponsibilityNotificationType::SpaceRemoved.as_str(), "space_removed");
        assert_eq!(ResponsibilityNotificationType::BulkUpdate.as_str(), "bulk_update");
    }
}
