pub mod postgres;
pub mod traits;
pub mod base;
pub mod query_builder;

// Domain-aligned submodule folders
pub mod people;
pub mod academic;
pub mod attendance;
pub mod finance;
pub mod leave;
pub mod resources;
pub mod operations;
pub mod communication;
pub mod system;
pub mod auth;
pub mod admin;
pub mod ai;
pub mod cms;
pub mod school;

// Backward-compatible re-exports (so existing `crate::repository::X_repo::...` still works)
pub use people::student_repo;
pub use people::employee_repo;
pub use academic::academic_repo;
pub use academic::grading_repo;
pub use attendance::attendance_repo;
pub use finance::fee_repo;
pub use finance::coupon_repo;
pub use finance::payroll_repo;
pub use finance::transaction_repo;
pub use leave::leave_repo;
pub use resources::resource_repo;
pub use resources::award_repo;
pub use resources::document_box_repo;
pub use resources::storage_repo;
pub use operations::task_repo;
pub use operations::complain_repo;
pub use operations::reminder_repo;
pub use operations::responsibility_repo;
pub use communication::communication_repo;
pub use communication::notification_repo;
pub use system::geo_repo;
pub use system::api_key_repo;
pub use system::config_repo;
pub use system::system_log_repo;
pub use system::analytics_repo;
pub use system::audit_repo;
pub use auth::auth_repo;
pub use auth::global_user_repo;
pub use admin::super_admin_repo;
pub use admin::admin_automation_repo;
pub use admin::developer_access_repo;
pub use ai::ai_repo;
pub use cms::cms_repo;
pub use school::school_repo;

use std::sync::Arc;
pub use traits::*;

pub struct Repositories {
    pub auth: Arc<dyn AuthRepository + Send + Sync>,
    pub student: Arc<dyn StudentRepository + Send + Sync>,
    pub employee: Arc<dyn EmployeeRepository + Send + Sync>,
    pub academic: Arc<dyn AcademicRepository + Send + Sync>,
    pub attendance: Arc<dyn AttendanceRepository + Send + Sync>,
    pub fee: Arc<dyn FeeRepository + Send + Sync>,
    pub coupon: Arc<dyn CouponRepository + Send + Sync>,
    pub payroll: Arc<dyn PayrollRepository + Send + Sync>,
    pub transaction: Arc<dyn TransactionRepository + Send + Sync>,
    pub resource: Arc<dyn ResourceRepository + Send + Sync>,
    pub award: Arc<dyn AwardRepository + Send + Sync>,
    pub complain: Arc<dyn ComplainRepository + Send + Sync>,
    pub reminder: Arc<dyn ReminderRepository + Send + Sync>,
    pub document_box: Arc<dyn DocumentBoxRepository + Send + Sync>,
    pub school: Arc<dyn SchoolRepository + Send + Sync>,
    pub responsibility: Arc<dyn ResponsibilityRepository + Send + Sync>,
    pub task: Arc<dyn TaskRepository + Send + Sync>,
    pub leave: Arc<dyn LeaveRepository + Send + Sync>,
    pub analytics: Arc<dyn traits::AnalyticsRepository + Send + Sync>,
    pub audit: Arc<dyn AuditRepository + Send + Sync>,
    pub global_user: Arc<dyn GlobalUserRepository + Send + Sync>,
    pub storage: Arc<dyn StorageRepository + Send + Sync>,
    pub notification: Arc<dyn NotificationRepository + Send + Sync>,
    pub grading: Arc<dyn GradingRepository + Send + Sync>,
    pub config: Arc<dyn ConfigRepository + Send + Sync>,
    pub geo: Arc<dyn GeoRepository + Send + Sync>,
    pub api_key: Arc<dyn ApiKeyRepository + Send + Sync>,
    pub cms: Arc<dyn CmsRepository + Send + Sync>,
    pub communication: Arc<dyn CommunicationRepository + Send + Sync>,
    pub system_log: Arc<dyn SystemLogRepository + Send + Sync>,
    pub super_admin: Arc<dyn SuperAdminRepository + Send + Sync>,
    pub admin_automation: Arc<dyn AdminAutomationRepository + Send + Sync>,
    pub developer_access: Arc<dyn DeveloperAccessRepository + Send + Sync>,
    pub ai: Arc<dyn AiRepository + Send + Sync>,
    pub base: Arc<base::PostgresBaseRepository>,
    pub db_client: Arc<crate::db::DbClient>,
}

