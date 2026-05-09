use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSpaceRequest {
    pub space_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSpaceCategoryRequest {
    pub name: String,
    #[serde(default)]
    pub is_default: bool,
}


#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMaterialRequest {
    pub material_name: String,
    pub quantity: Option<i32>,
    pub unit_price: Option<f64>,
    pub unit: Option<String>,
    pub description: Option<String>,
    pub attachment_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Material {
    pub material_name: String,
    pub quantity: i32,
    pub unit_price: f64,
    pub unit: Option<String>,
    pub description: Option<String>,
    pub extra_unit: i32,
    pub need_unit: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
