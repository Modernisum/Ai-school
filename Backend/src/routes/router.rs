use crate::middleware;
use crate::routes;
use crate::AppState;
use axum::{
    extract::DefaultBodyLimit,
    routing::{delete, get, post, put},
    Router,
};
use axum::{extract::Request, http::StatusCode, middleware::Next, response::Response};
use std::env;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;

async fn upload_auth_middleware(request: Request, next: Next) -> Result<Response, StatusCode> {
    // Allow if UPLOAD_TOKEN environment variable is not set (development)
    if let Ok(expected_token) = env::var("UPLOAD_TOKEN") {
        // Extract token from query parameter "token"
        let token = request
            .uri()
            .query()
            .and_then(|q| {
                q.split('&')
                    .find(|pair| pair.starts_with("token="))
                    .map(|pair| pair.trim_start_matches("token="))
            })
            .unwrap_or("");
        if token != expected_token {
            return Err(StatusCode::UNAUTHORIZED);
        }
    }
    Ok(next.run(request).await)
}

pub fn create_router(state: AppState) -> Router {
    // CORS Layer — created as a factory so we can use it for both the main app and static routes
    let make_cors = || {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
    };

    let app = Router::new()
        .route(
            "/",
            get(|| async { "High-Accuracy OCR Backend (Rust/Axum) is running!" }),
        )
        // ── Dashboard Stats ────────────────────────────────────────────────────
        .route(
            "/api/dashboard/:schoolId/stats",
            get(routes::dashboard::get_stats),
        )
        .route(
            "/api/dashboard/:schoolId/leaves/proxy-suggestions",
            get(routes::leave::get_proxy_suggestions),
        )
        // ── Super Admin API ────────────────────────────────────────────────────
        .nest(
            "/api/admin",
            Router::new()
                // Auth
                .route("/login", post(crate::super_admin::routes::admin_login))
                .route(
                    "/profile",
                    get(crate::super_admin::routes::get_admin_profile),
                )
                .route(
                    "/update-credentials",
                    post(crate::super_admin::routes::update_admin_credentials),
                )
                // Dashboard Stats
                .route(
                    "/stats",
                    get(crate::super_admin::routes::get_admin_dashboard_stats),
                )
                .route(
                    "/stats/advanced",
                    get(crate::super_admin::routes::get_admin_stats_advanced),
                )
                // Churn Radar
                .route(
                    "/churn-radar",
                    get(crate::super_admin::routes::get_churn_radar),
                )
                // Promos
                .route(
                    "/promos",
                    get(crate::super_admin::routes::list_promo_codes)
                        .post(crate::super_admin::routes::create_promo_code),
                )
                .route(
                    "/promos/:promoId/usage",
                    get(crate::super_admin::routes::get_promo_usage),
                )
                // Config
                .route("/config/:key", get(crate::super_admin::routes::get_config))
                .route("/config", post(crate::super_admin::routes::update_config))
                // Schools CRUD
                .route(
                    "/schools",
                    get(crate::super_admin::routes::list_all_schools),
                )
                .route(
                    "/schools/export/all",
                    get(crate::super_admin::routes::export_all_schools),
                )
                .route(
                    "/schools/:schoolId",
                    get(crate::super_admin::routes::get_school),
                )
                .route(
                    "/schools/:schoolId",
                    put(crate::super_admin::routes::update_school),
                )
                .route(
                    "/schools/:schoolId",
                    delete(crate::super_admin::routes::delete_school),
                )
                // Operations per school
                .route(
                    "/schools/:schoolId/status",
                    axum::routing::patch(crate::super_admin::routes::set_school_status),
                )
                .route(
                    "/schools/:schoolId/password",
                    axum::routing::patch(crate::super_admin::routes::change_school_password),
                )
                .route(
                    "/schools/:schoolId/session",
                    axum::routing::patch(crate::super_admin::routes::set_session_duration),
                )
                .route(
                    "/schools/:schoolId/sessions",
                    delete(crate::super_admin::routes::expire_school_sessions),
                )
                .route(
                    "/schools/:schoolId/notify",
                    post(crate::super_admin::routes::send_notification),
                )
                .route(
                    "/schools/:schoolId/notify",
                    delete(crate::super_admin::routes::clear_notification),
                )
                .route(
                    "/schools/:schoolId/apply-promo",
                    post(crate::super_admin::routes::apply_promo_to_school),
                )
                .route(
                    "/schools/:schoolId/ledger",
                    get(crate::super_admin::routes::get_wallet_ledger),
                )
                // Backup / Restore
                .route(
                    "/schools/:schoolId/export",
                    get(crate::super_admin::routes::export_school),
                )
                .route(
                    "/schools/:schoolId/import",
                    post(crate::super_admin::routes::import_school),
                )
                // Support
                .route(
                    "/support",
                    get(crate::super_admin::routes::list_support_requests),
                )
                .route(
                    "/support/:id/resolve",
                    axum::routing::patch(crate::super_admin::routes::resolve_support_request),
                )
                // Global Backup
                .route("/backup", post(crate::super_admin::routes::manual_backup))
                // Global Notifications
                .route(
                    "/notify/global",
                    post(crate::super_admin::routes::send_global_notification)
                        .delete(crate::super_admin::routes::clear_global_notification),
                ),
        )
        // ── Geo Data Routes ────────────────────────────────────────────────────
        .nest(
            "/api/geo",
            Router::new()
                .route("/countries", get(routes::geo::get_countries))
                .route("/states/:countryId", get(routes::geo::get_states))
                .route("/districts/:stateId", get(routes::geo::get_districts))
                .route("/export", get(routes::geo::export_geo_json))
                .route("/import", post(routes::geo::import_geo_json)),
        )
        // ── School notification polling ────────────
        .route(
            "/api/school/:schoolId/notification",
            get(crate::super_admin::routes::get_school_notification)
                .delete(crate::super_admin::routes::clear_school_notification),
        )
        .route(
            "/api/global/notification",
            get(crate::super_admin::routes::get_global_notification),
        );

    let app = app
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
        .nest("/api/payment", routes::payment::router())
        .nest("/api/chat", routes::chat::router())
        .nest("/api/transport", routes::transport::router())
        .nest("/api/ws", routes::ws::router())
        // ── Timetable Routes ───────────────────────────────────────────────────
        .nest(
            "/api/school/:schoolId/timetable",
            Router::new()
                .route("/generate", post(routes::timetable::generate_timetable))
                .route("/", get(routes::timetable::list_timetables))
                .route("/:configId", get(routes::timetable::get_timetable))
                .route(
                    "/:configId/approve",
                    post(routes::timetable::approve_timetable),
                )
                .route("/:configId", delete(routes::timetable::delete_timetable)),
        )
        // ── Webhook Engine Routes ─────────────────────────────────────────────
        .nest(
            "/api/school/:schoolId/webhooks",
            Router::new()
                .route("/", post(routes::webhook::register_webhook))
                .route("/", get(routes::webhook::list_webhooks))
                .route("/:webhookId", delete(routes::webhook::delete_webhook))
                .route("/:webhookId/logs", get(routes::webhook::get_webhook_logs)),
        )
        // ── API Key Management Routes ─────────────────────────────────────────
        .nest(
            "/api/school/:schoolId/api-keys",
            Router::new()
                .route("/", post(routes::api_keys::generate_api_key))
                .route("/", get(routes::api_keys::list_api_keys))
                .route("/:keyId", delete(routes::api_keys::revoke_api_key)),
        )
        // ── Public Developer API ─────────────────────────
        .nest(
            "/api/v1/public",
            Router::new()
                .route("/students", get(routes::public_api::get_students_public))
                .route(
                    "/attendance/:date",
                    get(routes::public_api::get_attendance_public),
                )
                .layer(axum::middleware::from_fn_with_state(
                    state.clone(),
                    routes::api_keys::api_key_auth,
                )),
        )
        .nest(
            "/api/auth",
            Router::new()
                .route("/:userType/login", post(routes::auth::login_handler))
                .route(
                    "/school/support",
                    post(crate::super_admin::routes::create_support_request),
                )
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
        // ── Storage Routes ────────────────────────────────────────────────────
        .nest(
            "/api/storage",
            Router::new()
                .route("/upload", post(routes::storage::upload_file))
                .route("/files", get(routes::storage::list_files))
                .route("/files/:id", delete(routes::storage::delete_file))
                .route("/file-by-url", delete(routes::storage::delete_file_by_url)),
        )
        // User Routes
        .nest(
            "/api/students",
            Router::new()
                .route("/:schoolId", post(routes::students::create_student))
                .route(
                    "/:schoolId/validate",
                    post(routes::students::validate_student),
                )
                .route(
                    "/:schoolId/bulk",
                    post(routes::students::bulk_import_students),
                )
                .route("/:schoolId", get(routes::students::list_students))
                .route(
                    "/:schoolId/class/:class_name",
                    get(routes::students::list_students_by_class),
                )
                .route(
                    "/:schoolId/studentIds",
                    get(routes::students::list_student_ids),
                )
                .route("/:schoolId/:studentId", get(routes::students::get_student))
                .route(
                    "/:schoolId/:studentId",
                    put(routes::students::update_student),
                )
                .route(
                    "/:schoolId/:studentId",
                    delete(routes::students::delete_student),
                ),
        )
        .route(
            "/api/recovery/history/students/:schoolId",
            get(routes::recovery::list_student_history),
        )
        .route(
            "/api/recovery/history/undo/:schoolId/:id",
            post(routes::recovery::undo_student_change),
        )
        .route(
            "/api/recovery/audit/:schoolId",
            get(routes::recovery::list_audit_logs),
        )
        .route(
            "/api/recovery/audit/undo/:schoolId/:logId",
            post(routes::recovery::undo_audit_log),
        )
        .nest(
            "/api/employees",
            Router::new()
                .route("/:schoolId", post(routes::employees::create_employee))
                .route(
                    "/:schoolId/validate",
                    post(routes::employees::validate_employee),
                )
                .route(
                    "/:schoolId/bulk",
                    post(routes::employees::bulk_import_employees),
                )
                .route("/:schoolId", get(routes::employees::list_employees))
                .route(
                    "/:schoolId/:employeeId",
                    get(routes::employees::get_employee),
                )
                .route(
                    "/:schoolId/:employeeId",
                    put(routes::employees::update_employee),
                )
                .route(
                    "/:schoolId/:employeeId",
                    delete(routes::employees::delete_employee),
                )
                .route(
                    "/:schoolId/:employeeId/salary-breakdown",
                    get(routes::emppay::get_salary_breakdown),
                )
                .route(
                    "/:schoolId/:employeeId/bonus",
                    post(routes::emppay::add_bonus),
                )
                .route("/:schoolId/:employeeId/aid", post(routes::emppay::add_aid))
                .route(
                    "/:schoolId/:employeeId/close-month",
                    post(routes::emppay::auto_close_month),
                )
                .route(
                    "/:schoolId/employees/:employeeId/salary",
                    post(routes::emppay::set_base_salary),
                ),
        )
        // Space/Material Routes
        //GET /api/spaces/:schoolId/spaces?category=Classroom&simple=true
        .route(
            "/api/spaces/:schoolId/spaces",
            get(routes::spaces::list_spaces),
        )
        .route(
            "/api/spaces/:schoolId/categories",
            get(routes::spaces::list_space_categories),
        )
        .route(
            "/api/spaces/:schoolId/spaces/:category",
            post(routes::spaces::create_space_by_category),
        )
        .route(
            "/api/spaces/:schoolId/:spaceName",
            get(routes::spaces::get_space_details),
        )
        .route(
            "/api/spaces/:schoolId/:spaceName",
            put(routes::spaces::update_space),
        )
        .route(
            "/api/spaces/:schoolId/:spaceName",
            delete(routes::spaces::delete_space),
        )
        .route(
            "/api/spaces/:schoolId/:spaceName/materials",
            post(routes::spaces::assign_space_materials),
        )
        // Academic Routes
        .route(
            "/api/class/:schoolId/classes",
            post(routes::class::create_class),
        )
        .route(
            "/api/class/:schoolId/classes",
            get(routes::class::list_classes),
        )
        .route(
            "/api/exams/:schoolId",
            post(routes::exam::create_exam).get(routes::exam::list_exams),
        )
        .route(
            "/api/exam/ai/:schoolId/generate",
            post(routes::exam::ai_generate_exam),
        )
        .route("/api/topics", post(routes::topic::create_topic))
        // Attendance Routes
        .nest(
            "/api/operations/attendance",
            Router::new()
                .route(
                    "/:schoolId/:role/:userId/present",
                    axum::routing::post(routes::attendance::mark_present),
                )
                .route(
                    "/:schoolId/:role/:userId/holiday",
                    axum::routing::post(routes::attendance::mark_holiday),
                )
                .route(
                    "/:schoolId/:role/:userId/:date",
                    axum::routing::put(routes::attendance::update_attendance)
                        .delete(routes::attendance::delete_attendance),
                )
                .route(
                    "/:schoolId/student/date/:date",
                    axum::routing::get(routes::attendance::list_attendance_by_date),
                )
                .route(
                    "/:schoolId/:role/:userId",
                    axum::routing::get(routes::attendance::list_attendance),
                )
                .route(
                    "/:schoolId/holidays",
                    axum::routing::get(routes::attendance::list_school_holidays)
                        .post(routes::attendance::create_school_holiday),
                )
                .route(
                    "/:schoolId/holidays/check",
                    axum::routing::get(routes::attendance::check_school_holiday),
                )
                .route(
                    "/:schoolId/holidays/:holidayId",
                    axum::routing::get(routes::attendance::get_holiday_detail)
                        .delete(routes::attendance::delete_school_holiday),
                ),
        )
        .route(
            "/api/attendance/:schoolId/:role/:userId/present",
            axum::routing::post(routes::attendance::mark_present),
        )
        // Fees Routes
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
                    "/:schoolId/student/:studentId/ai-reminder",
                    get(routes::fees::generate_fee_reminder),
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
                )
                .route(
                    "/:schoolId/custom",
                    get(routes::fees::list_custom_fees).post(routes::fees::create_custom_fee),
                )
                .route(
                    "/:schoolId/custom/:feeId",
                    delete(routes::fees::delete_custom_fee),
                )
                .route(
                    "/:schoolId/custom/:feeId/apply",
                    post(routes::fees::apply_custom_fee),
                )
                .route(
                    "/:schoolId/coupons",
                    get(routes::fees::list_coupons).post(routes::fees::create_coupon),
                )
                .route(
                    "/:schoolId/coupons/validate",
                    post(routes::fees::validate_coupon),
                )
                .route(
                    "/:schoolId/coupons/:couponId",
                    delete(routes::fees::delete_coupon),
                )
                .route(
                    "/:schoolId/coupons/:couponId/block",
                    put(routes::fees::block_coupon),
                )
                .route(
                    "/:schoolId/coupons/:couponId/use",
                    post(routes::fees::use_coupon),
                ),
        )
        .route(
            "/api/students/:schoolId/students/:studentId/profile",
            get(routes::fees::get_student_profile),
        )
        .route(
            "/api/announcements/:schoolId/:type/:userId",
            post(routes::announcement::create_announcement),
        )
        .route("/api/events/:schoolId", post(routes::events::create_event))
        .route(
            "/api/materials/:schoolId",
            get(routes::materials::list_materials).post(routes::materials::create_material),
        )
        .route(
            "/api/materials/:schoolId/:materialName",
            get(routes::materials::get_material)
                .patch(routes::materials::update_material)
                .delete(routes::materials::delete_material),
        )
        .route(
            "/api/materials/:schoolId/:materialName/buy",
            post(routes::materials::buy_material),
        )
        .route(
            "/api/materials/:schoolId/:materialName/sell",
            post(routes::materials::sell_material),
        )
        .route(
            "/api/materials/:schoolId/bulk",
            axum::routing::post(routes::materials::bulk_import_materials),
        )
        .route("/api/award/:schoolId", get(routes::award::list_awards))
        .route(
            "/api/document_upload/:schoolId",
            post(routes::document_upload::upload_document),
        )
        .route(
            "/api/document_upload/:schoolId/student/:studentId",
            post(routes::document_upload::upload_document),
        )
        .route(
            "/api/documentbox/:schoolId",
            get(routes::documentbox::list_documents),
        )
        .route(
            "/api/reminder/:schoolId",
            get(routes::reminder::list_reminders),
        )
        .nest(
            "/api/responsibility",
            Router::new()
                .route(
                    "/:schoolId",
                    get(routes::responsibility::list_responsibilities)
                        .post(routes::responsibility::create_responsibility),
                )
                .route(
                    "/:schoolId/:responsibilityId/analytics",
                    get(routes::responsibility::responsibility_analytics),
                )
                .route(
                    "/:schoolId/overview/analytics",
                    get(routes::responsibility::overview_analytics),
                )
                .route(
                    "/:schoolId/export/csv",
                    get(routes::responsibility::export_responsibilities_csv),
                )
                .route(
                    "/:schoolId/import/csv",
                    post(routes::responsibility::import_responsibilities_csv),
                )
                .route(
                    "/:schoolId/students/:studentId/responsibilities",
                    get(routes::responsibility::list_student_responsibilities),
                )
                .route(
                    "/:schoolId/:responsibilityId",
                    get(routes::responsibility::get_responsibility_definition)
                        .patch(routes::responsibility::update_responsibility)
                        .delete(routes::responsibility::delete_responsibility),
                )
                .route(
                    "/:schoolId/employees/:employeeId/responsibilities",
                    get(routes::responsibility::list_employee_responsibilities),
                )
                .route(
                    "/:schoolId/spaces/:spaceId/responsibilities",
                    get(routes::responsibility::list_space_responsibilities),
                )
                .route(
                    "/:schoolId/responsibilities/search",
                    get(routes::responsibility::search_responsibilities),
                )
                .route(
                    "/:schoolId/responsibilities/:responsibilityId/bulk-assign",
                    post(routes::responsibility::bulk_assign_responsibility),
                )
                .route(
                    "/:schoolId/responsibilities/:responsibilityId/bulk-remove",
                    delete(routes::responsibility::bulk_remove_responsibility),
                )
                .route(
                    "/:schoolId/responsibilities/:responsibilityId/bulk-update",
                    put(routes::responsibility::bulk_update_responsibility),
                )
                .route(
                    "/:schoolId/responsibilities/:responsibilityId/history",
                    get(routes::responsibility::get_responsibility_history),
                )
                .route(
                    "/:schoolId/responsibilities/:responsibilityId/versions",
                    get(routes::responsibility::get_responsibility_versions),
                )
                .route(
                    "/:schoolId/responsibilities/:responsibilityId/rollback/:version",
                    post(routes::responsibility::rollback_responsibility),
                )
                // Phase 6: Reporting & Analytics routes
                .route(
                    "/:schoolId/metrics/utilization",
                    get(routes::responsibility::get_utilization_metrics),
                )
                .route(
                    "/:schoolId/metrics/workload",
                    get(routes::responsibility::get_workload_metrics),
                )
                .route(
                    "/:schoolId/metrics/space-distribution",
                    get(routes::responsibility::get_space_distribution_metrics),
                )
                .route(
                    "/:schoolId/metrics/revenue",
                    get(routes::responsibility::get_revenue_metrics),
                )
                .route(
                    "/:schoolId/reports/utilization/:startDate/:endDate",
                    get(routes::responsibility::generate_utilization_report),
                )
                .route(
                    "/:schoolId/reports/workload/:startDate/:endDate",
                    get(routes::responsibility::generate_workload_report),
                )
                .route(
                    "/:schoolId/reports/space-distribution/:startDate/:endDate",
                    get(routes::responsibility::generate_space_distribution_report),
                )
                .route(
                    "/:schoolId/reports/revenue/:startDate/:endDate",
                    get(routes::responsibility::generate_revenue_report),
                )
                // PDF Export routes
                .route(
                    "/:schoolId/reports/utilization/:startDate/:endDate/pdf",
                    get(routes::responsibility::generate_utilization_report_pdf),
                )
                .route(
                    "/:schoolId/reports/workload/:startDate/:endDate/pdf",
                    get(routes::responsibility::generate_workload_report_pdf),
                )
                .route(
                    "/:schoolId/reports/space-distribution/:startDate/:endDate/pdf",
                    get(routes::responsibility::generate_space_distribution_report_pdf),
                )
                .route(
                    "/:schoolId/reports/revenue/:startDate/:endDate/pdf",
                    get(routes::responsibility::generate_revenue_report_pdf),
                )
                .nest(
                    "/ws",
                    routes::responsibility_ws::router(),
                )
        )
        .nest(
            "/api/leave",
            Router::new()
                // Basic leave operations
                .route(
                    "/:schoolId",
                    post(routes::leave::create_leave).get(routes::leave::list_leaves),
                )
                .route(
                    "/:schoolId/:leaveId/approve",
                    post(routes::leave::approve_leave),
                )
                .route(
                    "/:schoolId/:leaveId/reject",
                    post(routes::leave::reject_leave),
                )
                .route(
                    "/:schoolId/:leaveId/extend",
                    post(routes::leave::extend_leave),
                )
                .route(
                    "/:schoolId/:leaveId/reduce",
                    post(routes::leave::reduce_leave),
                )
                .route(
                    "/:schoolId/:leaveId/pdf",
                    get(routes::leave::download_leave_pdf),
                )
                // Enhanced leave system routes
                .route(
                    "/:schoolId/balance/:employeeId",
                    get(routes::leave::get_leave_balance),
                )
                .route("/:schoolId/queue", get(routes::leave::get_leave_queue))
                .route(
                    "/:schoolId/details/:leaveId",
                    get(routes::leave::get_leave_details),
                )
                // Conditional approval routes
                .route(
                    "/:schoolId/:leaveId/conditional/approve",
                    post(routes::leave::apply_conditional_approval),
                )
                .route(
                    "/:schoolId/:leaveId/conditional/respond",
                    post(routes::leave::respond_to_conditions),
                )
                .route(
                    "/:schoolId/conditional/templates",
                    get(routes::leave::get_conditional_templates)
                        .post(routes::leave::create_conditional_template),
                )
                // Responsibility coverage routes
                .route(
                    "/:schoolId/:leaveId/coverage/assign",
                    post(routes::leave::assign_coverage),
                )
                .route(
                    "/:schoolId/:leaveId/coverage/available",
                    get(routes::leave::get_available_coverages),
                )
                .route(
                    "/:schoolId/coverage/:coverageId/accept",
                    post(routes::leave::accept_coverage),
                )
                // Workload assessment routes
                .route(
                    "/:schoolId/:leaveId/workload/assess",
                    post(routes::leave::assess_workload),
                )
                .route(
                    "/:schoolId/:leaveId/workload/assessment",
                    get(routes::leave::get_workload_assessment),
                )
                // Notification routes
                .route(
                    "/:schoolId/notifications",
                    get(routes::leave::get_notifications),
                )
                .route(
                    "/:schoolId/notifications/:notificationId/read",
                    post(routes::leave::mark_notification_read),
                )
                // Feature flag routes
                .route(
                    "/:schoolId/feature-flags",
                    get(routes::leave::get_feature_flags).post(routes::leave::update_feature_flags),
                ),
        )
        .route(
            "/api/school/:schoolId",
            get(routes::school::get_school_details)
                .put(routes::school::update_school_self)
                .patch(routes::school::change_password_self),
        )
        .route(
            "/api/school-holidays/:schoolId",
            get(routes::attendance::list_school_holidays)
                .post(routes::attendance::create_school_holiday),
        )
        .route(
            "/api/school-holidays/:schoolId/check",
            get(routes::attendance::check_school_holiday),
        )
        .route(
            "/api/school-holidays/:schoolId/:holidayId",
            axum::routing::delete(routes::attendance::delete_school_holiday),
        )
        .route("/api/setup/:schoolId", get(routes::setup::get_setup))
        .route(
            "/api/setup/school",
            post(routes::setup::setup_school_handler),
        )
        .route("/api/task/:schoolId", get(routes::task::list_tasks))
        .route(
            "/api/task/:schoolId/:taskId/status",
            put(routes::task::update_task_status),
        )
        .route(
            "/api/task/ai/:schoolId/generate",
            post(routes::task::ai_generate_tasks),
        )
        .route(
            "/api/task/ai/:schoolId/reorganize",
            post(routes::task::ai_reorganize_tasks),
        )
        .nest(
            "/api/ai",
            Router::new().route("/:schoolId/query", post(routes::ai::query_ai)),
        )
        .nest(
            "/api/ocr-routes",
            Router::new().route("/extract", post(routes::ocr::extract_text)),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::rls::rls_middleware,
        ))
        .layer(DefaultBodyLimit::max(50 * 1024 * 1024)) // 50MB limit for uploads
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
        .layer(make_cors());

    // Merge public static file serving for /uploads — no auth required
    let upload_dir = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".to_string());
    let static_router = Router::new()
        .nest_service("/uploads", ServeDir::new(upload_dir))
        .layer(axum::middleware::from_fn(upload_auth_middleware))
        .layer(make_cors());

    app.merge(static_router).with_state(state)
}
