use crate::domain;
use crate::middleware as crate_middleware;
use crate::AppState;
use axum::{
    extract::DefaultBodyLimit,
    extract::Request,
    http::{header, StatusCode},
    middleware::{self, Next},
    response::Response,
    routing::{get, post},
    Router,
};
use std::env;
use std::time::Duration;
use tower_http::compression::CompressionLayer;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;

async fn upload_auth_middleware(request: Request, next: Next) -> Result<Response, StatusCode> {
    if let Ok(expected_token) = env::var("UPLOAD_TOKEN") {
        // Prefer Authorization header over query param (prevents URL leak)
        let token = request
            .headers()
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .unwrap_or_else(|| {
                request.uri().query()
                    .and_then(|q| q.split('&').find(|pair| pair.starts_with("token=")))
                    .map(|pair| pair.trim_start_matches("token="))
                    .unwrap_or("")
            });
        if token != expected_token {
            return Err(StatusCode::UNAUTHORIZED);
        }
    }
    Ok(next.run(request).await)
}

async fn security_headers_middleware(request: Request, next: Next) -> Result<Response, StatusCode> {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert(header::X_FRAME_OPTIONS, header::HeaderValue::from_static("DENY"));
    headers.insert(header::X_CONTENT_TYPE_OPTIONS, header::HeaderValue::from_static("nosniff"));
    headers.insert(header::X_XSS_PROTECTION, header::HeaderValue::from_static("1; mode=block"));
    headers.insert(header::REFERRER_POLICY, header::HeaderValue::from_static("strict-origin-when-cross-origin"));
    headers.insert(header::STRICT_TRANSPORT_SECURITY, header::HeaderValue::from_static("max-age=31536000; includeSubDomains"));
    headers.insert(header::CONTENT_SECURITY_POLICY, header::HeaderValue::from_static("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:* ws://localhost:*; frame-ancestors 'none'"));
    Ok(response)
}

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
    // Clone rate limiters for closure capture
    let auth_limiter = state.auth_limiter.clone();
    let ai_limiter = state.ai_limiter.clone();
    let general_limiter = state.general_limiter.clone();
    let admin_limiter = state.admin_limiter.clone();

    let api = Router::new()
        // Auth — no schoolId needed (strict rate limit: 5 req/min)
        .nest(
            "/auth",
            domain::auth::routes(state.clone())
                .layer(axum::middleware::from_fn(move |req: Request, next: Next| {
                    let client_ip = crate::middleware::rate_limiter::RateLimiter::extract_client_ip(&req);
                    let limiter = auth_limiter.clone();
                    async move {
                        limiter.check(&client_ip).await?;
                        Ok::<Response, Response>(next.run(req).await)
                    }
                })),
        )
        // School-scoped domains — :schoolId extracted by RLS middleware
        .nest("/school/:schoolId", {
            let ai_lim = ai_limiter.clone();
            Router::new()
                .nest("/people", domain::people::routes(state.clone()))
                .nest("/academic", domain::academic::routes(state.clone()))
                .nest("/finance", domain::finance::routes(state.clone()))
                .nest("/attendance", domain::attendance::routes(state.clone()))
                .nest("/leave", domain::leave::routes(state.clone()))
                .nest("/resources", domain::resources::routes(state.clone()))
                .nest("/comm", domain::communication::routes(state.clone()))
                .nest("/operations", domain::operations::routes(state.clone()))
                .nest(
                    "/ai",
                    domain::ai::routes(state.clone())
                        .layer(axum::middleware::from_fn(move |req: Request, next: Next| {
                            let client_ip = crate::middleware::rate_limiter::RateLimiter::extract_client_ip(&req);
                            let limiter = ai_lim.clone();
                            async move {
                                limiter.check(&client_ip).await?;
                                Ok::<Response, Response>(next.run(req).await)
                            }
                        })),
                )
                .nest("/ocr", domain::ocr::routes(state.clone()))
                .nest("/system", domain::system::routes(state.clone()))
        })
        // Admin — separate scope with its own permissive rate limiter
        .nest(
            "/admin",
            domain::admin::routes(state.clone())
                .layer(axum::middleware::from_fn(move |req: Request, next: Next| {
                    let client_ip = crate::middleware::rate_limiter::RateLimiter::extract_client_ip(&req);
                    let limiter = admin_limiter.clone();
                    async move {
                        limiter.check(&client_ip).await?;
                        Ok::<Response, Response>(next.run(req).await)
                    }
                }))
        )
        // Geo routes (superadmin setup forms)
        .route("/geo/countries", get(crate::routes::geo::get_countries))
        .route("/geo/states/:country_id", get(crate::routes::geo::get_states))
        .route("/geo/districts/:state_id", get(crate::routes::geo::get_districts))
        .route("/geo/export", get(crate::routes::geo::export_geo_json))
        .route("/geo/import", post(crate::routes::geo::import_geo_json))
        // Setup routes
        .route("/setup/school", post(crate::routes::setup::setup_school_handler))
        .route("/setup/:schoolId", get(crate::routes::setup::get_setup))
        // Top-level shortcuts (backward compat)
        .route(
            "/school/:schoolId/notification",
            get(crate::super_admin::routes::get_school_notification)
                .delete(crate::super_admin::routes::clear_school_notification),
        )
        .route(
            "/global/notification",
            get(crate::super_admin::routes::get_global_notification),
        )
        .route(
            "/school/:schoolId/holidays",
            get(crate::routes::attendance::list_school_holidays)
                .post(crate::routes::attendance::create_school_holiday),
        )
        .route(
            "/school/:schoolId/holidays/check",
            get(crate::routes::attendance::check_school_holiday),
        )
        .route(
            "/school/:schoolId/holidays/:holidayId",
            axum::routing::delete(crate::routes::attendance::delete_school_holiday),
        )
        // Top-level compat routes for classes
        .route(
            "/class/:schoolId/classes",
            get(crate::routes::class_subject_compat::get_classes_compat)
                .post(crate::routes::class_subject_compat::add_class_compat),
        )
        .route(
            "/class/:schoolId/classes/:classId",
            axum::routing::delete(crate::routes::class_subject_compat::delete_class_compat),
        )
        // Top-level compat routes for subjects
        .route(
            "/subjects/:schoolId",
            get(crate::routes::class_subject_compat::get_subjects_compat)
                .post(crate::routes::class_subject_compat::add_subject_compat),
        )
        .route(
            "/subjects/:schoolId/:subjectId",
            axum::routing::delete(crate::routes::class_subject_compat::delete_subject_compat),
        )
        // Top-level compat routes for students of a class
        .route(
            "/students/:schoolId/class/:class_name",
            get(crate::routes::students::list_students_by_class),
        )
        // Academic Exam Compatibility Routes
        .route(
            "/academic/:schoolId/:className/ids",
            get(crate::routes::class_subject_compat::get_subjects_by_class_compat),
        )
        .route(
            "/academic/topic/:schoolId/class/:className/subject/:subjectName/chapter/names",
            get(crate::routes::class_subject_compat::get_chapters_by_subject_compat),
        )
        .route(
            "/academic/:schoolId/generate-paper",
            post(crate::routes::class_subject_compat::generate_paper_compat),
        )
        .route(
            "/academic/:schoolId/exams",
            post(crate::routes::class_subject_compat::approve_exam_compat),
        )
        // General rate limit (100 req/min) on all /api routes
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
        .route("/health", get(crate::routes::health::unified_health_check))
        .route(
            "/api/dashboard/:schoolId/leaves/proxy-suggestions",
            get(crate::routes::leave::get_proxy_suggestions),
        )
        .nest("/api", api)
        // Legacy route compat — will be deprecated
        .route(
            "/api/students/:schoolId/students/:studentId/profile",
            get(crate::routes::fees::get_student_profile),
        )
        // Middleware
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
        .layer(axum::middleware::from_fn(security_headers_middleware))
        .nest("/api/cms", crate::domain::cms::public_routes(state.clone()))
        .layer(make_cors());

    // Static file serving for /uploads
    let upload_dir = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".to_string());
    let static_router = Router::new()
        .nest_service("/uploads", ServeDir::new(upload_dir))
        .layer(axum::middleware::from_fn(upload_auth_middleware))
        .layer(make_cors());

    app.merge(static_router).with_state(state)
}
