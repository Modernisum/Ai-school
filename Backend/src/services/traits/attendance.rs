use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait AttendanceService: Send + Sync {
    async fn mark_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn mark_holiday(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn update_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn delete_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
        admin_id: &str,
    ) -> AppResult<()>;
    async fn list_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
    ) -> AppResult<Vec<Value>>;
    async fn list_attendance_by_date(&self, school_id: &str, date: &str) -> AppResult<Vec<String>>;

    // School-level Holidays
    async fn list_school_holidays(
        &self,
        school_id: &str,
        month: Option<i32>,
        year: Option<i32>,
    ) -> AppResult<Vec<Value>>;
    async fn get_holiday_detail(&self, school_id: &str, holiday_id: &str) -> AppResult<Value>;
    async fn create_school_holiday(&self, school_id: &str, data: Value) -> AppResult<Value>;
    async fn delete_school_holiday(&self, school_id: &str, holiday_id: &str) -> AppResult<()>;
    async fn check_school_holiday(&self, school_id: &str, date: &str) -> AppResult<Value>;
}
