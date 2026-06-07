pub mod academic;
pub mod ai;
pub mod attendance;
pub mod auth;
pub mod leave;
pub mod ocr;
pub mod operations;
pub mod people;
pub mod finance;
pub mod system;
pub mod resource;
pub mod responsibility;
pub mod payroll;
pub mod student;
pub mod super_admin;
pub mod traits;
pub mod utils;

// Re-exports to preserve backward compatibility:
pub use academic::academic_service;
pub use academic::academic_utils;
pub use academic::feedback_service;
pub use academic::gradebook_service;
pub use academic::grading_service;
pub use academic::plagiarism_service;

pub use ai::ai_service;
pub use ai::ai_config_service;
pub use ai::embedding_service;
pub use ai::content_generation_service;

pub use attendance::attendance_service;
pub use attendance::attendance_analytics_service;
pub use attendance::attendance_health_monitor;

pub use auth::auth_service;
pub use leave::leave_service;
pub use ocr::ocr_service;

pub use operations::operations_service;
pub use operations::task_service;
pub use operations::developer_access_service;
pub use operations::admin_automation_service;

pub use people::employee_service;
pub use people::encrypted_employee_service;

pub use finance::fee_service;

pub use system::setup_service;
pub use system::recovery_service;
pub use system::notification_service;
pub use system::auxiliary_service;

pub use resource::material_monitor;
pub use responsibility::responsibility_permissions;

use crate::repository::Repositories;
use crate::services::academic_service::PostgresAcademicService;
use crate::services::admin_automation_service::AdminAutomationService;
use crate::services::ai_config_service::SchoolAiConfigService;
use crate::services::ai_service::PostAiService;
use crate::services::attendance_analytics_service::PostgresAttendanceAnalyticsService;
use crate::services::attendance_health_monitor::AttendanceHealthMonitor;
use crate::services::attendance_service::PostgresAttendanceService;
use crate::services::auth_service::PostgresAuthService;
use crate::services::auxiliary_service::PostgresAuxiliaryService;
use crate::services::content_generation_service::ContentGenerationServiceImpl;
use crate::services::developer_access_service::DeveloperAccessService;
use crate::services::embedding_service::PostgresEmbeddingService;
use crate::services::employee_service::PostgresEmployeeService;
use crate::services::encrypted_employee_service::EncryptedEmployeeService;
use crate::services::feedback_service::FeedbackService;
use crate::services::fee_service::PostgresFeeService;
use crate::services::gradebook_service::GradebookService;
use crate::services::grading_service::GradingService;
use crate::services::leave_service::PostgresLeaveService;
use crate::services::notification_service::PostgresNotificationService;
use crate::services::ocr_service::OcrService;
use crate::services::operations::operations_service::PostgresOperationsService;
use crate::services::payroll::PostgresPayrollService;
use crate::services::plagiarism_service::PlagiarismService;
use crate::services::resource::PostgresResourceService;
use crate::services::responsibility::PostgresResponsibilityService;
use crate::services::setup_service::PostgresSetupService;
use crate::services::student::PostgresStudentService;
use crate::services::operations::task_service::PostgresTaskService;
use crate::services::recovery_service::PostgresRecoveryService;
use crate::services::material_monitor::MaterialMonitor;
use crate::services::traits::*;
use std::sync::Arc;

pub struct Services {
    pub auth: Arc<dyn AuthService>,
    pub student: Arc<dyn StudentService>,
    pub setup: Arc<dyn SetupService>,
    pub employee: Arc<dyn EmployeeService>,
    pub academic: Arc<dyn AcademicService>,
    pub operations: Arc<dyn OperationsService>,
    pub attendance: Arc<dyn AttendanceService>,
    pub attendance_analytics: Arc<dyn AttendanceAnalyticsService>,
    pub attendance_health_monitor: Arc<AttendanceHealthMonitor>,
    pub fee: Arc<dyn FeeService>,
    pub payroll: Arc<dyn PayrollService>,
    pub coupon: Arc<dyn CouponService>,
    pub resource: Arc<dyn ResourceService>,
    pub award: Arc<dyn AwardService>,
    pub complain: Arc<dyn ComplainService>,
    pub reminder: Arc<dyn ReminderService>,
    pub document_box: Arc<dyn DocumentBoxService>,
    pub school: Arc<dyn SchoolService>,
    pub responsibility: Arc<dyn ResponsibilityService>,
    pub task: Arc<dyn TaskService>,
    pub leave: Arc<dyn LeaveService>,
    pub ai: Arc<dyn AiService>,
    pub ai_config: Arc<dyn AiConfigService>,
    pub embedding: Arc<dyn EmbeddingService>,
    pub recovery: Arc<dyn RecoveryService>,
    pub developer_access: Arc<DeveloperAccessService>,
    pub grading: Arc<GradingService>,
    pub feedback: Arc<dyn FeedbackServiceTrait>,
    pub plagiarism: Arc<dyn PlagiarismServiceTrait>,
    pub gradebook: Arc<dyn GradebookServiceTrait>,
    pub admin_automation: Arc<dyn AdminAutomationServiceTrait>,
    pub content_generation: Arc<dyn ContentGenerationService>,
    pub notification: Arc<dyn NotificationService>,
    pub fcm: Arc<crate::logic::FcmService>,
    pub material_monitor: Arc<MaterialMonitor>,
    pub ocr: Arc<OcrService>,
}


