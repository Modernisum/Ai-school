use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

mod equipment;
mod inventory;
mod material;

pub use equipment::EquipmentOperations;
pub use inventory::InventoryOperations;
pub use material::MaterialOperations;

use super::material_monitor::MaterialMonitor;

pub struct PostgresResourceService {
    pub repos: Arc<Repositories>,
    pub material: MaterialOperations,
    pub equipment: EquipmentOperations,
    pub inventory: InventoryOperations,
    pub material_monitor: Option<Arc<MaterialMonitor>>,
}

impl PostgresResourceService {
    pub fn new(repos: Arc<Repositories>, material_monitor: Option<Arc<MaterialMonitor>>) -> Self {
        Self {
            material: MaterialOperations::new(repos.clone()),
            equipment: EquipmentOperations::new(repos.clone()),
            inventory: InventoryOperations::new(repos.clone()),
            repos,
            material_monitor,
        }
    }
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
        self.equipment.create_announcement(school_id, admin_id, type_str, user_id, data).await
    }

    async fn delete_announcement(
        &self,
        school_id: &str,
        admin_id: &str,
        announcement_id: i32,
    ) -> AppResult<()> {
        self.equipment.delete_announcement(school_id, admin_id, announcement_id).await
    }

    async fn create_material(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.material.create_material(school_id, admin_id, data).await?;
        if let Some(monitor) = &self.material_monitor {
            let _ = monitor.check_and_alert_school(school_id).await;
        }
        Ok(res)
    }

    async fn list_materials(
        &self,
        school_id: &str,
        search: Option<String>,
        filter: Option<String>,
        page: i64,
        limit: i64,
    ) -> AppResult<Value> {
        self.material.list_materials(school_id, search, filter, page, limit).await
    }

    async fn get_material(&self, school_id: &str, material_name: &str) -> AppResult<Option<Value>> {
        self.material.get_material(school_id, material_name).await
    }

    async fn update_material(
        &self,
        school_id: &str,
        admin_id: &str,
        material_name: &str,
        data: Value,
    ) -> AppResult<()> {
        self.material.update_material(school_id, admin_id, material_name, data).await?;
        if let Some(monitor) = &self.material_monitor {
            let _ = monitor.check_and_alert_school(school_id).await;
        }
        Ok(())
    }

    async fn delete_material(
        &self,
        school_id: &str,
        admin_id: &str,
        material_name: &str,
    ) -> AppResult<()> {
        self.material.delete_material(school_id, admin_id, material_name).await?;
        if let Some(monitor) = &self.material_monitor {
            let _ = monitor.check_and_alert_school(school_id).await;
        }
        Ok(())
    }

    async fn sell_material(
        &self,
        school_id: &str,
        admin_id: &str,
        material_name: &str,
        data: Value,
    ) -> AppResult<()> {
        self.material.sell_material(school_id, admin_id, material_name, data).await?;
        if let Some(monitor) = &self.material_monitor {
            let _ = monitor.check_and_alert_school(school_id).await;
        }
        Ok(())
    }

    async fn bulk_create_materials(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Vec<Value>,
    ) -> AppResult<Value> {
        self.material.bulk_create_materials(school_id, admin_id, data).await
    }

    async fn create_event(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        self.equipment.create_event(school_id, admin_id, data).await
    }

    async fn list_events(&self, school_id: &str) -> AppResult<Vec<Value>> {
        self.equipment.list_events(school_id).await
    }

    async fn update_event(
        &self,
        school_id: &str,
        admin_id: &str,
        event_id: i32,
        data: Value,
    ) -> AppResult<()> {
        self.equipment.update_event(school_id, admin_id, event_id, data).await
    }

    async fn delete_event(
        &self,
        school_id: &str,
        admin_id: &str,
        event_id: i32,
    ) -> AppResult<()> {
        self.equipment.delete_event(school_id, admin_id, event_id).await
    }

    async fn create_space_by_category(
        &self,
        school_id: &str,
        admin_id: &str,
        category: &str,
        name: String,
        description: Option<String>,
    ) -> AppResult<Value> {
        self.inventory.create_space_by_category(school_id, admin_id, category, name, description).await
    }

    async fn list_spaces(&self, school_id: &str, category: Option<&str>) -> AppResult<Vec<Value>> {
        self.inventory.list_spaces(school_id, category).await
    }

    async fn list_space_categories(&self, school_id: &str) -> AppResult<Vec<String>> {
        self.inventory.list_space_categories(school_id).await
    }

    async fn create_space_category(&self, school_id: &str, admin_id: &str, name: &str) -> AppResult<Value> {
        self.inventory.create_space_category(school_id, admin_id, name).await
    }

    async fn delete_space_category(&self, school_id: &str, admin_id: &str, name: &str) -> AppResult<()> {
        self.inventory.delete_space_category(school_id, admin_id, name).await
    }

    async fn update_space(
        &self,
        school_id: &str,
        admin_id: &str,
        space_name: &str,
        data: Value,
    ) -> AppResult<()> {
        self.inventory.update_space(school_id, admin_id, space_name, data).await
    }

    async fn delete_space(
        &self,
        school_id: &str,
        admin_id: &str,
        space_name: &str,
    ) -> AppResult<()> {
        self.inventory.delete_space(school_id, admin_id, space_name).await
    }

    async fn update_space_budget(
        &self,
        school_id: &str,
        admin_id: &str,
        space_name: &str,
        budget: Option<f64>,
    ) -> AppResult<()> {
        self.inventory.update_space_budget(school_id, admin_id, space_name, budget).await
    }

    async fn get_space_details(
        &self,
        school_id: &str,
        space_name: &str,
    ) -> AppResult<Option<Value>> {
        self.inventory.get_space_details(school_id, space_name).await
    }

    async fn assign_space_materials(
        &self,
        school_id: &str,
        admin_id: &str,
        space_name: &str,
        materials: Vec<Value>,
    ) -> AppResult<()> {
        self.inventory.assign_space_materials(school_id, admin_id, space_name, materials).await?;
        if let Some(monitor) = &self.material_monitor {
            let _ = monitor.check_and_alert_school(school_id).await;
        }
        Ok(())
    }

    async fn get_materials_dashboard(&self, school_id: &str) -> AppResult<Value> {
        self.material.get_materials_dashboard(school_id).await
    }

    async fn get_material_history(&self, school_id: &str, material_id: &str) -> AppResult<Vec<Value>> {
        self.material.get_material_history(school_id, material_id).await
    }

    async fn remove_space_material(
        &self,
        school_id: &str,
        admin_id: &str,
        space_name: &str,
        material_name: &str,
        quantity: i32,
    ) -> AppResult<()> {
        self.inventory.remove_space_material(school_id, admin_id, space_name, material_name, quantity).await
    }

    async fn get_space_materials(
        &self,
        school_id: &str,
        space_name: &str,
    ) -> AppResult<Value> {
        self.inventory.get_space_materials(school_id, space_name).await
    }

    async fn get_all_spaces_materials(
        &self,
        school_id: &str,
    ) -> AppResult<Value> {
        self.inventory.get_all_spaces_materials(school_id).await
    }

    async fn clone_space(
        &self,
        school_id: &str,
        admin_id: &str,
        source_space_name: &str,
        new_space_name: String,
    ) -> AppResult<Value> {
        let res = self.inventory.clone_space(school_id, admin_id, source_space_name, new_space_name).await?;
        if let Some(monitor) = &self.material_monitor {
            let _ = monitor.check_and_alert_school(school_id).await;
        }
        Ok(res)
    }

    async fn transfer_space_material(
        &self,
        school_id: &str,
        admin_id: &str,
        from_space: &str,
        to_space: &str,
        material_name: &str,
        quantity: i32,
    ) -> AppResult<Value> {
        let res = self.inventory.transfer_space_material(school_id, admin_id, from_space, to_space, material_name, quantity).await?;
        if let Some(monitor) = &self.material_monitor {
            let _ = monitor.check_and_alert_school(school_id).await;
        }
        Ok(res)
    }
}
