pub mod api_keys;
pub mod developer_access;
pub mod geo;
pub mod recovery;
pub mod generic_handlers;

use crate::AppState;
use axum::{
    routing::{delete, get, patch, post, put},
    Router,
};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .nest(
            "/school/:schoolId/system",
            Router::new()

                // Geo
                .nest("/geo", Router::new()
                    .route("/countries", get(geo::get_countries))
                    .route("/states/:countryId", get(geo::get_states))
                    .route("/districts/:stateId", get(geo::get_districts))
                    .route("/export", get(geo::export_geo_json))
                    .route("/import", post(geo::import_geo_json)))
                // Recovery
                .route("/recovery/history/students", get(recovery::list_student_history))
                .route("/recovery/history/undo/:id", post(recovery::undo_student_change))
                .route("/recovery/audit", get(recovery::list_audit_logs))
                .route("/recovery/audit/undo/:logId", post(recovery::undo_audit_log))
                // API Keys
                .nest("/api-keys", Router::new()
                    .route("/", post(api_keys::generate_api_key).get(api_keys::list_api_keys))
                    .route("/:keyId", delete(api_keys::revoke_api_key)))
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
        )
        .with_state(state)
}

pub fn legacy_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/geo/countries", get(geo::get_countries))
        .route("/geo/states/:country_id", get(geo::get_states))
        .route("/geo/districts/:state_id", get(geo::get_districts))
        .route("/geo/export", get(geo::export_geo_json))
        .route("/geo/import", post(geo::import_geo_json).layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::middleware::rls::rls_middleware,
        )))
        .with_state(state)
}
