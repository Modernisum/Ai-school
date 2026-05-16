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

    pub async fn get_space_materials(
        &self,
        school_id: &str,
        space_name: &str,
    ) -> AppResult<Vec<Value>> {
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

    pub async fn get_all_spaces_materials(
        &self,
        school_id: &str,
    ) -> AppResult<Value> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;

        let rows = sqlx::query(
            r#"
            SELECT
                sm.space_name,
                sm.material_name,
                sm.quantity,
                sm.unit,
                sm.unit_price,
                COALESCE(req.required_count, 0) as required_count
            FROM space_materials sm
            LEFT JOIN space_material_requirements req
                ON req.school_id = sm.school_id
                AND req.space_name = sm.space_name
                AND req.material_name = sm.material_name
            WHERE sm.school_id = $1
            ORDER BY sm.space_name, sm.material_name
            "#,
        )
        .bind(school_id)
        .fetch_all(&mut *conn)
        .await?;

        let mut space_map: std::collections::BTreeMap<String, Vec<Value>> = std::collections::BTreeMap::new();

        for row in rows {
            let space_name: String = row.get("space_name");
            let material_name: String = row.get("material_name");
            let quantity: i32 = row.get("quantity");
            let unit: Option<String> = row.get("unit");
            let unit_price: Option<f64> = row.get("unit_price");
            let required: i32 = row.get("required_count");

            let status = if required > 0 && quantity < required { "deficit" } else if required > 0 { "full" } else { "unset" };

            space_map.entry(space_name).or_default().push(json!({
                "materialName": material_name,
                "quantity": quantity,
                "unit": unit,
                "unitPrice": unit_price,
                "requiredCount": required,
                "status": status,
            }));
        }

        Ok(json!({
            "success": true,
            "data": space_map
        }))
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
