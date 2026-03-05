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

    async fn create_space(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.resource.create_space(school_id, data).await
    }

    async fn get_space_details(
        &self,
        school_id: &str,
        space_id: &str,
    ) -> Result<Option<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.resource.get_space_details(school_id, space_id).await
    }

    async fn get_space_categories(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.resource.get_space_categories(school_id).await
    }

    async fn create_space_category(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.resource.create_space_category(school_id, data).await
    }

    async fn assign_space_materials(
        &self,
        school_id: &str,
        space_id: &str,
        materials: Vec<Value>,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos.resource.assign_space_materials(school_id, space_id, materials).await
    }

    async fn assign_space_employees(
        &self,
        school_id: &str,
        space_id: &str,
        employee_ids: Vec<String>,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos.resource.assign_space_employees(school_id, space_id, employee_ids).await
    }

    async fn remove_space_employee(
        &self,
        school_id: &str,
        space_id: &str,
        employee_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos.resource.remove_space_employee(school_id, space_id, employee_id).await
    }

    async fn create_material(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.resource.add_material(school_id, data.clone()).await?;
        Ok(data)
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
