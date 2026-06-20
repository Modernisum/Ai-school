use serde_json::Value;
use std::sync::Arc;
use crate::repository::traits::AuditRepository;

pub async fn log_audit(
    audit: &Arc<dyn AuditRepository + Send + Sync>,
    school_id: &str,
    admin_id: &str,
    entity_type: &str,
    entity_id: &str,
    action: &str,
    data: Value,
) {
    let _ = audit.log_action(school_id, admin_id, entity_type, entity_id, action, data).await;
}

pub async fn create_and_audit<T>(
    audit: &Arc<dyn AuditRepository + Send + Sync>,
    school_id: &str,
    admin_id: &str,
    entity_type: &str,
    result: &Value,
    data: Value,
) {
    let id = result["id"].as_i64().map(|i| i.to_string())
        .or_else(|| result["id"].as_str().map(|s| s.to_string()))
        .unwrap_or_else(|| "0".to_string());
    log_audit(audit, school_id, admin_id, entity_type, &id, "CREATE", data).await;
}

pub async fn delete_and_audit(
    audit: &Arc<dyn AuditRepository + Send + Sync>,
    school_id: &str,
    admin_id: &str,
    entity_type: &str,
    entity_id: &str,
    existing: Value,
) {
    log_audit(audit, school_id, admin_id, entity_type, entity_id, "DELETE", existing).await;
}
