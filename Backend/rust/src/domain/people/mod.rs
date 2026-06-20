pub mod employees;
pub mod emppay;
pub mod student_forms;
pub mod students;
pub mod user_api;
use crate::AppState;
use axum::{
    routing::{delete, get, post, put},
    Router,
};
pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .nest(
            "/school/:schoolId/people",
            Router::new()
                // User API endpoints (migrated from public API)
                .nest("/user", Router::new()
                    .route("/students", get(user_api::get_students_user))
                    .route("/students/search", get(user_api::search_students_user))
                    .route("/students/:studentId", get(user_api::get_student_user))
                    .route("/employees", get(user_api::get_employees_user))
                    .route("/employees/search", get(user_api::search_employees_user))
                    .route("/employees/:employeeId", get(user_api::get_employee_user))
                    .layer(axum::middleware::from_fn_with_state(
                        state.clone(),
                        crate::middleware::api_key_auth::api_key_auth,
                    )))
                // Students
                .route("/students", post(students::create_student).get(students::list_students))
                .route("/students/validate", post(students::validate_student))
                .route("/students/bulk", post(students::bulk_import_students))
                .route("/students/paginated", get(students::list_students_paginated))
                .route("/students/space/:space_id", get(students::list_students_by_space))
                .route("/students/studentIds", get(students::list_student_ids))
                .route("/students/:studentId", get(students::get_student).put(students::update_student).delete(students::delete_student))
                // Student Form Fill Workflow
                .route("/students/form-status", get(student_forms::get_form_status))
                .route("/students/:studentId/auto-fill", get(student_forms::auto_fill_form))
                .route("/students/:studentId/form-complete", post(student_forms::mark_form_complete))
                // Employees
                .route("/employees", post(employees::create_employee).get(employees::list_employees))
                .route("/employees/validate", post(employees::validate_employee))
                .route("/employees/bulk", post(employees::bulk_import_employees))
                .route("/employees/:employeeId", get(employees::get_employee).put(employees::update_employee).delete(employees::delete_employee))
                .route("/employees/:employeeId/salary-breakdown", get(emppay::get_salary_breakdown))
                .route("/employees/:employeeId/bonus", post(emppay::add_bonus))
                .route("/employees/:employeeId/aid", post(emppay::add_aid))
                .route("/employees/:employeeId/close-month", post(emppay::auto_close_month))
                .route("/employees/:employeeId/pay", post(emppay::record_salary_payment))
                .route("/employees/:employeeId/salary", post(emppay::set_base_salary))
        )
        .with_state(state)
}

pub fn legacy_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/students/:schoolId", get(students::list_students).post(students::create_student))
        .route("/students/:schoolId/validate", post(students::validate_student))
        .route("/students/:schoolId/bulk", post(students::bulk_import_students))
        .route("/students/:schoolId/paginated", get(students::list_students_paginated))
        .route("/students/:schoolId/studentIds", get(students::list_student_ids))
        .route("/students/:schoolId/:studentId", get(students::get_student).put(students::update_student).delete(students::delete_student))
        .route("/students/:schoolId/form-status", get(student_forms::get_form_status))
        .route("/students/:schoolId/:studentId/auto-fill", get(student_forms::auto_fill_form))
        .route("/students/:schoolId/:studentId/form-complete", post(student_forms::mark_form_complete))
        
        .route("/employees/:schoolId", get(employees::list_employees).post(employees::create_employee))
        .route("/employees/:schoolId/validate", post(employees::validate_employee))
        .route("/employees/:schoolId/bulk", post(employees::bulk_import_employees))
        .route("/employees/:schoolId/:employeeId", get(employees::get_employee).put(employees::update_employee).delete(employees::delete_employee))
        .route("/employees/:schoolId/:employeeId/salary-breakdown", get(emppay::get_salary_breakdown))
        .route("/employees/:schoolId/:employeeId/bonus", post(emppay::add_bonus))
        .route("/employees/:schoolId/:employeeId/aid", post(emppay::add_aid))
        .route("/employees/:schoolId/:employeeId/close-month", post(emppay::auto_close_month))
        .route("/employees/:schoolId/:employeeId/pay", post(emppay::record_salary_payment))
        .route("/employees/:schoolId/:employeeId/salary", post(emppay::set_base_salary))
        .with_state(state)
}
