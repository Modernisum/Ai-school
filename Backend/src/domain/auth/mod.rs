pub mod auth;
pub mod storage;
use crate::AppState;
use axum::{
    routing::{delete, get, post},
    Router,
};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/:userType/login", post(auth::login_handler))
        .route("/school/support", post(crate::super_admin::routes::create_support_request))
        .route("/school/verify-token", post(auth::verify_token_handler))
        .route("/school/logout", post(auth::logout_handler))
        .route("/school/set-security", post(auth::set_security_handler))
        .route("/school/verify-otp", post(auth::verify_otp_handler))
        .route("/school/forgot-password", post(auth::forgot_password_handler))
        .route("/school/change-password", post(auth::change_password_handler))
        .route("/register-device", post(auth::register_device_handler))
        .nest("/storage", Router::new()
            .route("/upload", post(storage::upload_file))
            .route("/files", get(storage::list_files))
            .route("/files/:id", delete(storage::delete_file))
            .route("/file-by-url", delete(storage::delete_file_by_url)))
        .with_state(state)
}
