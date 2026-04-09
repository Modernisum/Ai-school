use serde_json::{json, Value};
use std::sync::Arc;

use crate::repository::Repositories;

pub struct StudentQueries {
    pub repos: Arc<Repositories>,
}

impl StudentQueries {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    pub fn calculate_delta(&self, old: &Value, new: &Value) -> Value {
        let mut delta = json!({});
        if let (Some(old_obj), Some(new_obj)) = (old.as_object(), new.as_object()) {
            for (key, new_val) in new_obj {
                // Skip tracking fields that are internal or updated automatically
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

    pub fn get_section_for_roll(&self, roll: i32, section_size: i32) -> String {
        if roll <= 0 {
            return "A".to_string();
        }
        let size = if section_size <= 0 { 60 } else { section_size };
        let index = ((roll - 1) / size) as usize;
        let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        alphabet.chars().nth(index).unwrap_or('Z').to_string()
    }

    pub fn calculate_room_and_section(&self, roll: i32, section_size: i32, class_name: &str) -> (String, i32, String) {
        let section = self.get_section_for_roll(roll, section_size);
        let room_index = ((roll - 1) % section_size) + 1;
        let full_name = format!("{}-{}", class_name, section);
        (section, room_index, full_name)
    }
}
