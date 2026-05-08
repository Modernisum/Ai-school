use crate::AppState;
use axum::{
    routing::{delete, get, patch, post, put},
    Router,
};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        // Auth
        .route("/login", post(crate::super_admin::routes::admin_login))
        .route("/profile", get(crate::super_admin::routes::get_admin_profile))
        .route("/update-credentials", post(crate::super_admin::routes::update_admin_credentials))
        // Dashboard Stats
        .route("/stats", get(crate::super_admin::routes::get_admin_dashboard_stats))
        .route("/stats/advanced", get(crate::super_admin::routes::get_admin_stats_advanced))
        // Churn Radar
        .route("/churn-radar", get(crate::super_admin::routes::get_churn_radar))
        // Promos
        .route("/promos", get(crate::super_admin::routes::list_promo_codes).post(crate::super_admin::routes::create_promo_code))
        .route("/promos/:promoId/usage", get(crate::super_admin::routes::get_promo_usage))
        // Config
        .route("/config/:key", get(crate::super_admin::routes::get_config))
        .route("/config", post(crate::super_admin::routes::update_config))
        // Schools CRUD
        .route("/schools", get(crate::super_admin::routes::list_all_schools))
        .route("/schools/export/all", get(crate::super_admin::routes::export_all_schools))
        .route("/schools/:schoolId", get(crate::super_admin::routes::get_school)
            .put(crate::super_admin::routes::update_school)
            .delete(crate::super_admin::routes::delete_school))
        .route("/schools/:schoolId/status", patch(crate::super_admin::routes::set_school_status))
        .route("/schools/:schoolId/password", patch(crate::super_admin::routes::change_school_password))
        .route("/schools/:schoolId/session", patch(crate::super_admin::routes::set_session_duration))
        .route("/schools/:schoolId/sessions", get(crate::super_admin::routes::get_school_sessions)
            .delete(crate::super_admin::routes::expire_school_sessions))
        .route("/schools/:schoolId/notify", post(crate::super_admin::routes::send_notification)
            .delete(crate::super_admin::routes::clear_notification))
        .route("/schools/:schoolId/apply-promo", post(crate::super_admin::routes::apply_promo_to_school))
        .route("/schools/:schoolId/ledger", get(crate::super_admin::routes::get_wallet_ledger))
        .route("/schools/:schoolId/refund", post(crate::super_admin::routes::process_refund))
        .route("/schools/:schoolId/export", get(crate::super_admin::routes::export_school))
        .route("/schools/:schoolId/import", post(crate::super_admin::routes::import_school))
        // Support
        .route("/support", get(crate::super_admin::routes::list_support_requests))
        .route("/support/:id/resolve", patch(crate::super_admin::routes::resolve_support_request))
        // Global Backup
        .route("/backup", post(crate::super_admin::routes::manual_backup))
        // Global Notifications
        .route("/notify/global", post(crate::super_admin::routes::send_global_notification)
            .delete(crate::super_admin::routes::clear_global_notification))
        // CMS Admin
        .nest("/cms", super::cms::admin_routes(state.clone()))
        .with_state(state)
}
