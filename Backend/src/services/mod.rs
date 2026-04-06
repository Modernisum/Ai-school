pub mod academic_service;
pub mod academic_utils;
pub mod ai_service;
pub mod attendance_service;
pub mod auth_service;
pub mod auxiliary_service;
pub mod employee_service;
pub mod fee_service;
pub mod leave_service;
pub mod operations_service;
pub mod payroll_service;
pub mod resource_service;
pub mod setup_service;
pub mod student_service;
pub mod recovery_service;
pub mod traits;

use crate::repository::Repositories;
use crate::services::academic_service::PostgresAcademicService;
use crate::services::ai_service::PostAiService;
use crate::services::attendance_service::PostgresAttendanceService;
use crate::services::auth_service::PostgresAuthService;
use crate::services::employee_service::PostgresEmployeeService;
use crate::services::fee_service::PostgresFeeService;
use crate::services::leave_service::PostgresLeaveService;
use crate::services::operations_service::PostgresOperationsService;
use crate::services::payroll_service::PostgresPayrollService;
use crate::services::resource_service::{PostgresOCRService, PostgresResourceService};
use crate::services::setup_service::PostgresSetupService;
use crate::services::student_service::PostgresStudentService;
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
    let ocr_service = Arc::new(PostgresOCRService {
        repos: repos.clone(),
    });

    let auxiliary_service = Arc::new(
        crate::services::auxiliary_service::PostgresAuxiliaryService {
            repos: repos.clone(),
            ocr: ocr_service.clone(),
            ai: ai_service.clone(),
        },
    );

    let fee_service = Arc::new(PostgresFeeService {
        repos: repos.clone(),
    });

    let academic_service = Arc::new(PostgresAcademicService {
        repos: repos.clone(),
        responsibility: auxiliary_service.clone() as Arc<dyn ResponsibilityService>,
    });

    Services {
        auth: Arc::new(PostgresAuthService {
            repos: repos.clone(),
        }),
        student: Arc::new(PostgresStudentService {
            repos: repos.clone(),
        }),
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
        payroll: Arc::new(PostgresPayrollService {
            repos: repos.clone(),
        }),
        coupon: fee_service as Arc<dyn CouponService>,
        resource: Arc::new(PostgresResourceService {
            repos: repos.clone(),
        }),
        ocr: ocr_service,
        award: auxiliary_service.clone() as Arc<dyn AwardService>,
        complain: auxiliary_service.clone() as Arc<dyn ComplainService>,
        reminder: auxiliary_service.clone() as Arc<dyn ReminderService>,
        document_box: auxiliary_service.clone() as Arc<dyn DocumentBoxService>,
        school: auxiliary_service.clone() as Arc<dyn SchoolService>,
        responsibility: auxiliary_service.clone() as Arc<dyn ResponsibilityService>,
        task: auxiliary_service as Arc<dyn TaskService>,
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
