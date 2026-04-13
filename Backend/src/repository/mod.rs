pub mod postgres;
pub mod traits;
pub mod base;
pub mod auth_repo;
pub mod student_repo;
pub mod employee_repo;
pub mod academic_repo;
pub mod resource_repo;
pub mod analytics_repo;
pub mod audit_repo;
pub mod leave_repo;
pub mod task_repo;
pub mod global_user_repo;
pub mod attendance_repo;
pub mod fee_repo;
pub mod coupon_repo;
pub mod payroll_repo;
pub mod transaction_repo;
pub mod misc_repo;
pub mod storage_repo;
pub mod query_builder;
pub mod grading_repo;

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
    pub ocr: Arc<dyn OCRRepository + Send + Sync>,
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
    pub grading: Arc<dyn GradingRepository + Send + Sync>,
    pub db_client: Arc<crate::db::DbClient>,
}

pub async fn initialize_repositories(
    ocr_pipeline: Arc<crate::logic::ocr_pipeline::OcrPipeline>,
) -> Repositories {
    let db_client: Arc<crate::db::DbClient> = Arc::new(
        crate::db::init()
            .await
            .expect("Failed to initialize database"),
    );

    let ocr_repo: Arc<dyn traits::OCRRepository + Send + Sync> = Arc::new(misc_repo::PostgresOCRRepository {
        client: db_client.clone(),
        pipeline: ocr_pipeline,
    });

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

    let award_repo: Arc<dyn traits::AwardRepository + Send + Sync> = Arc::new(misc_repo::PostgresAwardRepository {
        client: db_client.clone(),
    });
    let complain_repo: Arc<dyn traits::ComplainRepository + Send + Sync> = Arc::new(misc_repo::PostgresComplainRepository {
        client: db_client.clone(),
    });
    let reminder_repo: Arc<dyn traits::ReminderRepository + Send + Sync> = Arc::new(misc_repo::PostgresReminderRepository {
        client: db_client.clone(),
    });
    let document_box_repo: Arc<dyn traits::DocumentBoxRepository + Send + Sync> = Arc::new(misc_repo::PostgresDocumentBoxRepository {
        client: db_client.clone(),
    });

    let school_repo: Arc<dyn traits::SchoolRepository + Send + Sync> = Arc::new(misc_repo::PostgresSchoolRepository {
        client: db_client.clone(),
    });
    // Create the base responsibility repository
    let base_responsibility_repo = misc_repo::PostgresResponsibilityRepository {
        client: db_client.clone(),
    };
    
    let responsibility_cache = Arc::new(crate::logic::cache_service::ResponsibilityCacheService::new(
        db_client.redis.clone()
    ));

    // Create cached responsibility repository with Redis caching
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

    let grading_repo: Arc<dyn traits::GradingRepository + Send + Sync> = Arc::new(grading_repo::PostgresGradingRepository {
        client: db_client.clone(),
    });

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
        ocr: ocr_repo,
        award: award_repo,
        complain: complain_repo,
        reminder: reminder_repo,
        document_box: document_box_repo,
        school: school_repo,
        responsibility: responsibility_repo,
        storage: storage_repo,
        task: task_repo,
        leave: leave_repo,
        analytics: analytics_repo,
        audit: audit_repo,
        global_user: global_user_repo,
        grading: grading_repo,
        db_client,
    }
}
