pub mod postgres;
pub mod traits;

use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;
use traits::*;

pub struct Repositories {
    pub auth: Arc<dyn AuthRepository + Send + Sync>,
    pub student: Arc<dyn StudentRepository + Send + Sync>,
    pub employee: Arc<dyn EmployeeRepository + Send + Sync>,
    pub academic: Arc<dyn AcademicRepository + Send + Sync>,
    pub operations: Arc<dyn OperationsRepository + Send + Sync>,
    pub resource: Arc<dyn ResourceRepository + Send + Sync>,
    pub ocr: Arc<dyn OCRRepository + Send + Sync>,
    pub award: Arc<dyn AwardRepository + Send + Sync>,
    pub complain: Arc<dyn ComplainRepository + Send + Sync>,
    pub reminder: Arc<dyn ReminderRepository + Send + Sync>,
    pub document_box: Arc<dyn DocumentBoxRepository + Send + Sync>,
    pub school: Arc<dyn SchoolRepository + Send + Sync>,
    pub responsibility: Arc<dyn ResponsibilityRepository + Send + Sync>,
    pub task: Arc<dyn TaskRepository + Send + Sync>,
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

    let ocr_repo = Arc::new(crate::repository::postgres::PostgresOCRRepository {
        client: db_client.clone(),
        pipeline: ocr_pipeline,
    });

    let auth_repo = Arc::new(crate::repository::postgres::PostgresAuthRepository {
        client: db_client.clone(),
    });
    let student_repo = Arc::new(crate::repository::postgres::PostgresStudentRepository {
        client: db_client.clone(),
    });
    let employee_repo = Arc::new(crate::repository::postgres::PostgresEmployeeRepository {
        client: db_client.clone(),
    });
    let academic_repo = Arc::new(crate::repository::postgres::PostgresAcademicRepository {
        client: db_client.clone(),
    });
    let operations_repo = Arc::new(crate::repository::postgres::PostgresOperationsRepository {
        client: db_client.clone(),
    });
    let resource_repo = Arc::new(crate::repository::postgres::PostgresResourceRepository {
        client: db_client.clone(),
    });

    let award_repo = Arc::new(crate::repository::postgres::PostgresAwardRepository {
        client: db_client.clone(),
    });
    let complain_repo = Arc::new(crate::repository::postgres::PostgresComplainRepository {
        client: db_client.clone(),
    });
    let reminder_repo = Arc::new(crate::repository::postgres::PostgresReminderRepository {
        client: db_client.clone(),
    });
    let document_box_repo = Arc::new(crate::repository::postgres::PostgresDocumentBoxRepository {
        client: db_client.clone(),
    });

    let school_repo = Arc::new(crate::repository::postgres::PostgresSchoolRepository {
        client: db_client.clone(),
    });
    let responsibility_repo = Arc::new(
        crate::repository::postgres::PostgresResponsibilityRepository {
            client: db_client.clone(),
        },
    );
    let task_repo = Arc::new(crate::repository::postgres::PostgresTaskRepository {
        client: db_client.clone(),
    });

    Repositories {
        auth: auth_repo,
        student: student_repo,
        employee: employee_repo,
        academic: academic_repo,
        operations: operations_repo,
        resource: resource_repo,
        ocr: ocr_repo,
        award: award_repo,
        complain: complain_repo,
        reminder: reminder_repo,
        document_box: document_box_repo,
        school: school_repo,
        responsibility: responsibility_repo,
        task: task_repo,
        db_client,
    }
}
