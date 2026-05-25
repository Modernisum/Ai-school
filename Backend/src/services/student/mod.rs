use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

mod crud;
mod queries;
mod validation;
mod encrypted_service;

pub use crud::StudentCrud;
pub use queries::StudentQueries;
pub use validation::StudentValidation;
pub use encrypted_service::EncryptedStudentService;

pub struct PostgresStudentService {
    pub repos: Arc<Repositories>,
    pub crud: StudentCrud,
}

impl PostgresStudentService {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self {
            crud: StudentCrud::new(repos.clone()),
            repos,
        }
    }
}

#[async_trait]
impl StudentService for PostgresStudentService {
    async fn create_student(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        self.crud.create_student(school_id, admin_id, data).await
    }

    async fn bulk_create_students(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Vec<Value>,
    ) -> AppResult<Value> {
        self.crud.bulk_create_students(school_id, admin_id, data).await
    }

    async fn list_students(
        &self,
        school_id: &str,
    ) -> AppResult<Vec<Value>> {
        self.crud.list_students(school_id).await
    }
async fn list_students_paginated(
    &self,
    school_id: &str,
    page: i32,
    limit: i32,
    space_id: Option<&str>,
    status: Option<&str>,
    search: Option<&str>,
) -> AppResult<(Vec<Value>, i64)> {
    self.repos.student.get_students_paginated(
        school_id,
        page,
        limit,
        space_id,
        None, // section
        status,
        search,
    ).await.map_err(AppError::from)
}

    async fn list_students_by_space(
        &self,
        school_id: &str,
        space_id: &str,
    ) -> AppResult<Vec<Value>> {
        self.crud.list_students_by_space(school_id, space_id).await
    }

    async fn get_student(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> AppResult<Option<Value>> {
        self.crud.get_student(school_id, student_id).await
    }

    async fn update_student(
        &self,
        school_id: &str,
        student_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()> {
        self.crud.update_student(school_id, student_id, admin_id, data).await
    }

    async fn delete_student(
        &self,
        school_id: &str,
        student_id: &str,
        admin_id: &str,
    ) -> AppResult<()> {
        self.crud.delete_student(school_id, student_id, admin_id).await
    }

    async fn resequence_roll_numbers(
        &self,
        school_id: &str,
        space_id: &str,
    ) -> AppResult<()> {
        self.crud.resequence_roll_numbers(school_id, space_id).await
    }

    async fn list_student_ids(
        &self,
        school_id: &str,
    ) -> AppResult<Vec<String>> {
        self.crud.list_student_ids(school_id).await
    }

    async fn validate_student_data(&self, school_id: &str, data: Value) -> AppResult<()> {
        self.crud.validation.validate_student_data(school_id, data).await
    }
}
