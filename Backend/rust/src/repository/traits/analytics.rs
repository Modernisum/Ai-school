use async_trait::async_trait;
use serde_json::Value;

use super::{AppError, JsonList};

#[async_trait]
pub trait AnalyticsRepository: Send + Sync {
    async fn get_school_stats(&self, school_id: &str) -> Result<Value, AppError>;
    async fn get_attendance_summary(&self, school_id: &str, date: &str) -> Result<Value, AppError>;
    async fn get_pending_fees_by_period(
        &self,
        school_id: &str,
        months_overdue: i32,
    ) -> Result<JsonList, AppError>;
    async fn get_fee_summary(&self, school_id: &str) -> Result<Value, AppError>;
    async fn query_staff_analytics(&self, school_id: &str) -> Result<Value, AppError>;

    async fn get_student_attendance_report(
        &self,
        school_id: &str,
        student_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> Result<Value, AppError>;

    async fn get_class_attendance_report(
        &self,
        school_id: &str,
        class_name: &str,
        start_date: &str,
        end_date: &str,
    ) -> Result<Value, AppError>;

    async fn get_filtered_attendance(
        &self,
        school_id: &str,
        start_date: &str,
        end_date: &str,
        user_type: Option<&str>,
        class_name: Option<&str>,
        user_ids: Option<&str>,
    ) -> Result<Vec<Value>, AppError>;
}
