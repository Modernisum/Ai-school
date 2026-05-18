use crate::routes::{employees, emppay, student_forms, students};
use crate::AppState;
use axum::{
    routing::{delete, get, post, put},
    Router,
};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        // Students
        .route("/students", post(students::create_student).get(students::list_students))
        .route("/students/validate", post(students::validate_student))
        .route("/students/bulk", post(students::bulk_import_students))
        .route("/students/paginated", get(students::list_students_paginated))
        .route("/students/class/:class_name", get(students::list_students_by_class))
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
        .with_state(state)
}
