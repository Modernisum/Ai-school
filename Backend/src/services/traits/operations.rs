use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait OperationsService: Send + Sync {
    async fn get_student_profile(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> AppResult<Option<Value>>;
}
