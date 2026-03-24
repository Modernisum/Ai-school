use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

pub struct PostgresOperationsService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl OperationsService for PostgresOperationsService {
    async fn get_student_profile(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> AppResult<Option<Value>> {
        Ok(self.repos
            .student
            .get_student_profile(school_id, student_id)
            .await?)
    }
}
