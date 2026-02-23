use axum::{
    extract::DefaultBodyLimit,
    routing::{delete, get, post, put},
    Router,
};
use dotenv::dotenv;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

mod db;
mod logic;
mod models;
mod repository;
mod routes;

mod services;

use repository::{initialize_repositories, Repositories};
use services::{initialize_services, Services};
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<db::DbClient>,
    pub repos: Arc<Repositories>,
    pub services: Arc<Services>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    tracing_subscriber::fmt::init();

    // Capture panics with full backtraces
    std::panic::set_hook(Box::new(|panic_info| {
        eprintln!("=== PANIC ===");
        eprintln!("{}", panic_info);
        if let Some(location) = panic_info.location() {
            eprintln!(
                "at {}:{}:{}",
                location.file(),
                location.line(),
                location.column()
            );
        }
        eprintln!("=============");
    }));

    let mut ocr_pipeline = logic::ocr_pipeline::OcrPipeline::new()?;

    #[cfg(feature = "ocr")]
    {
        let skip_ocr = std::env::var("SKIP_OCR_INIT")
            .map(|v| v == "true")
            .unwrap_or(false);
        if skip_ocr {
            println!("OCR Initialization Bypassed (Fast Development Mode)");
        } else {
            println!("Initializing OCR Pipeline models (TrOCR + Phi-3)...");
            ocr_pipeline.init_models().await?;
        }
    }
    #[cfg(not(feature = "ocr"))]
    {
        println!("OCR feature disabled at compile-time.");
    }

    let ocr_pipeline = Arc::new(ocr_pipeline);

    println!("Initializing Repositories and Database...");
    let db_client = Arc::new(db::init().await?);
    let repos = Arc::new(initialize_repositories(ocr_pipeline.clone()).await);
    let services = Arc::new(initialize_services(repos.clone()));

    let state = AppState {
        db: db_client,
        repos,
        services,
    };

    // CORS Layer
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route(
            "/",
            get(|| async { "High-Accuracy OCR Backend (Rust/Axum) is running!" }),
        )
        // Auth Routes
        .route("/api/auth/login", post(routes::auth::login_handler))
        .nest(
            "/api/complains",
            Router::new()
                .route(
                    "/:schoolId/:summaryId/complainlist",
                    get(routes::complains::list_complains),
                )
                .route(
                    "/:schoolId/student/:studentId",
                    get(routes::complains::list_complains),
                )
                .route("/:schoolId", post(routes::complains::create_complain))
                .route("/:schoolId", get(routes::complains::list_complains)),
        )
        .nest(
            "/api/auth",
            Router::new()
                .route("/school/login", post(routes::auth::login_handler))
                .route(
                    "/school/verify-token",
                    post(routes::auth::verify_token_handler),
                )
                .route("/school/logout", post(routes::auth::logout_handler))
                .route(
                    "/school/set-security",
                    post(routes::auth::set_security_handler),
                )
                .route("/school/verify-otp", post(routes::auth::verify_otp_handler))
                .route(
                    "/school/forgot-password",
                    post(routes::auth::forgot_password_handler),
                )
                .route(
                    "/school/change-password",
                    post(routes::auth::change_password_handler),
                ),
        )
        // User Routes
        .nest(
            "/api/students",
            Router::new()
                .route(
                    "/:schoolId/students",
                    post(routes::students::create_student),
                )
                .route("/:schoolId/students", get(routes::students::list_students))
                .route(
                    "/:schoolId/studentIds",
                    get(routes::students::list_student_ids),
                )
                .route(
                    "/:schoolId/students/:studentId",
                    get(routes::students::get_student),
                )
                .route(
                    "/:schoolId/students/:studentId",
                    put(routes::students::update_student),
                )
                .route(
                    "/:schoolId/students/:studentId",
                    delete(routes::students::delete_student),
                ),
        )
        .nest(
            "/api/employees",
            Router::new()
                .route(
                    "/:schoolId/employees",
                    post(routes::employees::create_employee),
                )
                .route(
                    "/:schoolId/employees",
                    get(routes::employees::list_employees),
                )
                .route(
                    "/:schoolId/employees/:employeeId",
                    get(routes::employees::get_employee),
                )
                .route(
                    "/:schoolId/employees/:employeeId",
                    put(routes::employees::update_employee),
                )
                .route(
                    "/:schoolId/employees/:employeeId",
                    delete(routes::employees::delete_employee),
                ),
        )
        // Academic Routes (Flattened to match frontend API calls)
        .route(
            "/api/class/:schoolId/classes",
            post(routes::class::create_class),
        )
        .route(
            "/api/class/:schoolId/classes",
            get(routes::class::list_classes),
        )
        .route(
            "/api/class/:schoolId/classIds",
            get(routes::class::list_class_ids),
        )
        .route(
            "/api/subjects/:schoolId",
            post(routes::subjects::create_subject),
        )
        .route(
            "/api/subjects/:schoolId",
            get(routes::subjects::list_subjects),
        )
        .route("/api/exams/:schoolId", post(routes::exam::create_exam))
        .route("/api/topics", post(routes::topic::create_topic))
        // Operations Routes
        // Operations Routes
        .nest(
            "/api/operations/attendance",
            Router::new().route(
                "/:schoolId/:role/:userId",
                get(routes::attendance::list_attendance).post(routes::attendance::mark_present),
            ),
        )
        // Standardized Attendance Route
        .route(
            "/api/attendance/:schoolId/:role/:userId/present",
            post(routes::attendance::mark_present),
        )
        .nest(
            "/api/fees",
            Router::new()
                .route(
                    "/:schoolId",
                    get(routes::fees::get_school_fees).post(routes::fees::create_school_fee),
                )
                .route(
                    "/:schoolId/pendingFees/filter",
                    get(routes::fees::get_pending_fees),
                )
                .route(
                    "/:schoolId/student/:studentId",
                    get(routes::fees::get_student_fee),
                )
                .route(
                    "/:schoolId/student/:studentId/add",
                    post(routes::fees::add_fee_to_student_route),
                )
                .route(
                    "/:schoolId/student/:studentId/pay",
                    post(routes::fees::pay_fee),
                )
                .route(
                    "/:schoolId/student/:studentId/discount",
                    post(routes::fees::apply_discount),
                ),
        )
        .nest(
            "/api/payroll",
            Router::new().route(
                "/:schoolId/employees/:employeeId",
                post(routes::emppay::set_base_salary),
            ),
        )
        // Communication & Resource Routes (Flattened)
        .route(
            "/api/announcements/:schoolId/:type/:userId",
            post(routes::announcement::create_announcement),
        )
        .route("/api/events/:schoolId", post(routes::events::create_event))
        .route(
            "/api/materials/:schoolId",
            get(routes::materials::list_materials),
        )
        .route(
            "/api/materials/:schoolId/:materialId/buy",
            post(routes::materials::buy_material),
        )
        // Placeholder Routes for remaining modules
        .route("/api/award/:schoolId", get(routes::award::list_awards))
        .route(
            "/api/document_upload/:schoolId",
            post(routes::documentUpload::upload_document),
        )
        .route(
            "/api/document_upload/:schoolId/student/:studentId",
            post(routes::documentUpload::upload_document),
        )
        .route(
            "/api/documentbox/:schoolId",
            get(routes::documentbox::list_documents),
        )
        .route(
            "/api/reminder/:schoolId",
            get(routes::reminder::list_reminders),
        )
        .route(
            "/api/responsibility/:schoolId",
            get(routes::responsibility::list_responsibilities),
        )
        .route(
            "/api/school/:schoolId",
            get(routes::school::get_school_details),
        )
        .route("/api/setup/:schoolId", get(routes::setup::get_setup))
        .route(
            "/api/setup/school",
            post(routes::setup::setup_school_handler),
        )
        .route(
            "/api/spaces/:schoolId/spaces",
            get(routes::spaces::list_spaces),
        )
        .route("/api/task/:schoolId", get(routes::task::list_tasks))
        // OCR Routes
        .nest(
            "/api/ocr-routes",
            Router::new().route("/extract", post(routes::ocr::extract_text)),
        )
        .layer(DefaultBodyLimit::max(50 * 1024 * 1024)) // 50MB limit for uploads
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
