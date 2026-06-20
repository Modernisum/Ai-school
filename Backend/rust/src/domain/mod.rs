pub mod auth;
pub mod people;
pub mod academic;
pub mod finance;
pub mod attendance;

pub mod resources;
pub mod communication;
pub mod operations;
pub mod admin;

pub mod system;
pub mod cms;
pub mod query;
pub mod response;

use axum::{
    extract::DefaultBodyLimit,
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
    routing::{get, post},
    Router,
};
use tower_http::compression::CompressionLayer;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;
use crate::AppState;
use crate::middleware as crate_middleware;


fn make_cors() -> CorsLayer {
    let allowed_origins = std::env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:5174,http://127.0.0.1:5174,http://localhost:3001".to_string());
    let origins: Vec<axum::http::HeaderValue> = allowed_origins
        .split(',')
        .filter_map(|o| o.trim().parse().ok())
        .collect();
    CorsLayer::new()
        .allow_origin(origins)
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::PATCH,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
            axum::http::header::ACCEPT,
            axum::http::header::ORIGIN,
            axum::http::header::COOKIE,
            axum::http::header::ACCESS_CONTROL_REQUEST_METHOD,
            axum::http::header::ACCESS_CONTROL_REQUEST_HEADERS,
        ])
        .allow_credentials(true)
}

pub fn create_router(state: AppState) -> Router {
    let general_limiter = state.general_limiter.clone();

    let api = Router::new()
        .merge(auth::routes(state.clone()))
        .merge(people::routes(state.clone()))
        .merge(academic::routes(state.clone()))
        .merge(finance::routes(state.clone()))
        .merge(attendance::routes(state.clone()))

        .merge(resources::routes(state.clone()))
        .merge(communication::routes(state.clone()))
        .merge(operations::routes(state.clone()))

        .merge(system::routes(state.clone()))
        .merge(admin::routes(state.clone()))
        .merge(cms::routes(state.clone()))
        .merge(people::legacy_routes(state.clone()))
        .merge(attendance::legacy_routes(state.clone()))
        .merge(communication::legacy_routes(state.clone()))
        .merge(system::legacy_routes(state.clone()))
        .layer(axum::middleware::from_fn(move |req: Request, next: Next| {
            let client_ip = crate::middleware::rate_limiter::RateLimiter::extract_client_ip(&req);
            let limiter = general_limiter.clone();
            async move {
                limiter.check(&client_ip).await?;
                Ok::<Response, Response>(next.run(req).await)
            }
        }));

    let app = Router::new()
        .route("/", get(|| async { "Modern School Management Backend (Rust/Axum)" }))
        .nest("/api", api)
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate_middleware::rls::rls_middleware,
        ))
        .layer(DefaultBodyLimit::max(50 * 1024 * 1024))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(|request: &axum::http::Request<_>| {
                    tracing::info_span!(
                        "http_request",
                        school_id = tracing::field::Empty,
                        admin_id = tracing::field::Empty,
                        request_id = tracing::field::Empty,
                        method = ?request.method(),
                        uri = %request.uri(),
                    )
                })
                .on_response(
                    tower_http::trace::DefaultOnResponse::new().level(tracing::Level::INFO),
                ),
        )
        .layer(CompressionLayer::new())
        .layer(axum::middleware::from_fn(crate_middleware::security_headers::security_headers_middleware))
        .layer(make_cors());


    app.with_state(state)
}
