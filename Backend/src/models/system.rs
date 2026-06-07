use serde::{Deserialize, Serialize};
use serde_json::Value;

// --- WebSocket (ws.rs) ---
#[derive(Debug, Deserialize, Serialize)]
pub struct WsAuthPayload {
    pub token: String,
    pub school_id: String,
    pub vehicle_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WsEnvelope {
    pub version: &'static str,
    #[serde(rename = "type")]
    pub msg_type: String,
    pub id: String,
    pub timestamp: String,
    pub payload: Value,
}

// --- Webhook (webhook.rs) ---
#[derive(Debug, Deserialize, Serialize)]
pub struct CreateWebhookRequest {
    pub url: String,
    pub secret: String,
    pub event_types: Vec<String>,
}

// --- Transport (transport.rs) ---
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

// --- Recovery (recovery.rs) ---
#[derive(Debug, Deserialize, Serialize)]
pub struct AuditQuery {
    pub module: Option<String>,
    pub limit: Option<i64>,
}

// --- Public API (public_api.rs) ---
#[derive(Debug, Deserialize, Serialize)]
pub struct StudentSearchParams {
    pub search: Option<String>,
    pub class_name: Option<String>,
    pub section: Option<String>,
    pub status: Option<String>,
    pub page: Option<i32>,
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct EmployeeSearchParams {
    pub search: Option<String>,
    pub employee_type: Option<String>,
}

// --- Notification (notification.rs) ---
#[derive(Debug, Deserialize, Serialize)]
pub struct NotificationListQuery {
    pub category: Option<String>,
    pub unread_only: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

// --- Health (health.rs) ---
#[derive(Debug, Serialize, Deserialize)]
pub struct UnifiedHealthResponse {
    pub status: String,
    pub timestamp: String,
    pub version: String,
    pub service: String,
    pub uptime_seconds: u64,
    pub uptime_human: String,
    pub dependencies: DependencyChecks,
    pub metrics: SystemMetrics,
    pub alerts: Vec<HealthAlert>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DependencyChecks {
    pub database: DependencyStatus,
    pub redis: DependencyStatus,
    pub storage: DependencyStatus,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DependencyStatus {
    pub status: String,
    pub latency_ms: u128,
    pub detail: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub db_pool_size: u32,
    pub db_pool_active: u32,
    pub db_pool_idle: u32,
    pub memory_usage_bytes: u64,
    pub memory_usage_human: String,
    pub total_check_duration_ms: u128,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HealthAlert {
    pub severity: String,
    pub dependency: String,
    pub message: String,
    pub timestamp: String,
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
