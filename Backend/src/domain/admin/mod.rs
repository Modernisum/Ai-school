use crate::AppState;
use axum::{
    routing::{delete, get, patch, post, put},
    Router,
};

// ─── Macros ───
#[macro_export]
macro_rules! require_admin {
    ($headers:expr, $state:expr) => {{
        let svc = crate::domain::admin::make_admin_service(&$state);
        match crate::domain::admin::extract_admin_token(&$headers) {
            None => {
                return (
                    axum::http::StatusCode::UNAUTHORIZED,
                    axum::Json(serde_json::json!({"success":false,"message":"Missing admin token"})),
                )
                    .into_response()
            }
            Some(token) => {
                if let Err(e) = svc.verify_admin_token(&token) {
                    return (
                        axum::http::StatusCode::UNAUTHORIZED,
                        axum::Json(serde_json::json!({"success":false,"message":e.to_string()})),
                    )
                        .into_response();
                }
                svc
            }
        }
    }};
}

#[macro_export]
macro_rules! ok_json {
    ($val:expr) => {
        axum::Json(serde_json::json!({"success": true, "data": $val})).into_response()
    };
}

#[macro_export]
macro_rules! err_json {
    ($e:expr) => {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(serde_json::json!({"success": false, "message": $e.to_string()})),
        )
            .into_response()
    };
}

#[macro_export]
macro_rules! not_found_json {
    ($msg:expr) => {
        (
            axum::http::StatusCode::NOT_FOUND,
            axum::Json(serde_json::json!({"success": false, "message": $msg})),
        )
            .into_response()
    };
}

// ─── Helpers ───
pub fn extract_admin_token(headers: &axum::http::HeaderMap) -> Option<String> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|s| s.to_string())
}

pub fn make_admin_service(state: &AppState) -> crate::services::super_admin::AdminService {
    crate::services::super_admin::AdminService {
        db: state.db.clone(),
    }
}

// ─── Submodules ───
#[macro_use]
pub mod auth;
#[macro_use]
pub mod school;
#[macro_use]
pub mod promo;
#[macro_use]
pub mod billing;
#[macro_use]
pub mod support;
#[macro_use]
pub mod system;

pub use auth::*;
pub use school::*;
pub use promo::*;
pub use billing::*;
pub use support::*;
pub use system::*;

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        // Auth
        .route("/login", post(auth::admin_login))
        .route("/profile", get(auth::get_admin_profile))
        .route("/update-credentials", post(auth::update_admin_credentials))
        // Dashboard Stats
        .route("/stats", get(billing::get_admin_dashboard_stats))
        .route("/stats/advanced", get(billing::get_admin_stats_advanced))
        // Churn Radar
        .route("/churn-radar", get(billing::get_churn_radar))
        // Promos
        .route("/promos", get(promo::list_promo_codes).post(promo::create_promo_code))
        .route("/promos/:promoId/usage", get(promo::get_promo_usage))
        // Config
        .route("/config/:key", get(system::get_config))
        .route("/config", post(system::update_config))
        // Schools CRUD
        .route("/schools", get(school::list_all_schools))
        .route("/schools/export/all", get(system::export_all_schools))
        .route("/schools/:schoolId", get(school::get_school)
            .put(school::update_school)
            .delete(school::delete_school))
        .route("/schools/:schoolId/status", patch(school::set_school_status))
        .route("/schools/:schoolId/password", patch(school::change_school_password))
        .route("/schools/:schoolId/session", patch(school::set_session_duration))
        .route("/schools/:schoolId/sessions", get(school::get_school_sessions)
            .delete(school::expire_school_sessions))
        .route("/schools/:schoolId/notify", post(school::send_notification)
            .delete(school::clear_notification))
        .route("/schools/:schoolId/apply-promo", post(promo::apply_promo_to_school))
        .route("/schools/:schoolId/ledger", get(billing::get_wallet_ledger))
        .route("/schools/:schoolId/refund", post(billing::process_refund))
        .route("/schools/:schoolId/export", get(system::export_school))
        .route("/schools/:schoolId/import", post(system::import_school))
        // Support
        .route("/support", get(support::list_support_requests))
        .route("/support/:id/resolve", patch(support::resolve_support_request))
        // Global Backup
        .route("/backup", post(system::manual_backup))
        // Global Notifications
        .route("/notify/global", post(system::send_global_notification)
            .delete(system::clear_global_notification))
        // CMS Admin
        .nest("/cms", crate::domain::cms::admin_routes(state.clone()))
        .with_state(state)
}
