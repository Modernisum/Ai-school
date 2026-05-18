#![allow(dead_code)]
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStudentRequest {
    pub name: String,
    pub class_name: String,
    pub gender: String,
    pub dob: String,
    pub contact: String,
    pub email: String,
    pub aadhaar_number: String,
    pub father_name: String,
    pub mother_name: String,
    pub parent_name: String,
    pub parent_contact: String,
    pub address_line1: String,
    pub address_country_id: Option<i64>,
    pub address_country_code: Option<String>,
    pub address_phone_code: Option<String>,
    pub address_state_id: Option<i64>,
    pub address_state: String,
    pub address_district: Option<String>,
    pub address_city: String,
    pub address_pincode: String,
    pub alternative_contact: Option<String>,
    pub tc_number: Option<String>,
    pub admission_date: String,
    pub room_number: Option<String>,
    pub transport_enabled: bool,
    pub transport_radius: Option<f64>,
    pub student_type: String,
    pub enrolled_subjects: Option<serde_json::Value>,
    pub total_fee: f64,
    pub selected_subjects: Option<Vec<String>>,
    pub profile_image_url: String,
    pub blood_group: Option<String>,
    pub caste: Option<String>,
    pub medical_history: Option<String>,
    pub allergies: Option<String>,
    pub emergency_contact: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentResponse {
    pub student_id: String,
    pub school_id: String,
    pub name: Option<String>,
    pub class_name: String,
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
