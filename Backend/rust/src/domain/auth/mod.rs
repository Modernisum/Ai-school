pub mod auth;
pub mod setup;
pub mod school;
use crate::AppState;
use axum::{
    routing::{get, post, put, patch},
    Router,
    middleware::Next,
    response::Response,
    extract::Request,
};

pub fn routes(state: AppState) -> Router<AppState> {
    let auth_limiter = state.auth_limiter.clone();
    Router::new()
        .nest(
            "/auth",
            Router::new()
                .route("/school/login", post(auth::school_login_handler))
                .route("/:userType/login", post(auth::login_handler))
                .route("/:schoolId/user/select-profile", post(auth::select_profile_handler))
                .route("/school/support", post(crate::domain::admin::create_support_request))
                .route("/school/verify-token", post(auth::verify_token_handler))
                .route("/school/logout", post(auth::logout_handler))
                .route("/school/set-security", post(auth::set_security_handler))
                .route("/school/verify-otp", post(auth::verify_otp_handler))
                .route("/school/forgot-password", post(auth::forgot_password_handler))
                .route("/school/change-password", post(auth::change_password_handler))
                .route("/register-device", post(auth::register_device_handler))
                .route("/setup/school", post(setup::setup_school_handler))
        )
        .route(
            "/school/:schoolId",
            get(school::get_school_details)
                .put(school::update_school_self)
                .patch(school::change_password_self),
        )
        .layer(axum::middleware::from_fn(move |req: Request, next: Next| {
            let client_ip = crate::middleware::rate_limiter::RateLimiter::extract_client_ip(&req);
            let limiter = auth_limiter.clone();
            async move {
                limiter.check(&client_ip).await?;
                Ok::<Response, Response>(next.run(req).await)
            }
        }))
        .with_state(state)
}
