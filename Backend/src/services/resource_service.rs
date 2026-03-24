use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

pub struct PostgresResourceService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl ResourceService for PostgresResourceService {
    async fn create_announcement(
        &self,
        school_id: &str,
        admin_id: &str,
        type_str: &str,
        user_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        self.repos
            .resource
            .add_announcement(school_id, type_str, user_id, data.clone())
            .await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "ANNOUNCEMENT",
            user_id,
            "CREATE",
            data.clone()
        ).await;

        Ok(data)
    }

    async fn delete_announcement(
        &self,
        school_id: &str,
        admin_id: &str,
        announcement_id: i32,
    ) -> AppResult<()> {
        let announcement = self.repos.resource.get_announcement(school_id, announcement_id).await?
            .ok_or_else(|| AppError::NotFound("Announcement not found".to_string()))?;

        self.repos.resource.delete_announcement(school_id, announcement_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "ANNOUNCEMENT",
            &announcement_id.to_string(),
            "DELETE",
            announcement
        ).await;

        Ok(())
    }

    async fn create_material(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.repos.resource.add_material(school_id, data.clone()).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "MATERIAL",
            &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()),
            "CREATE",
            data.clone()
        ).await;
        Ok(res)
    }

    async fn list_materials(&self, school_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.resource.get_materials(school_id).await?)
    }

    async fn update_material(
        &self,
        school_id: &str,
        admin_id: &str,
        material_id: &str,
        data: Value,
    ) -> AppResult<()> {
        self.repos
            .resource
            .update_material(school_id, material_id, data.clone())
            .await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "MATERIAL",
            material_id,
            "UPDATE",
            data
        ).await;
        Ok(())
    }

    async fn delete_material(
        &self,
        school_id: &str,
        admin_id: &str,
        material_id: &str,
    ) -> AppResult<()> {
        let material = self.repos.resource.get_material(school_id, material_id).await?
            .ok_or_else(|| AppError::NotFound("Material not found".to_string()))?;

        self.repos.resource.delete_material(school_id, material_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "MATERIAL",
            material_id,
            "DELETE",
            material
        ).await;

        Ok(())
    }

    async fn create_event(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.repos.resource.add_event_summary(school_id, data.clone()).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "EVENT",
            &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()),
            "CREATE",
            data
        ).await;
        Ok(res)
    }

    async fn delete_event(
        &self,
        school_id: &str,
        admin_id: &str,
        event_id: i32,
    ) -> AppResult<()> {
        let event = self.repos.resource.get_event(school_id, event_id).await?
            .ok_or_else(|| AppError::NotFound("Event not found".to_string()))?;

        self.repos.resource.delete_event(school_id, event_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "EVENT",
            &event_id.to_string(),
            "DELETE",
            event
        ).await;

        Ok(())
    }

    async fn create_space(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.repos.resource.create_space(school_id, data.clone()).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE",
            &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()),
            "CREATE",
            data
        ).await;
        Ok(res)
    }

    async fn list_spaces(&self, school_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.resource.get_spaces(school_id).await?)
    }

    async fn update_space(
        &self,
        school_id: &str,
        admin_id: &str,
        space_id: &str,
        data: Value,
    ) -> AppResult<()> {
        self.repos
            .resource
            .update_space(school_id, space_id, data.clone())
            .await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE",
            space_id,
            "UPDATE",
            data
        ).await;
        Ok(())
    }

    async fn delete_space(
        &self,
        school_id: &str,
        admin_id: &str,
        space_id: &str,
    ) -> AppResult<()> {
        self.repos.resource.delete_space(school_id, space_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE",
            space_id,
            "DELETE",
            serde_json::json!({})
        ).await;
        Ok(())
    }

    async fn get_space_details(
        &self,
        school_id: &str,
        space_id: &str,
    ) -> AppResult<Option<Value>> {
        Ok(self.repos.resource.get_space_details(school_id, space_id).await?)
    }

    async fn get_space_categories(&self, school_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.resource.get_space_categories(school_id).await?)
    }

    async fn create_space_category(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.repos.resource.create_space_category(school_id, data.clone()).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE_CATEGORY",
            &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()),
            "CREATE",
            data
        ).await;
        Ok(res)
    }

    async fn delete_space_category(
        &self,
        school_id: &str,
        admin_id: &str,
        category_id: i32,
    ) -> AppResult<()> {
        self.repos.resource.delete_space_category(school_id, category_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE_CATEGORY",
            &category_id.to_string(),
            "DELETE",
            serde_json::json!({})
        ).await;
        Ok(())
    }

    async fn assign_space_materials(
        &self,
        school_id: &str,
        admin_id: &str,
        space_id: &str,
        materials: Vec<Value>,
    ) -> AppResult<()> {
        self.repos.resource.assign_space_materials(school_id, space_id, materials.clone()).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE_MATERIALS",
            space_id,
            "ASSIGN",
            serde_json::json!({ "materials": materials })
        ).await;
        Ok(())
    }

    async fn assign_space_employees(
        &self,
        school_id: &str,
        admin_id: &str,
        space_id: &str,
        employee_ids: Vec<String>,
    ) -> AppResult<()> {
        self.repos.resource.assign_space_employees(school_id, space_id, employee_ids.clone()).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE_EMPLOYEES",
            space_id,
            "ASSIGN",
            serde_json::json!({ "employee_ids": employee_ids })
        ).await;
        Ok(())
    }

    async fn remove_space_employee(
        &self,
        school_id: &str,
        admin_id: &str,
        space_id: &str,
        employee_id: &str,
    ) -> AppResult<()> {
        self.repos.resource.remove_space_employee(school_id, space_id, employee_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE_EMPLOYEES",
            space_id,
            "REMOVE",
            serde_json::json!({ "employee_id": employee_id })
        ).await;
        Ok(())
    }
}

pub struct PostgresOCRService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl OCRService for PostgresOCRService {
    async fn perform_ocr(&self, file_path: &str) -> AppResult<Value> {
        Ok(self.repos.ocr.process_ocr(file_path, "tesseract").await?)
    }
}