pub async fn initialize_repositories(
    db_client: Arc<crate::db::DbClient>,
    responsibility_cache: Arc<crate::logic::cache_service::ResponsibilityCacheService>,
) -> Repositories {
    let auth_repo: Arc<dyn traits::AuthRepository + Send + Sync> = Arc::new(auth_repo::PostgresAuthRepository {
        client: db_client.clone(),
    });
    let student_repo: Arc<dyn traits::StudentRepository + Send + Sync> = Arc::new(student_repo::PostgresStudentRepository {
        client: db_client.clone(),
    });
    let employee_repo: Arc<dyn traits::EmployeeRepository + Send + Sync> = Arc::new(employee_repo::PostgresEmployeeRepository {
        client: db_client.clone(),
    });
    let academic_repo: Arc<dyn traits::AcademicRepository + Send + Sync> = Arc::new(academic_repo::PostgresAcademicRepository {
        client: db_client.clone(),
    });
    let attendance_repo: Arc<dyn traits::AttendanceRepository + Send + Sync> = Arc::new(attendance_repo::PostgresAttendanceRepository {
        client: db_client.clone(),
    });
    let fee_repo: Arc<dyn traits::FeeRepository + Send + Sync> = Arc::new(fee_repo::PostgresFeeRepository {
        client: db_client.clone(),
    });
    let coupon_repo: Arc<dyn traits::CouponRepository + Send + Sync> = Arc::new(coupon_repo::PostgresCouponRepository {
        client: db_client.clone(),
    });
    let payroll_repo: Arc<dyn traits::PayrollRepository + Send + Sync> = Arc::new(payroll_repo::PostgresPayrollRepository {
        client: db_client.clone(),
    });
    let transaction_repo: Arc<dyn traits::TransactionRepository + Send + Sync> = Arc::new(transaction_repo::PostgresTransactionRepository {
        client: db_client.clone(),
    });
    let resource_repo: Arc<dyn traits::ResourceRepository + Send + Sync> = Arc::new(resource_repo::PostgresResourceRepository {
        client: db_client.clone(),
    });

    let award_repo: Arc<dyn traits::AwardRepository + Send + Sync> = Arc::new(award_repo::PostgresAwardRepository {
        client: db_client.clone(),
    });
    let complain_repo: Arc<dyn traits::ComplainRepository + Send + Sync> = Arc::new(complain_repo::PostgresComplainRepository {
        client: db_client.clone(),
    });
    let reminder_repo: Arc<dyn traits::ReminderRepository + Send + Sync> = Arc::new(reminder_repo::PostgresReminderRepository {
        client: db_client.clone(),
    });
    let document_box_repo: Arc<dyn traits::DocumentBoxRepository + Send + Sync> = Arc::new(document_box_repo::PostgresDocumentBoxRepository {
        client: db_client.clone(),
    });

    let school_repo: Arc<dyn traits::SchoolRepository + Send + Sync> = Arc::new(school_repo::PostgresSchoolRepository {
        client: db_client.clone(),
    });

    let base_responsibility_repo = responsibility_repo::PostgresResponsibilityRepository {
        client: db_client.clone(),
    };

    // Create cached responsibility repository with shared Redis cache
    let responsibility_repo: Arc<dyn traits::ResponsibilityRepository + Send + Sync> =
        Arc::new(crate::logic::cache_service::CachedResponsibilityRepository::new(
            Arc::new(base_responsibility_repo),
            responsibility_cache,
        ));
    let task_repo: Arc<dyn traits::TaskRepository + Send + Sync> = Arc::new(task_repo::PostgresTaskRepository {
        client: db_client.clone(),
    });
    let leave_repo: Arc<dyn traits::LeaveRepository + Send + Sync> = Arc::new(leave_repo::PostgresLeaveRepository {
        client: db_client.clone(),
    });
    let analytics_repo: Arc<dyn traits::AnalyticsRepository + Send + Sync> = Arc::new(analytics_repo::PostgresAnalyticsRepository {
        client: db_client.clone(),
    });

    let audit_repo: Arc<dyn traits::AuditRepository + Send + Sync> = Arc::new(audit_repo::PostgresAuditRepository {
        client: db_client.clone(),
    });

    let global_user_repo: Arc<dyn traits::GlobalUserRepository + Send + Sync> = Arc::new(global_user_repo::PostgresGlobalUserRepository {
        client: db_client.clone(),
    });

    let storage_repo: Arc<dyn traits::StorageRepository + Send + Sync> = Arc::new(storage_repo::PostgresStorageRepository::new(db_client.pool.clone()));

    let notification_repo: Arc<dyn traits::NotificationRepository + Send + Sync> = Arc::new(notification_repo::PostgresNotificationRepository {
        client: db_client.clone(),
    });

    let grading_repo: Arc<dyn traits::GradingRepository + Send + Sync> = Arc::new(grading_repo::PostgresGradingRepository {
        client: db_client.clone(),
    });

    let config_repo: Arc<dyn traits::ConfigRepository + Send + Sync> = Arc::new(config_repo::PostgresConfigRepository::new(
        db_client.clone(),
    ));

    let geo_repo: Arc<dyn traits::GeoRepository + Send + Sync> = Arc::new(geo_repo::PostgresGeoRepository::new(
        db_client.clone(),
    ));

    let api_key_repo: Arc<dyn traits::ApiKeyRepository + Send + Sync> = Arc::new(api_key_repo::PostgresApiKeyRepository::new(
        db_client.clone(),
    ));

    let cms_repo: Arc<dyn traits::CmsRepository + Send + Sync> = Arc::new(cms_repo::PostgresCmsRepository::new(
        db_client.clone(),
    ));

    let communication_repo: Arc<dyn traits::CommunicationRepository + Send + Sync> = Arc::new(communication_repo::PostgresCommunicationRepository::new(
        db_client.clone(),
    ));

    let system_log_repo: Arc<dyn traits::SystemLogRepository + Send + Sync> = Arc::new(system_log_repo::PostgresSystemLogRepository::new(
        db_client.clone(),
    ));

    let super_admin_repo: Arc<dyn traits::SuperAdminRepository + Send + Sync> = Arc::new(super_admin_repo::PostgresSuperAdminRepository {
        client: db_client.clone(),
    });

    let admin_automation_repo: Arc<dyn traits::AdminAutomationRepository + Send + Sync> = Arc::new(admin_automation_repo::PostgresAdminAutomationRepository {
        client: db_client.clone(),
    });

    let developer_access_repo: Arc<dyn traits::DeveloperAccessRepository + Send + Sync> = Arc::new(developer_access_repo::PostgresDeveloperAccessRepository {
        client: db_client.clone(),
    });

    let ai_repo: Arc<dyn traits::AiRepository + Send + Sync> = Arc::new(ai_repo::PostgresAiRepository {
        client: db_client.clone(),
    });

    let base_repo = Arc::new(base::PostgresBaseRepository::new(db_client.clone()));

    Repositories {
        auth: auth_repo,
        student: student_repo,
        employee: employee_repo,
        academic: academic_repo,
        attendance: attendance_repo,
        fee: fee_repo,
        coupon: coupon_repo,
        payroll: payroll_repo,
        transaction: transaction_repo,
        resource: resource_repo,
        award: award_repo,
        complain: complain_repo,
        reminder: reminder_repo,
        document_box: document_box_repo,
        school: school_repo,
        responsibility: responsibility_repo,
        storage: storage_repo,
        notification: notification_repo,
        task: task_repo,
        leave: leave_repo,
        analytics: analytics_repo,
        audit: audit_repo,
        global_user: global_user_repo,
        grading: grading_repo,
        config: config_repo,
        geo: geo_repo,
        api_key: api_key_repo,
        cms: cms_repo,
        communication: communication_repo,
        system_log: system_log_repo,
        super_admin: super_admin_repo,
        admin_automation: admin_automation_repo,
        developer_access: developer_access_repo,
        ai: ai_repo,
        base: base_repo,
        db_client,
    }
}
