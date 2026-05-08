use crate::error::AppResult;
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait AttendanceAnalyticsService: Send + Sync {
    /// Get advanced attendance statistics with flexible filtering
    async fn get_advanced_attendance_stats(
        &self,
        school_id: &str,
        query: crate::routes::attendance::AttendanceQuery,
    ) -> AppResult<Value>;

    /// Get attendance report for a specific student
    async fn get_student_report(
        &self,
        school_id: &str,
        student_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value>;

    /// Get class-wise attendance report
    async fn get_class_report(
        &self,
        school_id: &str,
        class_name: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value>;

    /// Get employee attendance report
    async fn get_employee_report(
        &self,
        school_id: &str,
        employee_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<Value>;

    /// Generate custom attendance report with filters
    async fn generate_custom_report(
        &self,
        school_id: &str,
        report_type: &str,
        start_date: &str,
        end_date: &str,
        filters: Value,
    ) -> AppResult<Value>;

    /// Calculate attendance percentage for a user over a period
    async fn calculate_attendance_percentage(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        start_date: &str,
        end_date: &str,
    ) -> AppResult<f64>;

    /// Identify attendance patterns (frequent absences, late arrivals, etc.)
    async fn identify_attendance_patterns(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        period_days: i32,
    ) -> AppResult<Value>;

    /// Get attendance trends over time (for charts)
    async fn get_attendance_trends(
        &self,
        school_id: &str,
        role: &str,
        period_type: &str, // "daily", "weekly", "monthly"
        period_count: i32, // Number of periods to look back
    ) -> AppResult<Value>;

    /// Export report to specified format
    async fn export_report(
        &self,
        school_id: &str,
        report_id: &str,
        format: &str, // "pdf", "excel", "csv"
    ) -> AppResult<Value>;

    /// Cache a generated report for future use
    async fn cache_report(
        &self,
        school_id: &str,
        report_type: &str,
        period_start: &str,
        period_end: &str,
        data: Value,
        metadata: Value,
    ) -> AppResult<String>; // Returns report ID

    /// Get cached report if available and not expired
    async fn get_cached_report(
        &self,
        school_id: &str,
        report_type: &str,
        period_start: &str,
        period_end: &str,
        filters_hash: &str,
    ) -> AppResult<Option<Value>>;
}