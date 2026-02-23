pub mod academic_service;
pub mod auth_service;
pub mod auxiliary_service;
pub mod employee_service;
pub mod operations_service;
pub mod resource_service;
pub mod setup_service;
pub mod student_service;
pub mod traits;

use crate::repository::Repositories;
use crate::services::academic_service::PostgresAcademicService;
use crate::services::auth_service::PostgresAuthService;
use crate::services::employee_service::PostgresEmployeeService;
use crate::services::operations_service::PostgresOperationsService;
use crate::services::resource_service::{PostgresOCRService, PostgresResourceService};
use crate::services::setup_service::PostgresSetupService;
use crate::services::student_service::PostgresStudentService;
use crate::services::traits::*;
use std::sync::Arc;

pub struct Services {
    pub auth: Arc<dyn AuthService>,
    pub student: Arc<dyn StudentService>,
    pub setup: Arc<dyn SetupService>,
    pub employee: Arc<dyn EmployeeService>,
    pub academic: Arc<dyn AcademicService>,
    pub operations: Arc<dyn OperationsService>,
    pub resource: Arc<dyn ResourceService>,
    pub ocr: Arc<dyn OCRService>,
    pub award: Arc<dyn AwardService>,
    pub complain: Arc<dyn ComplainService>,
    pub reminder: Arc<dyn ReminderService>,
    pub document_box: Arc<dyn DocumentBoxService>,
    pub school: Arc<dyn SchoolService>,
    pub responsibility: Arc<dyn ResponsibilityService>,
    pub task: Arc<dyn TaskService>,
}

pub fn initialize_services(repos: Arc<Repositories>) -> Services {
    let auxiliary_service = Arc::new(
        crate::services::auxiliary_service::PostgresAuxiliaryService {
            repos: repos.clone(),
        },
    );

    Services {
        auth: Arc::new(PostgresAuthService {
            repos: repos.clone(),
        }),
        student: Arc::new(PostgresStudentService {
            repos: repos.clone(),
        }),
        setup: Arc::new(PostgresSetupService {
            repos: repos.clone(),
        }),
        employee: Arc::new(PostgresEmployeeService {
            repos: repos.clone(),
        }),
        academic: Arc::new(PostgresAcademicService {
            repos: repos.clone(),
        }),
        operations: Arc::new(PostgresOperationsService {
            repos: repos.clone(),
        }),
        resource: Arc::new(PostgresResourceService {
            repos: repos.clone(),
        }),
        ocr: Arc::new(PostgresOCRService {
            repos: repos.clone(),
        }),
        award: auxiliary_service.clone() as Arc<dyn AwardService>,
        complain: auxiliary_service.clone() as Arc<dyn ComplainService>,
        reminder: auxiliary_service.clone() as Arc<dyn ReminderService>,
        document_box: auxiliary_service.clone() as Arc<dyn DocumentBoxService>,
        school: auxiliary_service.clone() as Arc<dyn SchoolService>,
        responsibility: auxiliary_service.clone() as Arc<dyn ResponsibilityService>,
        task: auxiliary_service as Arc<dyn TaskService>,
    }
}
