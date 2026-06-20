pub mod complains;
pub mod reminder;
pub mod responsibility;
pub mod responsibility_ws;
pub mod task;
pub mod transport;
use crate::middleware;
use crate::AppState;
use axum::{
    routing::{delete, get, patch, post, put},
    Router,
};

pub fn routes(state: AppState) -> Router<AppState> {
    let responsibility_routes = Router::new()
        .layer(axum::middleware::from_fn(middleware::metrics::metrics_middleware))
        .route("/", get(responsibility::list_responsibilities).post(responsibility::create_responsibility))
        .route("/:responsibilityId/analytics", get(responsibility::responsibility_analytics))
        .route("/overview/analytics", get(responsibility::overview_analytics))
        .route("/export/csv", get(responsibility::export_responsibilities_csv))
        .route("/import/csv", post(responsibility::import_responsibilities_csv))
        .route("/students/:studentId/responsibilities", get(responsibility::list_student_responsibilities))
        .route("/:responsibilityId", get(responsibility::get_responsibility_definition)
            .patch(responsibility::update_responsibility)
            .delete(responsibility::delete_responsibility))
        .route("/employees/:employeeId/responsibilities", get(responsibility::list_employee_responsibilities))
        .route("/spaces/:spaceId/responsibilities", get(responsibility::list_space_responsibilities))
        .route("/search", get(responsibility::search_responsibilities))
        .route("/:responsibilityId/bulk-assign", post(responsibility::bulk_assign_responsibility))
        .route("/:responsibilityId/bulk-remove", delete(responsibility::bulk_remove_responsibility))
        .route("/:responsibilityId/bulk-update", put(responsibility::bulk_update_responsibility))
        .route("/:responsibilityId/history", get(responsibility::get_responsibility_history))
        .route("/:responsibilityId/versions", get(responsibility::get_responsibility_versions))
        .route("/:responsibilityId/rollback/:version", post(responsibility::rollback_responsibility))
        .route("/metrics/utilization", get(responsibility::get_utilization_metrics))
        .route("/metrics/workload", get(responsibility::get_workload_metrics))
        .route("/metrics/space-distribution", get(responsibility::get_space_distribution_metrics))
        .route("/metrics/revenue", get(responsibility::get_revenue_metrics))
        .route("/reports/utilization/:startDate/:endDate", get(responsibility::generate_utilization_report))
        .route("/reports/workload/:startDate/:endDate", get(responsibility::generate_workload_report))
        .route("/reports/space-distribution/:startDate/:endDate", get(responsibility::generate_space_distribution_report))
        .route("/reports/revenue/:startDate/:endDate", get(responsibility::generate_revenue_report))
        .route("/reports/utilization/:startDate/:endDate/pdf", get(responsibility::generate_utilization_report_pdf))
        .route("/reports/workload/:startDate/:endDate/pdf", get(responsibility::generate_workload_report_pdf))
        .route("/reports/space-distribution/:startDate/:endDate/pdf", get(responsibility::generate_space_distribution_report_pdf))
        .route("/reports/revenue/:startDate/:endDate/pdf", get(responsibility::generate_revenue_report_pdf))
        .route("/sync-student-fees", post(responsibility::sync_student_fees))
        .route("/:responsibilityId/sync-student-fees", post(responsibility::sync_student_fees_for_resp))
        .route("/generate-salaries/:month/:year", post(responsibility::generate_salaries))
        .route("/spaces/:spaceId/financial-overview", get(responsibility::get_space_financial_overview))
        .route("/alerts/missing-responsibilities", get(responsibility::get_missing_responsibility_alerts))
        .nest("/ws", responsibility_ws::router());

    Router::new()
        .nest(
            "/school/:schoolId/operations",
            Router::new()
                .nest("/responsibility", responsibility_routes)
                .nest("/transport", transport::router())
                // Tasks
                .route("/tasks", get(task::list_tasks))
                .route("/tasks/:taskId/status", put(task::update_task_status))
                .route("/tasks/ai/generate", post(task::ai_generate_tasks))
                .route("/tasks/ai/reorganize", post(task::ai_reorganize_tasks))
                // Complaints
                .route("/complains/:summaryId/complainlist", get(complains::list_complains))
                .route("/complains/student/:studentId", get(complains::list_complains))
                .route("/complains", post(complains::create_complain).get(complains::list_complains))
                // Reminders
                .route("/reminders", get(reminder::list_reminders))
        )
        .with_state(state)
}
