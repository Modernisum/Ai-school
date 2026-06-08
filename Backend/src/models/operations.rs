use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct TaskFilter {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateTaskStatusPayload {
    pub status: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ResponsibilityWsAuthPayload {
    pub token: String,
    pub school_id: String,
    pub user_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", content = "data")]
pub enum ResponsibilityEvent {
    #[serde(rename = "responsibility_assigned")]
    Assigned {
        responsibility_id: String,
        employee_id: String,
        employee_name: String,
        responsibility_name: String,
        timestamp: String,
    },
    #[serde(rename = "responsibility_removed")]
    Removed {
        responsibility_id: String,
        employee_id: String,
        employee_name: String,
        responsibility_name: String,
        timestamp: String,
    },
    #[serde(rename = "responsibility_updated")]
    Updated {
        responsibility_id: String,
        field: String,
        old_value: serde_json::Value,
        new_value: serde_json::Value,
        updated_by: String,
        timestamp: String,
    },
    #[serde(rename = "space_assigned")]
    SpaceAssigned {
        responsibility_id: String,
        space_id: String,
        space_name: String,
        assigned_by: String,
        timestamp: String,
    },
    #[serde(rename = "space_removed")]
    SpaceRemoved {
        responsibility_id: String,
        space_id: String,
        space_name: String,
        removed_by: String,
        timestamp: String,
    },
    #[serde(rename = "bulk_update")]
    BulkUpdate {
        responsibility_id: String,
        update_type: String,
        affected_count: i32,
        performed_by: String,
        timestamp: String,
    },
    #[serde(rename = "space_created")]
    SpaceCreated {
        space_name: String,
        timestamp: String,
    },
    #[serde(rename = "space_updated")]
    SpaceUpdated {
        space_name: String,
        timestamp: String,
    },
    #[serde(rename = "space_deleted")]
    SpaceDeleted {
        space_name: String,
        timestamp: String,
    },
    #[serde(rename = "material_created")]
    MaterialCreated {
        material_name: String,
        timestamp: String,
    },
    #[serde(rename = "material_updated")]
    MaterialUpdated {
        material_name: String,
        timestamp: String,
    },
    #[serde(rename = "material_deleted")]
    MaterialDeleted {
        material_name: String,
        timestamp: String,
    },
    #[serde(rename = "category_created")]
    CategoryCreated {
        category_name: String,
        timestamp: String,
    },
    #[serde(rename = "category_deleted")]
    CategoryDeleted {
        category_name: String,
        timestamp: String,
    },
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GpsUpdatePayload {
    pub lat: f64,
    pub lng: f64,
    pub speed: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GpsEvent {
    pub vehicle_id: String,
    pub lat: f64,
    pub lng: f64,
    pub speed: f64,
    pub timestamp: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PickupRequest {
    pub student_ids: Vec<String>,
    pub status: String,
    pub vehicle_id: Option<String>,
}

