use crate::repository::Repositories;
use crate::services::traits::{AppResult};
use crate::services::utils::identity;
use serde_json::Value;
use std::sync::Arc;

pub struct StudentValidation {
    pub repos: Arc<Repositories>,
}

impl StudentValidation {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn validate_student_data(&self, school_id: &str, data: Value) -> AppResult<()> {
        identity::validate_identity(
            &self.repos.student,
            school_id,
            &data,
            data["studentId"].as_str(),
            None,
        ).await
    }
}
