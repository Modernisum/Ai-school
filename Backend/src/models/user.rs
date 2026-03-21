#![allow(dead_code)]
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStudentRequest {
    pub name: Option<String>,
    pub class_name: String,
    pub gender: Option<String>,
    pub dob: Option<String>,
    pub contact: Option<String>,
    pub email: Option<String>,
    pub aadhaar_number: Option<String>,
    pub father_name: Option<String>,
    pub mother_name: Option<String>,
    pub address_line1: Option<String>,
    pub address_country_id: Option<i64>,
    pub address_country_code: Option<String>,
    pub address_phone_code: Option<String>,
    pub address_state_id: Option<i64>,
    pub address_state: Option<String>,
    pub address_district: Option<String>,
    pub address_city: Option<String>,
    pub address_pincode: Option<String>,
    pub parent_name: Option<String>,
    pub parent_contact: Option<String>,
    pub alternative_contact: Option<String>,
    pub tc_number: Option<String>,
    pub admission_date: Option<String>,
    pub room_number: Option<String>,
    pub transport_enabled: Option<bool>,
    pub transport_radius: Option<f64>,
    pub student_type: Option<String>,
    pub enrolled_subjects: Option<serde_json::Value>,
    pub total_fee: Option<f64>,
    pub selected_subjects: Option<Vec<String>>,
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
pub struct CreateEmployeeRequest {
    pub name: String,
    pub employee_id: Option<String>,
    pub father_name: Option<String>,
    pub mother_name: Option<String>,
    pub dob: Option<String>,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub category: Option<String>,
    pub blood_group: Option<String>,
    pub employee_type: String,
    pub base_salary: Option<f64>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub emergency_contact: Option<String>,
    pub subject: Option<String>,
    pub department: Option<String>,
    pub address: Option<String>,
    pub temporary_address: Option<String>,
    pub experience: Option<Vec<serde_json::Value>>,
    pub education: Option<Vec<serde_json::Value>>,
    pub aadhaar_number: Option<String>,
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
