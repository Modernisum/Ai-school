use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait LeaveService: Send + Sync {
    // Core leave operations
    async fn create_leave(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn get_leaves(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn list_leaves(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn approve_leave(&self, school_id: &str, admin_id: &str, leave_id: i32) -> AppResult<()>;
    async fn reject_leave(&self, school_id: &str, admin_id: &str, leave_id: i32) -> AppResult<()>;
    async fn update_leave_status(
        &self,
        school_id: &str,
        admin_id: &str,
        leave_id: &str,
        status: &str,
    ) -> AppResult<()>;
    async fn update_leave_duration(
        &self,
        school_id: &str,
        admin_id: &str,
        leave_id: &str,
        action: &str,
        days: i32,
    ) -> AppResult<()>;
    async fn extend_leave(
        &self,
        school_id: &str,
        admin_id: &str,
        leave_id: i32,
        days: i32,
    ) -> AppResult<()>;
    async fn reduce_leave(
        &self,
        school_id: &str,
        admin_id: &str,
        leave_id: i32,
        days: i32,
    ) -> AppResult<()>;
    async fn download_leave_pdf(&self, school_id: &str, leave_id: i32) -> AppResult<Vec<u8>>;
    async fn get_proxy_suggestions(
        &self,
        school_id: &str,
        date: &str,
        period: &str,
        subject: Option<&str>,
    ) -> AppResult<Value>;

    // Enhanced leave system methods
    async fn get_leave_balance(&self, school_id: &str, employee_id: &str) -> AppResult<Value>;
    async fn get_leave_queue(&self, school_id: &str, filters: Value) -> AppResult<Vec<Value>>;
    async fn get_leave_details(&self, school_id: &str, leave_id: &str) -> AppResult<Value>;

    // Conditional approval methods
    async fn apply_conditional_approval(
        &self,
        school_id: &str,
        admin_id: &str,
        leave_id: &str,
        conditions: Value,
    ) -> AppResult<Value>;
    async fn respond_to_conditions(
        &self,
        school_id: &str,
        employee_id: &str,
        leave_id: &str,
        response: Value,
    ) -> AppResult<()>;
    async fn get_conditional_templates(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn create_conditional_template(
        &self,
        school_id: &str,
        admin_id: &str,
        template: Value,
    ) -> AppResult<Value>;

    // Responsibility coverage methods
    async fn assign_coverage(
        &self,
        school_id: &str,
        admin_id: &str,
        leave_id: &str,
        coverage_data: Value,
    ) -> AppResult<Value>;
    async fn get_available_coverages(
        &self,
        school_id: &str,
        leave_id: &str,
    ) -> AppResult<Vec<Value>>;
    async fn accept_coverage(
        &self,
        school_id: &str,
        employee_id: &str,
        coverage_id: &str,
    ) -> AppResult<()>;

    // Workload assessment methods
    async fn assess_workload(&self, school_id: &str, leave_id: &str) -> AppResult<Value>;
    async fn get_workload_assessment(&self, school_id: &str, leave_id: &str) -> AppResult<Value>;

    // Notification methods
    async fn get_notifications(
        &self,
        school_id: &str,
        recipient_id: &str,
        unread_only: bool,
    ) -> AppResult<Vec<Value>>;
    async fn mark_notification_read(&self, school_id: &str, notification_id: &str)
        -> AppResult<()>;

    // Feature flag methods
    async fn get_feature_flags(&self, school_id: &str) -> AppResult<Value>;
    async fn update_feature_flags(
        &self,
        school_id: &str,
        admin_id: &str,
        flags: Value,
    ) -> AppResult<()>;
}
