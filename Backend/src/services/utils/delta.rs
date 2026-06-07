use serde_json::{json, Value};

pub fn calculate_delta(old: &Value, new: &Value) -> Value {
    let mut delta = json!({});
    if let (Some(old_obj), Some(new_obj)) = (old.as_object(), new.as_object()) {
        for (key, new_val) in new_obj {
            if key == "updatedAt" || key == "updated_at" || key == "createdAt" || key == "created_at" {
                continue;
            }
            if let Some(old_val) = old_obj.get(key) {
                if old_val != new_val {
                    delta[key] = json!({
                        "old": old_val.clone(),
                        "new": new_val.clone()
                    });
                }
            } else {
                delta[key] = json!({
                    "old": null,
                    "new": new_val.clone()
                });
            }
        }
    }
    delta
}
