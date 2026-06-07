use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait AttendanceRepository: Send + Sync {
    async fn mark_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn get_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
    ) -> Result<JsonList, AppError>;
    async fn delete_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
    ) -> Result<(), AppError>;
    async fn add_attendance_history(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), AppError>;
    
    // Bulk operations
    async fn bulk_mark_attendance(
        &self,
        school_id: &str,
        role: &str,
        date: &str,
        class_name: Option<&str>,
        attendances: Vec<(String, Value)>,
    ) -> Result<(usize, Vec<(String, String)>), AppError>;
    
    async fn get_class_attendance(
        &self,
        school_id: &str,
        class_name: &str,
        date: &str,
    ) -> Result<JsonList, AppError>;

    async fn insert_holiday(
        &self,
        id: &str,
        school_id: &str,
        title: &str,
        description: &str,
        from_date: &str,
        to_date: &str,
        classes: Value,
        exempt_employees: Value,
        exempt_students: Value,
        created_at: &str,
    ) -> Result<(), AppError>;

    async fn delete_holiday(&self, school_id: &str, holiday_id: &str) -> Result<(), AppError>;

    async fn get_holiday(&self, school_id: &str, holiday_id: &str) -> Result<Option<Value>, AppError>;

    async fn list_holidays(&self, school_id: &str, start_date: &str, end_date: &str) -> Result<JsonList, AppError>;

    async fn check_holiday(&self, school_id: &str, date: &str) -> Result<Option<Value>, AppError>;

    async fn get_attendance_for_date(
        &self,
        school_id: &str,
        date: &str,
    ) -> Result<JsonList, AppError>;

    async fn auto_assign_teachers_for_attendance(
        &self,
        school_id: &str,
        date: &str,
        day_of_week: i32,
    ) -> Result<Vec<Value>, AppError>;

    async fn get_attendance_health_metrics(
        &self,
        school_id: &str,
    ) -> Result<Value, AppError>;

    async fn get_student_ids_with_attendance_for_date(
        &self,
        school_id: &str,
        date: &str,
    ) -> Result<Vec<String>, AppError>;

    async fn get_unmarked_students_for_date(
        &self,
        school_id: &str,
        date: &str,
    ) -> Result<Vec<(String, String)>, AppError>;

    async fn get_daily_attendance_report_stats(
        &self,
        school_id: &str,
        date: &str,
    ) -> Result<(i64, i64, i64), AppError>;

    async fn get_unmarked_count_stats(
        &self,
        school_id: &str,
        date: &str,
        role: &str,
    ) -> Result<(i64, i64), AppError>;

    async fn create_qr_token(
        &self,
        school_id: &str,
        class_id: Option<&str>,
        token: &str,
        expires_at: chrono::DateTime<chrono::Utc>,
        created_by: &str,
    ) -> Result<(), AppError>;

    async fn verify_and_use_qr_token(
        &self,
        school_id: &str,
        token: &str,
        used_by: &str,
    ) -> Result<bool, AppError>;
}

