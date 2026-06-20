use serde::{Deserialize, Serialize};
use serde_json::Value;



// --- Recovery (recovery.rs) ---
#[derive(Debug, Deserialize, Serialize)]
pub struct AuditQuery {
    pub module: Option<String>,
    pub limit: Option<i64>,
}


// --- Geo (geo.rs) ---
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Country {
    pub id: i32,
    pub name: String,
    pub code: String,
    pub phone_code: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct StateModel {
    pub id: i32,
    pub country_id: Option<i32>,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct District {
    pub id: i32,
    pub state_id: Option<i32>,
    pub name: String,
}

// --- Developer Access (developer_access.rs) ---
#[derive(Debug, Deserialize, Serialize)]
pub struct CreateAccessRequest {
    pub developer_email: String,
    pub target_school_id: Option<String>,
    pub requested_role: String,
    pub justification: String,
    pub requested_tables: Vec<String>,
    pub duration_minutes: Option<i32>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ApproveAccessRequest {
    pub approver_id: String,
    pub approver_email: String,
    pub approval_notes: Option<String>,
    pub override_duration_minutes: Option<i32>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RevokeAccessParams {
    pub revoker_id: String,
    pub revoker_email: String,
    pub reason: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateDeveloperRole {
    pub new_role: String,
    pub reason: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AccessRequestResponse {
    pub request_id: i32,
    pub developer_id: String,
    pub target_school_id: Option<String>,
    pub requested_role: String,
    pub status: String,
    pub justification: String,
    pub created_at: String,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeveloperAccessResponse {
    pub developer_id: String,
    pub current_role: String,
    pub active_until: Option<String>,
    pub schools_with_access: Vec<String>,
    pub total_requests: i32,
    pub approved_requests: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActivityLogResponse {
    pub activity_id: i32,
    pub developer_id: String,
    pub action_type: String,
    pub target_school_id: Option<String>,
    pub details: Value,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: String,
}

// --- API Keys (api_keys.rs) ---
#[derive(Debug, Deserialize, Serialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    pub scopes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiKeyContext {
    pub school_id: String,
    pub scopes: Vec<String>,
}
