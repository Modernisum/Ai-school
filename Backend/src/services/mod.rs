pub mod academic_service;
pub mod academic_utils;
pub mod admin_automation_service;
pub mod ai_config_service;
pub mod ai_service;
pub mod attendance_analytics_service;
pub mod attendance_health_monitor;
pub mod attendance_service;
pub mod auth_service;
pub mod auxiliary_service;
pub mod award_service;
pub mod complain_service;
pub mod content_generation_service;
pub mod developer_access_service;
pub mod documentbox_service;
pub mod embedding_service;
pub mod employee_service;
pub mod encrypted_employee_service;
pub mod feedback_service;
pub mod fee_service;
pub mod gradebook_service;
pub mod grading_service;
pub mod leave_service;
pub mod material_monitor;

pub mod notification_service;
pub mod ocr_service;
pub mod operations_service;
pub mod payroll;
pub mod payroll_service;
pub mod plagiarism_service;
pub mod reminder_service;
pub mod resource;
pub mod resource_service;
pub mod responsibility;
pub mod responsibility_permissions;
pub mod responsibility_notifications;
pub mod responsibility_service;
pub mod school_service;
pub mod setup_service;
pub mod student;
pub mod student_service;
pub mod task_service;
pub mod recovery_service;
pub mod traits;

use crate::repository::Repositories;
use crate::services::academic_service::PostgresAcademicService;
use crate::services::admin_automation_service::AdminAutomationService;
use crate::services::ai_config_service::SchoolAiConfigService;
use crate::services::ai_service::PostAiService;
use crate::services::attendance_analytics_service::PostgresAttendanceAnalyticsService;
use crate::services::attendance_health_monitor::AttendanceHealthMonitor;
use crate::services::attendance_service::PostgresAttendanceService;
use crate::services::auth_service::PostgresAuthService;
use crate::services::award_service::PostgresAwardService;
use crate::services::complain_service::PostgresComplainService;
use crate::services::content_generation_service::ContentGenerationServiceImpl;
use crate::services::developer_access_service::DeveloperAccessService;
use crate::services::documentbox_service::PostgresDocumentBoxService;
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
use crate::services::operations_service::PostgresOperationsService;
use crate::services::payroll_service::PostgresPayrollService;
use crate::services::plagiarism_service::PlagiarismService;
use crate::services::reminder_service::PostgresReminderService;
use crate::services::resource_service::PostgresResourceService;
use crate::services::responsibility_service::PostgresResponsibilityService;
use crate::services::school_service::PostgresSchoolService;
use crate::services::setup_service::PostgresSetupService;
use crate::services::student_service::PostgresStudentService;
use crate::services::task_service::PostgresTaskService;
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

    let responsibility_service = Arc::new(PostgresResponsibilityService {
        repos: repos.clone(),
    });

    let academic_service = Arc::new(PostgresAcademicService {
        repos: repos.clone(),
        responsibility: responsibility_service.clone(),
        storage: None,
    });

    // Create new service instances
    let feedback_service = Arc::new(FeedbackService::new(repos.clone()));
    let plagiarism_service = Arc::new(PlagiarismService::new(repos.clone()));
    let gradebook_service = Arc::new(GradebookService::new(repos.clone()));
    let admin_automation_service = Arc::new(AdminAutomationService::new(repos.clone()));
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
        award: Arc::new(PostgresAwardService {
            repos: repos.clone(),
        }),
        complain: Arc::new(PostgresComplainService {
            repos: repos.clone(),
        }),
        reminder: Arc::new(PostgresReminderService {
            repos: repos.clone(),
        }),
        document_box: Arc::new(PostgresDocumentBoxService {
            repos: repos.clone(),
            ai: ai_service.clone(),
        }),
        school: Arc::new(PostgresSchoolService {
            repos: repos.clone(),
        }),
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
