pub mod academic;
pub mod attendance;
pub mod auth;


pub mod operations;
pub mod people;
pub mod finance;
pub mod system;
pub mod resources;         // renamed from resource
pub mod responsibility;
pub mod payroll;
pub mod admin;
pub mod communication;    // new: notification_service moved here
pub mod traits;
pub mod utils;

// Re-exports to preserve backward compatibility:
pub use academic::academic_service;
pub use academic::academic_utils;
pub use academic::feedback_service;
pub use academic::gradebook_service;
pub use academic::grading_service;
pub use academic::plagiarism_service;

pub use attendance::attendance_service;
pub use attendance::attendance_analytics_service;
pub use attendance::attendance_health_monitor;

pub use auth::auth_service;
pub use attendance::leave_service;

pub use operations::developer_access_service;
pub use operations::admin_automation_service;

pub use people::employee_service;

pub use finance::fee_service;

pub use auth::setup_service;
pub use system::recovery_service;
pub use communication::notification_service;  // moved from system
pub use system::auxiliary_service;

pub use resources::material_monitor;           // renamed from resource
pub use responsibility::responsibility_permissions;

use crate::repository::Repositories;
use crate::services::academic_service::PostgresAcademicService;
use crate::services::admin_automation_service::AdminAutomationService;
use crate::services::attendance_analytics_service::PostgresAttendanceAnalyticsService;
use crate::services::attendance_health_monitor::AttendanceHealthMonitor;
use crate::services::attendance_service::PostgresAttendanceService;
use crate::services::auth_service::PostgresAuthService;
use crate::services::auxiliary_service::PostgresAuxiliaryService;
use crate::services::developer_access_service::DeveloperAccessService;
use crate::services::employee_service::PostgresEmployeeService;
use crate::services::feedback_service::FeedbackService;
use crate::services::fee_service::PostgresFeeService;
use crate::services::gradebook_service::GradebookService;
use crate::services::grading_service::GradingService;
use crate::services::attendance::leave_service::PostgresLeaveService;
use crate::services::notification_service::PostgresNotificationService;
use crate::services::payroll::PostgresPayrollService;
use crate::services::plagiarism_service::PlagiarismService;
use crate::services::resources::PostgresResourceService;
use crate::services::responsibility::PostgresResponsibilityService;
use crate::services::setup_service::PostgresSetupService;
use crate::services::people::student::PostgresStudentService;
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
    pub leave: Arc<dyn LeaveService>,
    pub recovery: Arc<dyn RecoveryService>,
    pub developer_access: Arc<DeveloperAccessService>,
    pub grading: Arc<GradingService>,
    pub feedback: Arc<dyn FeedbackServiceTrait>,
    pub plagiarism: Arc<dyn PlagiarismServiceTrait>,
    pub gradebook: Arc<dyn GradebookServiceTrait>,
    pub admin_automation: Arc<dyn AdminAutomationServiceTrait>,
    pub notification: Arc<dyn NotificationService>,
    pub fcm: Arc<crate::logic::FcmService>,
    pub material_monitor: Arc<MaterialMonitor>,
}


pub fn initialize_services(
    repos: Arc<Repositories>,
    responsibility_cache: Arc<crate::logic::cache_service::ResponsibilityCacheService>,
) -> Services {
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
    
    // Create Material Monitor for shortage alerts
    let material_monitor = Arc::new(MaterialMonitor::new(repos.clone()));

    // Create FCM config
    let fcm_service = Arc::new(crate::logic::FcmService::new());

    // Create attendance analytics service
    let attendance_analytics_service = Arc::new(PostgresAttendanceAnalyticsService::new(repos.clone(), responsibility_cache.clone()));

    let aux_service = Arc::new(PostgresAuxiliaryService::new(repos.clone()));

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
        leave: Arc::new(PostgresLeaveService {
            repos: repos.clone(),
            timetable: Arc::new(crate::logic::timetable_engine::TimetableEngine::new(repos.db_client.pool.clone())),
        }),
        recovery: Arc::new(PostgresRecoveryService {
            repos: repos.clone(),
        }),
        developer_access: Arc::new(DeveloperAccessService::new(repos.clone())),
        grading: Arc::new(GradingService::new(repos.clone())),
        feedback: feedback_service,
        plagiarism: plagiarism_service,
        gradebook: gradebook_service,
        admin_automation: admin_automation_service,
        notification: Arc::new(PostgresNotificationService { repos: repos.clone() }),
        fcm: fcm_service,
        material_monitor,
    }
}
