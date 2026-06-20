use crate::models::people::CreateEmployeeRequest;
use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json, Extension
};
use crate::middleware::rls::TenantContext;
use serde_json::json;
use chrono::Datelike;

pub async fn create_employee(
    State(state): State<AppState>,
    Extension(t_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<CreateEmployeeRequest>,
) -> impl IntoResponse {
    let dob_str = payload.dob.clone();
    let calculated_age = if payload.age.is_none() {
        if let Ok(dob) = chrono::NaiveDate::parse_from_str(&dob_str, "%Y-%m-%d") {
            let now = chrono::Utc::now().naive_utc().date();
            let mut age = now.year() - dob.year();
            if now.ordinal() < dob.ordinal() {
                age -= 1;
            }
            Some(age)
        } else {
            None
        }
    } else {
        payload.age
    };

    let emp_data = json!({
        "name": payload.name,
        "fatherName": payload.father_name,
        "motherName": payload.mother_name,
        "dob": dob_str,
        "age": calculated_age,
        "gender": payload.gender,
        "category": payload.category,
        "employeeType": payload.employee_type,
        "baseSalary": payload.base_salary,
        "email": payload.email,
        "phone": payload.phone,
        "alternativeContact": payload.alternative_contact,
        "permanent address": payload.permanent_address,
        "temporaryAddress": payload.temporary_address,
        "experience": payload.experience,
        "education": payload.education,
        "aadhaarNumber": payload.aadhaar_number,
        "responsibilities": payload.responsibilities,
        "bankDetails": payload.bank_details,
        "profileImageUrl": payload.profile_image_url,
        "roles": payload.roles,
        "bloodGroup": payload.blood_group,
        "emergencyContact": payload.emergency_contact,
        "bankAccountNumber": payload.bank_account_number,
        "bankIfscCode": payload.bank_ifsc_code,
        "experienceStatus": payload.experience_status,
        "experienceYears": payload.experience_years,
        "previousSchool": payload.previous_school,
        "experienceIncrementPercent": payload.experience_increment_percent,
    });

    match state
        .services
        .employee
        .create_employee(&school_id, &t_ctx.admin_id, emp_data)
        .await
    {
        Ok(data) => Json(json!({"success": true, "employee": data})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

#[allow(dead_code)]
pub async fn bulk_create_employees(
    State(state): State<AppState>,
    Extension(t_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<Vec<serde_json::Value>>,
) -> impl IntoResponse {
    match state
        .services
        .employee
        .bulk_create_employees(&school_id, &t_ctx.admin_id, payload)
        .await
    {
        Ok(data) => {
            Json(json!({"success": true, "message": "Bulk import completed", "data": data}))
                .into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn list_employees(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
) -> impl IntoResponse {
    match state.services.employee.list_employees(&school_id).await {
        Ok(employees) => Json(json!({"success": true, "employees": employees})).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn get_employee(
    State(state): State<AppState>,
    Path((school_id, employee_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .employee
        .get_employee(&school_id, &employee_id)
        .await
    {
        Ok(Some(employee)) => Json(json!({"success": true, "employee": employee})).into_response(),
        Ok(None) => (
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({"success": false, "message": "Employee not found"})),
        )
            .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn update_employee(
    State(state): State<AppState>,
    Extension(t_ctx): Extension<TenantContext>,
    Path((school_id, employee_id)): Path<(String, String)>,
    Json(payload): Json<CreateEmployeeRequest>,
) -> impl IntoResponse {
    let dob_str = payload.dob.clone();
    let calculated_age = if payload.age.is_none() {
        if let Ok(dob) = chrono::NaiveDate::parse_from_str(&dob_str, "%Y-%m-%d") {
            let now = chrono::Utc::now().naive_utc().date();
            let mut age = now.year() - dob.year();
            if now.ordinal() < dob.ordinal() {
                age -= 1;
            }
            Some(age)
        } else {
            None
        }
    } else {
        payload.age
    };

    let emp_data = json!({
        "name": payload.name,
        "fatherName": payload.father_name,
        "motherName": payload.mother_name,
        "dob": dob_str,
        "age": calculated_age,
        "gender": payload.gender,
        "category": payload.category,
        "employeeType": payload.employee_type,
        "baseSalary": payload.base_salary,
        "email": payload.email,
        "phone": payload.phone,
        "alternativeContact": payload.alternative_contact,
        "permanent address": payload.permanent_address,
        "temporaryAddress": payload.temporary_address,
        "experience": payload.experience,
        "education": payload.education,
        "aadhaarNumber": payload.aadhaar_number,
        "responsibilities": payload.responsibilities,
        "bankDetails": payload.bank_details,
        "profileImageUrl": payload.profile_image_url,
        "roles": payload.roles,
        "bloodGroup": payload.blood_group,
        "emergencyContact": payload.emergency_contact,
        "bankAccountNumber": payload.bank_account_number,
        "bankIfscCode": payload.bank_ifsc_code,
        "experienceStatus": payload.experience_status,
        "experienceYears": payload.experience_years,
        "previousSchool": payload.previous_school,
        "experienceIncrementPercent": payload.experience_increment_percent,
    });

    match state
        .services
        .employee
        .update_employee(&school_id, &employee_id, &t_ctx.admin_id, emp_data)
        .await
    {
        Ok(_) => Json(json!({"success": true, "message": "Employee updated successfully"}))
            .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn delete_employee(
    State(state): State<AppState>,
    Extension(t_ctx): Extension<TenantContext>,
    Path((school_id, employee_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .employee
        .delete_employee(&school_id, &employee_id, &t_ctx.admin_id)
        .await
    {
        Ok(_) => Json(json!({"success": true, "message": "Employee deleted successfully"}))
            .into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}

// POST /api/employees/:schoolId/bulk
pub async fn bulk_import_employees(
    State(state): State<AppState>,
    Extension(t_ctx): Extension<TenantContext>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let rows = match payload["employees"].as_array().or(payload.as_array()) {
        Some(r) => r.clone(),
        None => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(json!({"success": false, "message": "Expected an 'employees' array"})),
            )
                .into_response();
        }
    };

    let mut results = Vec::new();
    let mut success_count = 0usize;
    let mut fail_count = 0usize;

    for (i, row) in rows.iter().enumerate() {
        let emp_data = json!({
            "name": row.get("Name").or(row.get("name")).unwrap_or(&serde_json::Value::Null),
            "employeeType": row.get("employeeType").or(row.get("employee_type")).or(row.get("Type")).or(row.get("type")).unwrap_or(&serde_json::Value::Null),
            "email": row.get("Email").or(row.get("email")).unwrap_or(&serde_json::Value::Null),
            "phone": row.get("Phone Number").or(row.get("phone")).or(row.get("Phone")).or(row.get("phone_number")).unwrap_or(&serde_json::Value::Null),
            "alternativeContact": row.get("Alternative Contact").or(row.get("alternative_contact")).or(row.get("alternativeContact")).unwrap_or(&serde_json::Value::Null),
            "dob": row.get("dob").or(row.get("DOB")).or(row.get("dateOfBirth")).or(row.get("date_of_birth")).unwrap_or(&serde_json::Value::Null),
            "gender": row.get("Gender").or(row.get("gender")).unwrap_or(&serde_json::Value::Null),
            "category": row.get("Category").or(row.get("category")).unwrap_or(&serde_json::Value::Null),
            "fatherName": row.get("Father Name").or(row.get("fatherName")).or(row.get("father_name")).unwrap_or(&serde_json::Value::Null),
            "motherName": row.get("Mother Name").or(row.get("motherName")).or(row.get("mother_name")).unwrap_or(&serde_json::Value::Null),
            "permanent address": row.get("Permanent Address").or(row.get("permanentAddress")).or(row.get("permanent address")).unwrap_or(&serde_json::Value::Null),
            "temporaryAddress": row.get("Temporary Address").or(row.get("temporaryAddress")).or(row.get("temporary address")).unwrap_or(&serde_json::Value::Null),
            "aadhaarNumber": row.get("Aadhaar Number").or(row.get("aadhaarNumber")).or(row.get("aadhaar_number")).or(row.get("aadhaar")).unwrap_or(&serde_json::Value::Null),
            "bloodGroup": row.get("Blood Group").or(row.get("bloodGroup")).or(row.get("blood_group")).unwrap_or(&serde_json::Value::Null),
            "emergencyContact": row.get("Emergency Contact").or(row.get("emergencyContact")).or(row.get("emergency_contact")).unwrap_or(&serde_json::Value::Null),
            "bankAccountNumber": row.get("Bank Account Number").or(row.get("bankAccountNumber")).or(row.get("bank_account_number")).unwrap_or(&serde_json::Value::Null),
            "bankIfscCode": row.get("Bank IFSC Code").or(row.get("bankIfscCode")).or(row.get("bank_ifsc_code")).unwrap_or(&serde_json::Value::Null),
            "baseSalary": row.get("Base Salary").or(row.get("baseSalary")).or(row.get("base_salary")).unwrap_or(&serde_json::Value::Null),
            "subject": row.get("Subject").or(row.get("subject")).unwrap_or(&serde_json::Value::Null),
            "department": row.get("Department").or(row.get("department")).unwrap_or(&serde_json::Value::Null),
        });

        match state
            .services
            .employee
            .create_employee(&school_id, &t_ctx.admin_id, emp_data)
            .await
        {
            Ok(created) => {
                success_count += 1;
                results.push(
                    json!({"row": i + 1, "status": "success", "employeeId": created["employeeId"]}),
                );
            }
            Err(e) => {
                fail_count += 1;
                results.push(json!({"row": i + 1, "status": "error", "message": e.to_string()}));
            }
        }
    }

    Json(json!({
        "success": true,
        "message": format!("{} employees imported, {} failed", success_count, fail_count),
        "results": results,
        "successCount": success_count,
        "failCount": fail_count,
    }))
    .into_response()
}

pub async fn validate_employee(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state.services.employee.validate_employee_data(&school_id, payload).await {
        Ok(_) => Json(json!({"success": true, "message": "Data is valid"})).into_response(),
        Err(e) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({"success": false, "message": e.to_string()})),
        )
            .into_response(),
    }
}
