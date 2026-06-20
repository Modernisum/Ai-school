use serde_json::{json, Value};
use std::sync::Arc;
use crate::repository::traits::GlobalUserRepository;

pub fn build_sync_payload(
    user_type: &str,
    school_id: &str,
    user_id: &str,
    data: &Value,
) -> Value {
    let mut payload = json!({
        "phone": data["contact"],
        "email": data["email"],
        "alternativePhone": data["alternativeContact"],
        "aadhaarNumber": data["aadhaarNumber"],
        "schoolId": school_id,
        "userId": user_id,
        "userType": user_type,
        "name": data["name"],
        "imageUrl": data["imageUrl"]
    });
    if user_type == "student" {
        payload["className"] = data["className"].clone();
    }
    payload
}

pub async fn sync(repo: &Arc<dyn GlobalUserRepository + Send + Sync>, payload: Value) {
    let _ = repo.sync_user(payload).await;
}

pub async fn delete(repo: &Arc<dyn GlobalUserRepository + Send + Sync>, school_id: &str, user_id: &str, user_type: &str) {
    let _ = repo.delete_user(school_id, user_id, user_type).await;
}
