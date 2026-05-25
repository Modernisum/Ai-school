use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
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
        description: Option<String>,
    ) -> AppResult<Value> {
        let res = self.repos.resource.create_space(school_id, category, name, description).await?;

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

    pub async fn delete_space_category(
        &self,
        school_id: &str,
        admin_id: &str,
        name: &str,
    ) -> AppResult<()> {
        // Security: Prevent deletion of core system categories
        let protected_categories = ["classroom", "office", "lab", "ground"];
        if protected_categories.contains(&name.to_lowercase().as_str()) {
            return Err(AppError::Validation(format!(
                "The category '{}' is a core system standard and cannot be deleted to ensure system integrity.",
                name
            )));
        }

        self.repos.resource.delete_space_category(school_id, name).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE_CATEGORY",
            name,
            "DELETE",
            serde_json::json!({})
        ).await;
        Ok(())
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

    pub async fn get_space_materials(
        &self,
        school_id: &str,
        space_name: &str,
    ) -> AppResult<Value> {
        Ok(self.repos.resource.get_space_materials(school_id, space_name).await?)
    }

    pub async fn clone_space(
        &self,
        school_id: &str,
        admin_id: &str,
        source_space_name: &str,
        new_space_name: String,
    ) -> AppResult<Value> {
        let res = self.repos.resource.clone_space(school_id, source_space_name, new_space_name).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE",
            res["spaceId"].as_str().unwrap_or(""),
            "CLONE",
            serde_json::json!({"clonedFrom": source_space_name, "newName": res["spaceName"]})
        ).await;
        Ok(res)
    }

    pub async fn transfer_space_material(
        &self,
        school_id: &str,
        admin_id: &str,
        from_space: &str,
        to_space: &str,
        material_name: &str,
        quantity: i32,
    ) -> AppResult<Value> {
        let res = self.repos.resource.transfer_space_material(school_id, from_space, to_space, material_name, quantity).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE_MATERIALS",
            from_space,
            "TRANSFER",
            serde_json::json!({"materialName": material_name, "toSpace": to_space, "quantity": quantity})
        ).await;
        Ok(res)
    }

    pub async fn update_space_budget(
        &self,
        school_id: &str,
        admin_id: &str,
        space_name: &str,
        budget: Option<f64>,
    ) -> AppResult<()> {
        self.repos.resource.update_space_budget(school_id, space_name, budget).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE",
            space_name,
            "UPDATE_BUDGET",
            serde_json::json!({"budget": budget})
        ).await;
        Ok(())
    }

    pub async fn get_all_spaces_materials(
        &self,
        school_id: &str,
    ) -> AppResult<Value> {
        Ok(self.repos.resource.get_all_spaces_materials(school_id).await?)
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

    pub async fn remove_space_material(
        &self,
        school_id: &str,
        admin_id: &str,
        space_name: &str,
        material_name: &str,
        quantity: i32,
    ) -> AppResult<()> {
        self.repos.resource.remove_space_material(school_id, space_name, material_name, quantity).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SPACE_MATERIALS",
            space_name,
            "REMOVE",
            serde_json::json!({ "materialName": material_name, "quantity": quantity })
        ).await;
        Ok(())
    }
}
