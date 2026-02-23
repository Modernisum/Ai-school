use crate::models::user::{CreateEmployeeRequest, EmployeeResponse};
use crate::AppState;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;

pub async fn create_employee(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<CreateEmployeeRequest>,
) -> impl IntoResponse {
    let emp_data = json!({
        "name": payload.name,
        "type": payload.employee_type,
        "email": payload.email,
        "phone": payload.phone,
        "subject": payload.subject,
        "department": payload.department,
        "baseSalary": payload.base_salary,
        "address": payload.address,
    });

    match state
        .services
        .employee
        .create_employee(&school_id, emp_data)
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
    Path((school_id, employee_id)): Path<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    match state
        .services
        .employee
        .update_employee(&school_id, &employee_id, payload)
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
    Path((school_id, employee_id)): Path<(String, String)>,
) -> impl IntoResponse {
    match state
        .services
        .employee
        .delete_employee(&school_id, &employee_id)
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
