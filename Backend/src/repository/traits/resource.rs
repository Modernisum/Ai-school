use async_trait::async_trait;  
use serde_json::Value;  
  
use super::{AppError, JsonList};  
  

#[async_trait]
pub trait ResourceRepository: Send + Sync {
    // Infrastructure
    async fn create_space(&self, school_id: &str, category: &str, name: String) -> Result<Value, AppError>;
    async fn get_spaces(&self, school_id: &str, category: Option<&str>) -> Result<Vec<Value>, AppError>;
    async fn get_space_categories(&self, school_id: &str) -> Result<Vec<String>, AppError>;
    
    // Space Categories management
    async fn create_space_category(&self, school_id: &str, name: &str) -> Result<Value, AppError>;
    async fn delete_space_category(&self, school_id: &str, name: &str) -> Result<(), AppError>;
    async fn get_space_details(&self, school_id: &str, space_name: &str) -> Result<Option<Value>, AppError>;
    async fn update_space(
        &self,
        school_id: &str,
        space_name: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn delete_space(&self, school_id: &str, space_name: &str) -> Result<(), AppError>;
    async fn add_item(&self, school_id: &str, space_name: &str, data: Value) -> Result<(), AppError>;
    async fn add_material(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_material(
        &self,
        school_id: &str,
        material_name: &str,
    ) -> Result<Option<Value>, AppError>;
    async fn update_material(
        &self,
        school_id: &str,
        admin_id: &str,
        material_name: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn add_material_location(
        &self,
        school_id: &str,
        material_id: &str,
        space_id: &str,
        item_id: &str,
        quantity: i32,
    ) -> Result<(), AppError>;
    async fn add_material_history(
        &self,
        school_id: &str,
        material_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), AppError>;

    // Announcements
    async fn add_announcement(
        &self,
        school_id: &str,
        collection: &str,
        user_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn get_announcements(
        &self,
        school_id: &str,
        collection: &str,
        user_id: &str,
    ) -> Result<JsonList, AppError>;
    async fn get_announcement(&self, school_id: &str, announcement_id: i32) -> Result<Option<Value>, AppError>;

    // Events
    async fn add_event_summary(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_events(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_event(&self, school_id: &str, event_id: i32) -> Result<Option<Value>, AppError>;
    async fn update_event(&self, school_id: &str, event_id: i32, data: Value) -> Result<(), AppError>;

    async fn get_materials(
        &self,
        school_id: &str,
        search: Option<String>,
        filter: Option<String>,
        page: i64,
        limit: i64,
    ) -> Result<Value, AppError>;

    async fn assign_space_materials(
        &self,
        school_id: &str,
        space_name: &str,
        materials: Vec<Value>,
    ) -> Result<(), AppError>;

    async fn remove_space_material(
        &self,
        school_id: &str,
        space_name: &str,
        material_name: &str,
        quantity: i32,
    ) -> Result<(), AppError>;

    async fn delete_announcement(&self, school_id: &str, announcement_id: i32) -> Result<(), AppError>;

    async fn delete_material(&self, school_id: &str, material_name: &str) -> Result<(), AppError>;
    async fn sell_material(
        &self,
        school_id: &str,
        admin_id: &str,
        material_name: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn delete_event(&self, school_id: &str, event_id: i32) -> Result<(), AppError>;

    async fn get_material_history(
        &self,
        school_id: &str,
        material_id: &str,
    ) -> Result<JsonList, AppError>;

    async fn get_materials_dashboard(&self, school_id: &str) -> Result<Value, AppError>;

    // Space materials listing
    async fn get_space_materials(
        &self,
        school_id: &str,
        space_name: &str,
    ) -> Result<Vec<Value>, AppError>;

    // Clone space with requirements
    async fn clone_space(
        &self,
        school_id: &str,
        source_space_name: &str,
        new_space_name: String,
    ) -> Result<Value, AppError>;

    // Transfer material between spaces
    async fn transfer_space_material(
        &self,
        school_id: &str,
        from_space: &str,
        to_space: &str,
        material_name: &str,
        quantity: i32,
    ) -> Result<Value, AppError>;
}
