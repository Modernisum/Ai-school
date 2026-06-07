use super::AdminService;
use std::error::Error;
use serde_json::{json, Value};

impl AdminService {
    pub async fn create_support_request(
        &self,
        school_name: &str,
        contact_info: &str,
        message: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos.school.create_support_request(school_name, contact_info, message).await?;
        Ok(())
    }

    pub async fn list_support_requests(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let requests = self.repos.school.list_support_requests().await?;
        Ok(json!(requests))
    }

    pub async fn resolve_support_request(
        &self,
        id: i32,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos.school.resolve_support_request(id).await?;
        Ok(())
    }
}
