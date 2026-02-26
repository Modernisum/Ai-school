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

pub async fn bulk_create_employees(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<Vec<serde_json::Value>>,
) -> impl IntoResponse {
    match state
        .services
        .employee
        .bulk_create_employees(&school_id, payload)
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

// POST /api/employees/:schoolId/bulk
pub async fn bulk_import_employees(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let rows = match payload["employees"].as_array().or(payload.as_array()) {
        Some(r) => r.clone(),
        None => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(json!({"success": false, "message": "Expected an 'employees' array"})),
            ).into_response();
        }
    };

    let mut results = Vec::new();
    let mut success_count = 0usize;
    let mut fail_count = 0usize;

    for (i, row) in rows.iter().enumerate() {
        let emp_data = json!({
            "name": row.get("Name").or(row.get("name")).unwrap_or(&serde_json::Value::Null),
            "type": row.get("Type").or(row.get("type")).unwrap_or(&serde_json::Value::Null),
            "email": row.get("Email").or(row.get("email")).unwrap_or(&serde_json::Value::Null),
            "phone": row.get("Phone Number").or(row.get("phone")).unwrap_or(&serde_json::Value::Null),
            "subject": row.get("Subject").or(row.get("subject")).unwrap_or(&serde_json::Value::Null),
            "department": row.get("Department").or(row.get("department")).unwrap_or(&serde_json::Value::Null),
            "baseSalary": row.get("Base Salary").or(row.get("baseSalary")).unwrap_or(&serde_json::Value::Null),
        });

        match state.services.employee.create_employee(&school_id, emp_data).await {
            Ok(created) => {
                success_count += 1;
                results.push(json!({"row": i + 1, "status": "success", "employeeId": created["employeeId"]}));
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
    })).into_response()
}
