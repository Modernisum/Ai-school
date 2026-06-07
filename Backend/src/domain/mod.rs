pub mod auth;
pub mod people;
pub mod academic;
pub mod finance;
pub mod attendance;
pub mod leave;
pub mod resources;
pub mod communication;
pub mod operations;
pub mod ai;
pub mod admin;
pub mod ocr;
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
    let auth_limiter = state.auth_limiter.clone();
    let ai_limiter = state.ai_limiter.clone();
    let general_limiter = state.general_limiter.clone();
    let admin_limiter = state.admin_limiter.clone();

    let api = Router::new()
        .nest(
            "/auth",
            auth::routes(state.clone())
                .layer(axum::middleware::from_fn(move |req: Request, next: Next| {
                    let client_ip = crate::middleware::rate_limiter::RateLimiter::extract_client_ip(&req);
                    let limiter = auth_limiter.clone();
                    async move {
                        limiter.check(&client_ip).await?;
                        Ok::<Response, Response>(next.run(req).await)
                    }
                })),
        )
        .nest("/school/:schoolId", {
            let ai_lim = ai_limiter.clone();
            Router::new()
                .nest("/people", people::routes(state.clone()))
                .nest("/academic", academic::routes(state.clone()))
                .nest("/finance", finance::routes(state.clone()))
                .nest("/attendance", attendance::routes(state.clone()))
                .nest("/leave", leave::routes(state.clone()))
                .nest("/resources", resources::routes(state.clone()))
                .nest("/comm", communication::routes(state.clone()))
                .nest("/operations", operations::routes(state.clone()))
                .nest(
                    "/ai",
                    ai::routes(state.clone())
                        .layer(axum::middleware::from_fn(move |req: Request, next: Next| {
                            let client_ip = crate::middleware::rate_limiter::RateLimiter::extract_client_ip(&req);
                            let limiter = ai_lim.clone();
                            async move {
                                limiter.check(&client_ip).await?;
                                Ok::<Response, Response>(next.run(req).await)
                            }
                        })),
                )
                .nest("/ocr", ocr::routes(state.clone()))
                .nest("/system", system::routes(state.clone()))
        })
        .nest(
            "/admin",
            admin::routes(state.clone())
                .layer(axum::middleware::from_fn(move |req: Request, next: Next| {
                    let client_ip = crate::middleware::rate_limiter::RateLimiter::extract_client_ip(&req);
                    let limiter = admin_limiter.clone();
                    async move {
                        limiter.check(&client_ip).await?;
                        Ok::<Response, Response>(next.run(req).await)
                    }
                }))
        )
        .merge(people::legacy_routes(state.clone()))
        .merge(attendance::legacy_routes(state.clone()))
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
        .route("/health", get(crate::domain::system::health::unified_health_check))
        .nest("/api", api)
        .route(
            "/:schoolId/mobile/select-profile",
            post(crate::domain::auth::auth::select_profile_handler),
        )
        .route(
            "/:schoolId/mobile/fees/:studentId",
            get(crate::domain::finance::fees::get_student_fee),
        )
        .route(
            "/:schoolId/mobile/order",
            post(crate::domain::finance::payment::create_order),
        )
        .route(
            "/:schoolId/mobile/attendance",
            post(crate::domain::attendance::attendance::mobile_mark_attendance),
        )
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
        .nest("/api/cms", cms::public_routes(state.clone()))
        .layer(make_cors());

    let upload_dir = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".to_string());
    let static_router = Router::new()
        .nest_service("/uploads", ServeDir::new(upload_dir))
        .layer(axum::middleware::from_fn(crate_middleware::upload_auth::upload_auth_middleware))
        .layer(make_cors());

    app.merge(static_router).with_state(state)
}
