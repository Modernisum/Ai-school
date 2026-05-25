pub mod api_keys;
pub mod dashboard;
pub mod developer_access;
pub mod geo;
pub mod health;
pub mod notification;
pub mod public_api;
pub mod recovery;
pub mod school;
pub mod setup;
pub mod transport;
pub mod webhook;
pub mod ws;
pub mod generic_handlers;
use crate::AppState;
use axum::{
    routing::{delete, get, patch, post, put},
    Router,
};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        // Health
        .route("/health", get(health::unified_health_check))
        // Geo
        .nest("/geo", Router::new()
            .route("/countries", get(geo::get_countries))
            .route("/states/:countryId", get(geo::get_states))
            .route("/districts/:stateId", get(geo::get_districts))
            .route("/export", get(geo::export_geo_json))
            .route("/import", post(geo::import_geo_json)))
        // School self-management
        .route("/school", get(school::get_school_details)
            .put(school::update_school_self)
            .patch(school::change_password_self))
        .route("/school/notification", get(crate::super_admin::routes::get_school_notification)
            .delete(crate::super_admin::routes::clear_school_notification))
        .route("/school/notify/global", get(crate::super_admin::routes::get_global_notification))
        // Setup
        .route("/setup", get(setup::get_setup))
        .route("/setup/school", post(setup::setup_school_handler))
        // Recovery
        .route("/recovery/history/students", get(recovery::list_student_history))
        .route("/recovery/history/undo/:id", post(recovery::undo_student_change))
        .route("/recovery/audit", get(recovery::list_audit_logs))
        .route("/recovery/audit/undo/:logId", post(recovery::undo_audit_log))
        // Webhooks
        .nest("/webhooks", Router::new()
            .route("/", post(webhook::register_webhook).get(webhook::list_webhooks))
            .route("/:webhookId", delete(webhook::delete_webhook))
            .route("/:webhookId/logs", get(webhook::get_webhook_logs)))
        // API Keys
        .nest("/api-keys", Router::new()
            .route("/", post(api_keys::generate_api_key).get(api_keys::list_api_keys))
            .route("/:keyId", delete(api_keys::revoke_api_key)))
        // Public API
        .nest("/public", Router::new()
            .route("/students", get(public_api::get_students_public))
            .route("/students/search", get(public_api::search_students_public))
            .route("/students/:studentId", get(public_api::get_student_public))
            .route("/employees", get(public_api::get_employees_public))
            .route("/employees/search", get(public_api::search_employees_public))
            .route("/employees/:employeeId", get(public_api::get_employee_public))
            .route("/spaces", get(public_api::get_spaces_public))
            .route("/attendance/:date", get(public_api::get_attendance_public))
            .layer(axum::middleware::from_fn_with_state(
                state.clone(),
                api_keys::api_key_auth,
            )))
        // Transport
        .nest("/transport", transport::router())
        // Notifications
        .nest("/notifications", notification::router())
        // WebSocket
        .nest("/ws", ws::router())
        // Developer Access
        .nest("/developer-access", Router::new()
            .route("/requests", get(developer_access::get_pending_requests))
            .route("/validate", get(developer_access::validate_access_token))
            .route("/:developer_id/request", post(developer_access::request_access))
            .route("/:developer_id/access", get(developer_access::get_developer_access).delete(developer_access::revoke_access))
            .route("/:developer_id/activity", get(developer_access::get_developer_activity))
            .route("/:developer_id/role", put(developer_access::update_developer_role))
            .route("/:developer_id/emergency", post(developer_access::emergency_access))
            .route("/requests/:request_id/approve", post(developer_access::approve_access_request))
            .route("/requests/:request_id/reject", post(developer_access::reject_access_request)))
        // Generic CRUD
        .nest("/crud/:table", Router::new()
            .route("/", post(generic_handlers::generic_create).get(generic_handlers::generic_list))
            .route("/:id", get(generic_handlers::generic_get)
                .put(generic_handlers::generic_update)
                .delete(generic_handlers::generic_delete)))
        .with_state(state)
}
