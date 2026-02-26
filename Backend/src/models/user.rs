use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStudentRequest {
    pub name: Option<String>,
    pub class_name: String,
    pub gender: Option<String>,
    pub dob: Option<String>,
    pub contact: Option<String>,
    pub address: Option<String>,
    pub parent_name: Option<String>,
    pub parent_contact: Option<String>,
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
    pub employee_type: String,
    pub base_salary: Option<f64>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub subject: Option<String>,
    pub department: Option<String>,
    pub address: Option<String>,
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
