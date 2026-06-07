use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct HolidayQuery {
    pub month: Option<i32>,
    pub year: Option<i32>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DateQuery {
    pub date: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct BulkAttendanceRequest {
    pub date: String,
    pub role: String,
    pub class_name: Option<String>,
    pub attendances: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ClassAttendanceQuery {
    pub class_name: String,
    pub date: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AttendanceQuery {
    pub date: Option<String>,
    pub period: Option<String>, // day, week, month, year
    pub incoming_after: Option<String>,
    pub outgoing_before: Option<String>,
    pub user_type: Option<String>,
    pub class_name: Option<String>,
    pub space_name: Option<String>,
    pub user_ids: Option<String>, // comma separated
    pub fields: Option<String>,   // comma separated fields to return (e.g., "user_id,name,image_url")
}

#[derive(Debug, Deserialize, Serialize)]
pub struct StudentReportQuery {
    pub student_id: String,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ClassReportQuery {
    pub class_name: String,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct EmployeeReportQuery {
    pub employee_id: String,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CustomReportQuery {
    pub report_type: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default)]
    pub filters: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct QrAttendanceRequest {
    pub school_id: String,
    pub class_id: Option<String>,
    pub session_id: Option<String>,
    pub expires_in_minutes: Option<u32>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct MobileAttendanceRequest {
    pub token: String,
    pub user_id: String,
    pub role: String,
    pub latitude: f64,
    pub longitude: f64,
    pub device_id: Option<String>,
    pub accuracy: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OfflineAttendanceRecord {
    pub user_id: String,
    pub role: String,
    pub date: String,
    pub status: String,
    pub in_time: Option<String>,
    pub out_time: Option<String>,
    pub reason: Option<String>,
    pub location: Option<serde_json::Value>,
    pub device_id: Option<String>,
    pub sync_timestamp: Option<i64>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OfflineSyncRequest {
    pub records: Vec<OfflineAttendanceRecord>,
    pub device_id: String,
    pub sync_timestamp: i64,
}