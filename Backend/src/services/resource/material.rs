use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

pub struct MaterialOperations {
    pub repos: Arc<Repositories>,
}

impl MaterialOperations {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub async fn create_material(
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
            res["materialName"].as_str().unwrap_or("unknown"),
            "CREATE",
            data.clone()
        ).await;
        Ok(res)
    }

    pub async fn list_materials(
        &self,
        school_id: &str,
        search: Option<String>,
        filter: Option<String>,
        page: i64,
        limit: i64,
    ) -> AppResult<Value> {
        let response = self.repos.resource.get_materials(school_id, search, filter, page, limit).await?;
        let dashboard = self.repos.resource.get_materials_dashboard(school_id).await?;
        
        Ok(serde_json::json!({
            "success": true,
            "data": response["materials"],
            "metadata": response["metadata"],
            "dashboard": dashboard["data"]
        }))
    }

    pub async fn get_material(&self, school_id: &str, material_name: &str) -> AppResult<Option<Value>> {
        Ok(self.repos.resource.get_material(school_id, material_name).await?)
    }

    pub async fn update_material(
        &self,
        school_id: &str,
        admin_id: &str,
        material_name: &str,
        data: Value,
    ) -> AppResult<()> {
        self.repos
            .resource
            .update_material(school_id, admin_id, material_name, data.clone())
            .await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "MATERIAL",
            material_name,
            "UPDATE",
            data
        ).await;
        Ok(())
    }

    pub async fn delete_material(
        &self,
        school_id: &str,
        admin_id: &str,
        material_name: &str,
    ) -> AppResult<()> {
        let material = self.repos.resource.get_material(school_id, material_name).await?
            .ok_or_else(|| AppError::NotFound("Material not found".to_string()))?;

        self.repos.resource.delete_material(school_id, material_name).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "MATERIAL",
            material_name,
            "DELETE",
            material
        ).await;

        Ok(())
    }

    pub async fn sell_material(
        &self,
        school_id: &str,
        admin_id: &str,
        material_name: &str,
        data: Value,
    ) -> AppResult<()> {
        self.repos.resource.sell_material(school_id, admin_id, material_name, data.clone()).await?;
        
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "MATERIAL",
            material_name,
            "SELL",
            data
        ).await;
        Ok(())
    }

    pub async fn bulk_create_materials(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Vec<Value>,
    ) -> AppResult<Value> {
        let mut success_count = 0;
        let mut fail_count = 0;
        let mut results = Vec::new();

        for (i, row) in data.into_iter().enumerate() {
            match self.create_material(school_id, admin_id, row.clone()).await {
                Ok(_) => {
                    success_count += 1;
                    results.push(serde_json::json!({"row": i + 1, "status": "success"}));
                }
                Err(e) => {
                    fail_count += 1;
                    results.push(serde_json::json!({"row": i + 1, "status": "error", "message": e.to_string()}));
                }
            }
        }

        Ok(serde_json::json!({
            "success": true,
            "message": format!("{} materials imported, {} failed", success_count, fail_count),
            "results": results,
            "successCount": success_count,
            "failCount": fail_count
        }))
    }

    pub async fn get_materials_dashboard(&self, school_id: &str) -> AppResult<Value> {
        Ok(self.repos.resource.get_materials_dashboard(school_id).await?)
    }

    pub async fn get_material_history(&self, school_id: &str, material_id: &str) -> AppResult<Vec<Value>> {
        Ok(self.repos.resource.get_material_history(school_id, material_id).await?)
    }
}
