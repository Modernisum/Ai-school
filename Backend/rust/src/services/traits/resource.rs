use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;



#[async_trait]
pub trait ResourceService: Send + Sync {
    // Announcements
    async fn create_announcement(
        &self,
        school_id: &str,
        admin_id: &str,
        type_str: &str,
        user_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn delete_announcement(
        &self,
        school_id: &str,
        admin_id: &str,
        announcement_id: i32,
    ) -> AppResult<()>;

    // Materials
    async fn create_material(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value>;
    async fn list_materials(
        &self,
        school_id: &str,
        search: Option<String>,
        filter: Option<String>,
        page: i64,
        limit: i64,
    ) -> AppResult<Value>;
    async fn get_material(&self, school_id: &str, material_name: &str) -> AppResult<Option<Value>>;
    async fn update_material(
        &self,
        school_id: &str,
        admin_id: &str,
        material_name: &str,
        data: Value,
    ) -> AppResult<()>;
    async fn delete_material(
        &self,
        school_id: &str,
        admin_id: &str,
        material_name: &str,
    ) -> AppResult<()>;
    async fn sell_material(
        &self,
        school_id: &str,
        admin_id: &str,
        material_name: &str,
        data: Value,
    ) -> AppResult<()>;
    async fn bulk_create_materials(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Vec<Value>,
    ) -> AppResult<Value>;

    // Events
    async fn create_event(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn list_events(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn update_event(&self, school_id: &str, admin_id: &str, event_id: i32, data: Value) -> AppResult<()>;
    async fn delete_event(&self, school_id: &str, admin_id: &str, event_id: i32) -> AppResult<()>;

    // Spaces
    async fn create_space_by_category(
        &self,
        school_id: &str,
        admin_id: &str,
        category: &str,
        name: String,
        description: Option<String>,
    ) -> AppResult<Value>;
    async fn list_spaces(&self, school_id: &str, category: Option<&str>) -> AppResult<Vec<Value>>;
    async fn list_space_categories(&self, school_id: &str) -> AppResult<Vec<String>>;
    async fn create_space_category(&self, school_id: &str, admin_id: &str, name: &str) -> AppResult<Value>;
    async fn delete_space_category(&self, school_id: &str, admin_id: &str, name: &str) -> AppResult<()>;
    async fn update_space(
        &self,
        school_id: &str,
        admin_id: &str,
        space_name: &str,
        data: Value,
    ) -> AppResult<()>;
    async fn delete_space(
        &self,
        school_id: &str,
        admin_id: &str,
        space_name: &str,
    ) -> AppResult<()>;
    async fn update_space_budget(
        &self,
        school_id: &str,
        admin_id: &str,
        space_name: &str,
        budget: Option<f64>,
    ) -> AppResult<()>;
    async fn get_space_details(
        &self,
        school_id: &str,
        space_name: &str,
    ) -> AppResult<Option<Value>>;

    // Assignments
    async fn assign_space_materials(
        &self,
        school_id: &str,
        admin_id: &str,
        space_name: &str,
        materials: Vec<Value>,
    ) -> AppResult<()>;

    async fn get_materials_dashboard(&self, school_id: &str) -> AppResult<Value>;
    async fn get_material_history(
        &self,
        school_id: &str,
        material_id: &str,
    ) -> AppResult<Vec<Value>>;

    async fn remove_space_material(
        &self,
        school_id: &str,
        admin_id: &str,
        space_name: &str,
        material_name: &str,
        quantity: i32,
    ) -> AppResult<()>;

    async fn get_space_materials(
        &self,
        school_id: &str,
        space_name: &str,
    ) -> AppResult<Value>;

    async fn get_all_spaces_materials(
        &self,
        school_id: &str,
    ) -> AppResult<Value>;

    async fn clone_space(
        &self,
        school_id: &str,
        admin_id: &str,
        source_space_name: &str,
        new_space_name: String,
    ) -> AppResult<Value>;

    async fn transfer_space_material(
        &self,
        school_id: &str,
        admin_id: &str,
        from_space: &str,
        to_space: &str,
        material_name: &str,
        quantity: i32,
    ) -> AppResult<Value>;
}
