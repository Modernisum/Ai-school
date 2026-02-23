use crate::repository::traits::*;
use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::error::Error;
use std::sync::Arc;

pub struct PostgresResourceService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl ResourceService for PostgresResourceService {
    async fn create_announcement(
        &self,
        school_id: &str,
        type_str: &str,
        user_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos
            .resource
            .add_announcement(school_id, type_str, user_id, data.clone())
            .await?;
        Ok(data)
    }

    async fn list_materials(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.resource.get_materials(school_id).await
    }

    async fn update_material(
        &self,
        school_id: &str,
        material_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos
            .resource
            .update_material(school_id, material_id, data)
            .await
    }

    async fn create_event(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.resource.add_event_summary(school_id, data).await
    }

    async fn list_spaces(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.resource.get_spaces(school_id).await
    }
}

pub struct PostgresOCRService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl OCRService for PostgresOCRService {
    async fn perform_ocr(&self, file_path: &str) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.ocr.process_ocr(file_path, "tesseract").await
    }
}
