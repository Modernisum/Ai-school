#![allow(dead_code)]
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStudentRequest {
    pub name: String,
    #[serde(default)]
    pub space_id: String,
    #[serde(default)]
    pub class_name: String,
    #[serde(default)]
    pub gender: String,
    #[serde(default)]
    pub dob: String,
    #[serde(default)]
    pub contact: String,
    #[serde(default)]
    pub email: String,
    #[serde(default)]
    pub aadhaar_number: String,
    #[serde(default)]
    pub father_name: String,
    #[serde(default)]
    pub mother_name: String,
    #[serde(default)]
    pub parent_name: String,
    #[serde(default)]
    pub parent_contact: String,
    #[serde(default)]
    pub address_line1: String,
    #[serde(default)]
    pub address_country_id: Option<i64>,
    #[serde(default)]
    pub address_country_code: Option<String>,
    #[serde(default)]
    pub address_phone_code: Option<String>,
    #[serde(default)]
    pub address_state_id: Option<i64>,
    #[serde(default)]
    pub address_state: String,
    #[serde(default)]
    pub address_district: Option<String>,
    #[serde(default)]
    pub address_city: String,
    #[serde(default)]
    pub address_pincode: String,
    #[serde(default)]
    pub alternative_contact: Option<String>,
    #[serde(default)]
    pub tc_number: Option<String>,
    #[serde(default)]
    pub admission_date: String,
    #[serde(default)]
    pub room_number: Option<String>,
    #[serde(default)]
    pub transport_enabled: bool,
    #[serde(default)]
    pub transport_radius: Option<f64>,
    #[serde(default)]
    pub student_type: String,
    #[serde(default)]
    pub enrolled_subjects: Option<serde_json::Value>,
    #[serde(default)]
    pub total_fee: f64,
    #[serde(default)]
    pub selected_subjects: Option<Vec<String>>,
    #[serde(default)]
    pub profile_image_url: String,
    #[serde(default)]
    pub blood_group: Option<String>,
    #[serde(default)]
    pub caste: Option<String>,
    #[serde(default)]
    pub medical_history: Option<String>,
    #[serde(default)]
    pub allergies: Option<String>,
    #[serde(default)]
    pub emergency_contact: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentResponse {
    pub student_id: String,
    pub school_id: String,
    pub name: Option<String>,
    pub space_id: String,
    pub roll_number: i32,
    pub section: String,
    pub gender: Option<String>,
    pub dob: Option<String>,
    pub contact: Option<String>,
    pub address: Option<String>,
    pub parent_name: Option<String>,
    pub parent_contact: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmployeeResponsibility {
    pub space_id: String,
    pub role_ids: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEmployeeRequest {
    pub name: String,
    pub father_name: String,
    pub mother_name: String,
    pub dob: String,
    pub age: Option<i32>,
    pub gender: String,
    pub category: String,
    pub employee_type: String,
    pub base_salary: f64,
    pub email: String,
    pub phone: String,
    pub alternative_contact: String,
    #[serde(rename = "permanent address")]
    pub permanent_address: String,
    pub temporary_address: String,
    pub experience: Vec<serde_json::Value>,
    pub education: Vec<serde_json::Value>,
    pub aadhaar_number: String,
    pub responsibilities: Vec<EmployeeResponsibility>,
    pub bank_details: Option<serde_json::Value>,
    pub profile_image_url: Option<String>,
    pub roles: Option<Vec<serde_json::Value>>,
    pub blood_group: Option<String>,
    pub emergency_contact: Option<String>,
    pub bank_account_number: Option<String>,
    pub bank_ifsc_code: Option<String>,
    pub experience_status: Option<String>,
    pub experience_years: Option<i32>,
    pub previous_school: Option<String>,
    pub experience_increment_percent: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmployeeResponse {
    pub employee_id: String,
    pub school_id: String,
    pub name: String,
    pub employee_type: String,
    pub base_salary: Option<f64>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentListQuery {
    pub section: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentPaginatedQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub space_id: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct StudentSearchParams {
    pub search: Option<String>,
    pub class_name: Option<String>,
    pub section: Option<String>,
    pub status: Option<String>,
    pub page: Option<i32>,
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct EmployeeSearchParams {
    pub search: Option<String>,
    pub employee_type: Option<String>,
}

