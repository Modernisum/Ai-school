pub mod academic_service;
pub mod academic_utils;
pub mod ai_service;
pub mod attendance_service;
pub mod auth_service;
pub mod auxiliary_service;
pub mod award_service;
pub mod complain_service;
pub mod documentbox_service;
pub mod employee_service;
pub mod fee_service;
pub mod leave_service;
pub mod ocr_service;
pub mod operations_service;
pub mod payroll;
pub mod payroll_service;
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
use crate::services::ai_service::PostAiService;
use crate::services::attendance_service::PostgresAttendanceService;
use crate::services::auth_service::PostgresAuthService;
use crate::services::award_service::PostgresAwardService;
use crate::services::complain_service::PostgresComplainService;
use crate::services::documentbox_service::PostgresDocumentBoxService;
use crate::services::employee_service::PostgresEmployeeService;
use crate::services::fee_service::PostgresFeeService;
use crate::services::leave_service::PostgresLeaveService;
use crate::services::ocr_service::PostgresOCRService;
use crate::services::operations_service::PostgresOperationsService;
use crate::services::payroll_service::PostgresPayrollService;
use crate::services::reminder_service::PostgresReminderService;
use crate::services::resource_service::PostgresResourceService;
use crate::services::responsibility_service::PostgresResponsibilityService;
use crate::services::school_service::PostgresSchoolService;
use crate::services::setup_service::PostgresSetupService;
use crate::services::student_service::PostgresStudentService;
use crate::services::task_service::PostgresTaskService;
use crate::services::recovery_service::PostgresRecoveryService;
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
    pub fee: Arc<dyn FeeService>,
    pub payroll: Arc<dyn PayrollService>,
    pub coupon: Arc<dyn CouponService>,
    pub resource: Arc<dyn ResourceService>,
    pub ocr: Arc<dyn OCRService>,
    pub award: Arc<dyn AwardService>,
    pub complain: Arc<dyn ComplainService>,
    pub reminder: Arc<dyn ReminderService>,
    pub document_box: Arc<dyn DocumentBoxService>,
    pub school: Arc<dyn SchoolService>,
    pub responsibility: Arc<dyn ResponsibilityService>,
    pub task: Arc<dyn TaskService>,
    pub leave: Arc<dyn LeaveService>,
    pub ai: Arc<dyn AiService>,
    pub recovery: Arc<dyn RecoveryService>,
}

pub fn initialize_services(repos: Arc<Repositories>) -> Services {
    let ai_orchestrator = Arc::new(crate::logic::ai_orchestrator::AiOrchestrator::new(
        repos.clone(),
    ));
    let ai_service = Arc::new(PostAiService::new(ai_orchestrator));
    let ocr_service = Arc::new(PostgresOCRService::new(repos.clone()));

    let fee_service = Arc::new(PostgresFeeService {
        repos: repos.clone(),
    });

    let responsibility_service = Arc::new(PostgresResponsibilityService {
        repos: repos.clone(),
    });

    let academic_service = Arc::new(PostgresAcademicService {
        repos: repos.clone(),
        responsibility: responsibility_service.clone(),
    });

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
        fee: fee_service.clone() as Arc<dyn FeeService>,
        payroll: Arc::new(PostgresPayrollService::new(repos.clone())),
        coupon: fee_service as Arc<dyn CouponService>,
        resource: Arc::new(PostgresResourceService::new(repos.clone())),
        ocr: ocr_service.clone(),
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
            ocr: ocr_service.clone(),
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
        recovery: Arc::new(PostgresRecoveryService {
            repos: repos.clone(),
        }),
    }
}
