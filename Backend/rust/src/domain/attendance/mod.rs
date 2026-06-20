pub mod attendance;
pub mod attendance_automation;
pub mod leave;
use crate::AppState;
use axum::{
    routing::{delete, get, post, put},
    Router,
};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .nest(
            "/school/:schoolId/attendance",
            Router::new()
                // Public API for attendance
                .nest("/public", Router::new()
                    .route("/attendance/:date", get(attendance::get_attendance_public))
                    .layer(axum::middleware::from_fn_with_state(
                        state.clone(),
                        crate::middleware::api_key_auth::api_key_auth,
                    )))
                .route("/:role/:userId/present", post(attendance::mark_present))
                .route("/:role/:userId/holiday", post(attendance::mark_holiday))
                .route("/:role/:userId/:date", put(attendance::update_attendance).delete(attendance::delete_attendance))
                .route("/student/date/:date", get(attendance::list_attendance_by_date))
                .route("/:role/:userId", get(attendance::list_attendance))
                .route("/holidays", get(attendance::list_school_holidays).post(attendance::create_school_holiday))
                .route("/holidays/check", get(attendance::check_school_holiday))
                .route("/holidays/:holidayId", get(attendance::get_holiday_detail).delete(attendance::delete_school_holiday))
                .route("/bulk", post(attendance::bulk_mark_attendance))
                .route("/class", get(attendance::get_class_attendance))
                .route("/qr", post(attendance::generate_qr_attendance))
                .route("/user", post(attendance::mobile_mark_attendance))
                .route("/offline-sync", post(attendance::offline_sync_attendance))
                .route("/", get(attendance::get_school_attendance))
                .route("/reports/student", get(attendance::get_student_report))
                .route("/reports/class", get(attendance::get_class_report))
                .route("/reports/employee", get(attendance::get_employee_report))
                .route("/reports/custom", post(attendance::generate_custom_report))
                .route("/auto-assign-teacher", get(attendance_automation::auto_assign_teacher))
                // Leave management integrated under attendance/leave
                .nest("/leave", Router::new()
                    .route("/", post(leave::create_leave).get(leave::list_leaves))
                    .route("/:leaveId/approve", post(leave::approve_leave))
                    .route("/:leaveId/reject", post(leave::reject_leave))
                    .route("/:leaveId/extend", post(leave::extend_leave))
                    .route("/:leaveId/reduce", post(leave::reduce_leave))
                    .route("/:leaveId/pdf", get(leave::download_leave_pdf))
                    .route("/balance/:employeeId", get(leave::get_leave_balance))
                    .route("/queue", get(leave::get_leave_queue))
                    .route("/details/:leaveId", get(leave::get_leave_details))
                    .route("/:leaveId/conditional/approve", post(leave::apply_conditional_approval))
                    .route("/:leaveId/conditional/respond", post(leave::respond_to_conditions))
                    .route("/conditional/templates", get(leave::get_conditional_templates).post(leave::create_conditional_template))
                    .route("/:leaveId/coverage/assign", post(leave::assign_coverage))
                    .route("/:leaveId/coverage/available", get(leave::get_available_coverages))
                    .route("/coverage/:coverageId/accept", post(leave::accept_coverage))
                    .route("/:leaveId/workload/assess", post(leave::assess_workload))
                    .route("/:leaveId/workload/assessment", get(leave::get_workload_assessment))
                    .route("/notifications", get(leave::get_notifications))
                    .route("/notifications/:notificationId/read", post(leave::mark_notification_read))
                    .route("/feature-flags", get(leave::get_feature_flags).post(leave::update_feature_flags))
                )
        )
        .with_state(state)
}

pub fn legacy_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/school/:schoolId/holidays", get(attendance::list_school_holidays).post(attendance::create_school_holiday))
        .route("/school/:schoolId/holidays/check", get(attendance::check_school_holiday))
        .route("/school/:schoolId/holidays/:holidayId", delete(attendance::delete_school_holiday))
        .with_state(state)
}