pub fn initialize_services(
    repos: Arc<Repositories>,
    responsibility_cache: Arc<crate::logic::cache_service::ResponsibilityCacheService>,
) -> Services {
    let ai_orchestrator = Arc::new(crate::logic::AiOrchestrator::new(
        repos.clone(),
    ));
    let ai_service = Arc::new(PostAiService::new(ai_orchestrator));
    let embedding_service = Arc::new(PostgresEmbeddingService::new(repos.clone()));
    let fee_service = Arc::new(PostgresFeeService {
        repos: repos.clone(),
    });

    let responsibility_service = Arc::new(PostgresResponsibilityService::new(repos.clone()));

    let academic_service = Arc::new(PostgresAcademicService {
        repos: repos.clone(),
        responsibility: responsibility_service.clone(),
        storage: None,
    });

    // Create new service instances
    let feedback_service = Arc::new(FeedbackService::new(repos.clone()));
    let plagiarism_service = Arc::new(PlagiarismService::new(repos.clone()));
    let gradebook_service = Arc::new(GradebookService::new(repos.clone()));
    let email_service = Arc::new(crate::logic::EmailService::new());
    let admin_automation_service = Arc::new(AdminAutomationService::new(repos.clone(), email_service.clone()));
    let content_generation_service = Arc::new(ContentGenerationServiceImpl::new(repos.clone(), ai_service.clone()));
    
    // Create Material Monitor for shortage alerts
    let material_monitor = Arc::new(MaterialMonitor::new(repos.clone()));

    // Create OCR Service with provider registry
    let provider_registry = Arc::new(
        crate::logic::ai::providers::registry::ProviderRegistry::new(repos.db_client.clone())
    );
    let ocr_service = Arc::new(OcrService::new(provider_registry));

    // Create FCM config
    let fcm_service = Arc::new(crate::logic::FcmService::new());
    
    // Create AI config service
    let ai_config_service = Arc::new(SchoolAiConfigService::new(repos.db_client.clone()));

    // Create attendance analytics service
    let attendance_analytics_service = Arc::new(PostgresAttendanceAnalyticsService::new(repos.clone(), responsibility_cache.clone()));

    let aux_service = Arc::new(PostgresAuxiliaryService::new(repos.clone(), ai_service.clone()));

    Services {
        auth: Arc::new(PostgresAuthService {
            repos: repos.clone(),
        }),
        student: Arc::new(PostgresStudentService::new(repos.clone())),
        setup: Arc::new(PostgresSetupService {
            repos: repos.clone(),
            academic: academic_service.clone(),
        }),
        employee: Arc::new(PostgresEmployeeService {
            repos: repos.clone(),
        }),
        academic: academic_service,
        operations: Arc::new(PostgresOperationsService {
            repos: repos.clone(),
        }),
        attendance: Arc::new(PostgresAttendanceService {
            repos: repos.clone(),
        }),
        attendance_analytics: attendance_analytics_service,
        attendance_health_monitor: Arc::new(AttendanceHealthMonitor::new(repos.clone())),
        fee: fee_service.clone(),
        payroll: Arc::new(PostgresPayrollService::new(repos.clone())),
        coupon: fee_service,
        resource: Arc::new(PostgresResourceService::new(repos.clone(), Some(material_monitor.clone()))),
        award: aux_service.clone(),
        complain: aux_service.clone(),
        reminder: aux_service.clone(),
        document_box: aux_service.clone(),
        school: aux_service,
        responsibility: responsibility_service,
        task: Arc::new(PostgresTaskService {
            repos: repos.clone(),
        }),
        leave: Arc::new(PostgresLeaveService {
            repos: repos.clone(),
            timetable: Arc::new(crate::logic::timetable_engine::TimetableEngine::new(repos.db_client.pool.clone())),
        }),
        ai: ai_service,
        ai_config: ai_config_service,
        embedding: embedding_service,
        recovery: Arc::new(PostgresRecoveryService {
            repos: repos.clone(),
        }),
        developer_access: Arc::new(DeveloperAccessService::new(repos.clone(), repos.db_client.pool.clone())),
        grading: Arc::new(GradingService::new(repos.clone())),
        feedback: feedback_service,
        plagiarism: plagiarism_service,
        gradebook: gradebook_service,
        admin_automation: admin_automation_service,
        content_generation: content_generation_service,
        notification: Arc::new(PostgresNotificationService { repos: repos.clone() }),
        fcm: fcm_service,
        material_monitor,
        ocr: ocr_service,
    }
}
