use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

pub struct InventoryOperations {
    pub repos: Arc<Repositories>,
}

impl InventoryOperations {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn create_space_by_category(
        &self,
        school_id: &str,
        admin_id: &str,
        category: &str,
        name: String,
    ) -> AppResult<Value> {
        let res = self.repos.resource.create_space(school_id, category, name).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE",
            res["spaceId"].as_str().unwrap_or("0"),
            "CREATE",
            serde_json::json!({"name": res["spaceName"], "category": category})
        ).await;
        Ok(res)
    }

    pub async fn list_spaces(&self, school_id: &str, category: Option<&str>) -> AppResult<Vec<Value>> {
        Ok(self.repos.resource.get_spaces(school_id, category).await?)
    }

    pub async fn list_space_categories(&self, school_id: &str) -> AppResult<Vec<String>> {
        Ok(self.repos.resource.get_space_categories(school_id).await?)
    }

    pub async fn create_space_category(
        &self,
        school_id: &str,
        admin_id: &str,
        name: &str,
    ) -> AppResult<Value> {
        let res = self.repos.resource.create_space_category(school_id, name).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE_CATEGORY",
            &res["name"].as_str().unwrap_or("unknown"),
            "CREATE",
            serde_json::json!({"name": name})
        ).await;
        Ok(res)
    }

    pub async fn update_space(
        &self,
        school_id: &str,
        admin_id: &str,
        space_name: &str,
        data: Value,
    ) -> AppResult<()> {
        self.repos
            .resource
            .update_space(school_id, space_name, data.clone())
            .await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE",
            space_name,
            "UPDATE",
            data
        ).await;
        Ok(())
    }

    pub async fn delete_space(
        &self,
        school_id: &str,
        admin_id: &str,
        space_name: &str,
    ) -> AppResult<()> {
        self.repos.resource.delete_space(school_id, space_name).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE",
            space_name,
            "DELETE",
            serde_json::json!({})
        ).await;
        Ok(())
    }

    pub async fn get_space_details(
        &self,
        school_id: &str,
        space_name: &str,
    ) -> AppResult<Option<Value>> {
        Ok(self.repos.resource.get_space_details(school_id, space_name).await?)
    }

    pub async fn assign_space_materials(
        &self,
        school_id: &str,
        admin_id: &str,
        space_name: &str,
        materials: Vec<Value>,
    ) -> AppResult<()> {
        self.repos.resource.assign_space_materials(school_id, space_name, materials.clone()).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE_MATERIALS",
            space_name,
            "ASSIGN",
            serde_json::json!({ "materials": materials })
        ).await;
        Ok(())
    }
}
