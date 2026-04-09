// Responsibility Permissions Module
// Defines permission constants and validation for responsibility operations

use crate::error::AppError;

#[derive(Debug, Clone, PartialEq)]
pub enum ResponsibilityPermission {
    // Management Permissions
    CreateResponsibility,
    UpdateResponsibility,
    DeleteResponsibility,
    ViewResponsibility,
    
    // Assignment Permissions
    AssignEmployee,
    RemoveEmployee,
    BulkAssignEmployees,
    BulkRemoveEmployees,
    
    // Space Management
    AssignSpace,
    RemoveSpace,
    
    // Analytics Permissions
    ViewAnalytics,
    ExportData,
    
    // History Permissions
    ViewHistory,
    RollbackChanges,
}

impl ResponsibilityPermission {
    pub fn as_str(&self) -> &'static str {
        match self {
            ResponsibilityPermission::CreateResponsibility => "responsibility:create",
            ResponsibilityPermission::UpdateResponsibility => "responsibility:update",
            ResponsibilityPermission::DeleteResponsibility => "responsibility:delete",
            ResponsibilityPermission::ViewResponsibility => "responsibility:view",
            ResponsibilityPermission::AssignEmployee => "responsibility:assign_employee",
            ResponsibilityPermission::RemoveEmployee => "responsibility:remove_employee",
            ResponsibilityPermission::BulkAssignEmployees => "responsibility:bulk_assign_employees",
            ResponsibilityPermission::BulkRemoveEmployees => "responsibility:bulk_remove_employees",
            ResponsibilityPermission::AssignSpace => "responsibility:assign_space",
            ResponsibilityPermission::RemoveSpace => "responsibility:remove_space",
            ResponsibilityPermission::ViewAnalytics => "responsibility:view_analytics",
            ResponsibilityPermission::ExportData => "responsibility:export_data",
            ResponsibilityPermission::ViewHistory => "responsibility:view_history",
            ResponsibilityPermission::RollbackChanges => "responsibility:rollback",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "responsibility:create" => Some(ResponsibilityPermission::CreateResponsibility),
            "responsibility:update" => Some(ResponsibilityPermission::UpdateResponsibility),
            "responsibility:delete" => Some(ResponsibilityPermission::DeleteResponsibility),
            "responsibility:view" => Some(ResponsibilityPermission::ViewResponsibility),
            "responsibility:assign_employee" => Some(ResponsibilityPermission::AssignEmployee),
            "responsibility:remove_employee" => Some(ResponsibilityPermission::RemoveEmployee),
            "responsibility:bulk_assign_employees" => Some(ResponsibilityPermission::BulkAssignEmployees),
            "responsibility:bulk_remove_employees" => Some(ResponsibilityPermission::BulkRemoveEmployees),
            "responsibility:assign_space" => Some(ResponsibilityPermission::AssignSpace),
            "responsibility:remove_space" => Some(ResponsibilityPermission::RemoveSpace),
            "responsibility:view_analytics" => Some(ResponsibilityPermission::ViewAnalytics),
            "responsibility:export_data" => Some(ResponsibilityPermission::ExportData),
            "responsibility:view_history" => Some(ResponsibilityPermission::ViewHistory),
            "responsibility:rollback" => Some(ResponsibilityPermission::RollbackChanges),
            _ => None,
        }
    }
}

pub fn check_permission(
    required_permission: &ResponsibilityPermission,
    user_permissions: &[String],
) -> bool {
    let permission_str = required_permission.as_str();
    user_permissions.iter().any(|p| p == permission_str)
}

pub fn require_permission(
    required_permission: &ResponsibilityPermission,
    user_permissions: &[String],
) -> Result<(), AppError> {
    let permission_str = required_permission.as_str();
    if !check_permission(required_permission, user_permissions) {
        return Err(AppError::Forbidden(format!(
            "Permission denied. Required: {}",
            permission_str
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_as_str() {
        assert_eq!(ResponsibilityPermission::CreateResponsibility.as_str(), "responsibility:create");
        assert_eq!(ResponsibilityPermission::ViewAnalytics.as_str(), "responsibility:view_analytics");
    }

    #[test]
    fn test_from_str() {
        assert_eq!(
            ResponsibilityPermission::from_str("responsibility:create"),
            Some(ResponsibilityPermission::CreateResponsibility)
        );
        assert_eq!(ResponsibilityPermission::from_str("invalid"), None);
    }

    #[test]
    fn test_check_permission() {
        let permissions = vec!["responsibility:create".to_string(), "responsibility:view".to_string()];
        assert!(check_permission(&ResponsibilityPermission::CreateResponsibility, &permissions));
        assert!(!check_permission(&ResponsibilityPermission::DeleteResponsibility, &permissions));
    }
}
