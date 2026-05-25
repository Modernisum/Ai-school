pub mod leave;
use crate::AppState;
use axum::{
    routing::{delete, get, post},
    Router,
};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
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
        .with_state(state)
}
