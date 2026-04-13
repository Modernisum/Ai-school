use serde::{Deserialize, Serialize};
use serde_json::Value;
use validator::Validate;

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct BulkAttendanceItem {
    #[validate(length(min = 1))]
    pub user_id: String,
    
    #[validate(length(min = 1))]
    pub status: String,
    
    pub in_time: Option<String>,
    pub out_time: Option<String>,
    pub reason: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct BulkAttendanceRequest {
    #[validate(length(min = 1))]
    pub school_id: String,
    
    #[validate(length(min = 1))]
    pub date: String,
    
    #[validate(length(min = 1))]
    pub role: String,
    
    #[validate(length(min = 1))]
    pub class_name: Option<String>,
    
    #[validate(length(min = 1))]
    pub attendances: Vec<BulkAttendanceItem>,
}

#[derive(Debug, Serialize)]
pub struct BulkAttendanceResponse {
    pub success: bool,
    pub message: String,
    pub total_records: usize,
    pub successful_records: usize,
    pub failed_records: usize,
    pub failures: Vec<BulkAttendanceFailure>,
}

#[derive(Debug, Serialize)]
pub struct BulkAttendanceFailure {
    pub user_id: String,
    pub error: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ImportAttendanceRequest {
    pub school_id: String,
    pub date: String,
    pub role: String,
    pub class_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ImportAttendanceResponse {
    pub success: bool,
    pub message: String,
    pub imported_count: usize,
    pub skipped_count: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AttendanceReportRequest {
    pub school_id: String,
    pub report_type: String, // "daily", "monthly", "custom"
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub month: Option<String>,
    pub year: Option<String>,
    pub class_name: Option<String>,
    pub role: Option<String>,
    pub format: Option<String>, // "pdf", "excel", "json"
}

#[derive(Debug, Serialize)]
pub struct AttendanceReportResponse {
    pub success: bool,
    pub message: String,
    pub report_id: Option<String>,
    pub download_url: Option<String>,
    pub summary: Value,
}