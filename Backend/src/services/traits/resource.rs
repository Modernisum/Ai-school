use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait OCRService: Send + Sync {
    async fn perform_ocr(&self, image_url: &str) -> AppResult<Value>;
}

#[async_trait]
pub trait AiService: Send + Sync {
    async fn post_query(&self, school_id: &str, query: Value) -> AppResult<Value>;
    async fn query_ai(&self, school_id: &str, user_query: &str) -> AppResult<Value>;
    async fn generate_embedding(&self, text: &str) -> AppResult<Vec<f32>>;

    // AI Task generation endpoints
    async fn generate_employee_tasks(&self, school_id: &str, employee_id: &str)
        -> AppResult<Value>;
    async fn reorganize_tasks(&self, school_id: &str, employee_id: &str) -> AppResult<Value>;
    async fn generate_exam_questions(&self, school_id: &str, payload: &Value) -> AppResult<Value>;
}

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

    // Events
    async fn create_event(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn delete_event(&self, school_id: &str, admin_id: &str, event_id: i32) -> AppResult<()>;

    // Spaces
    async fn create_space_by_category(
        &self,
        school_id: &str,
        admin_id: &str,
        category: &str,
        name: String,
    ) -> AppResult<Value>;
    async fn list_spaces(&self, school_id: &str, category: Option<&str>) -> AppResult<Vec<Value>>;
    async fn list_space_categories(&self, school_id: &str) -> AppResult<Vec<String>>;
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
}
