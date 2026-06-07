use super::AdminService;
use std::error::Error;
use serde_json::{json, Value};

impl AdminService {
    pub async fn get_system_config(&self, key: &str) -> Result<String, Box<dyn Error + Send + Sync>> {
        let val = self.repos.config.get_global_config(key).await?
            .ok_or_else(|| format!("Config key '{}' not found", key))?;
        Ok(val)
    }

    pub async fn update_system_config(&self, key: &str, value: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos.config.set_global_config(key, value).await?;
        Ok(())
    }

    pub async fn set_global_notification(
        &self,
        notification: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos.config.set_global_notification(notification).await?;
        Ok(())
    }

    pub async fn clear_global_notification(&self) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos.config.clear_global_notification().await?;
        Ok(())
    }

    pub async fn get_global_notification(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let notif = self.repos.config.get_global_notification().await?
            .unwrap_or(json!(null));
        Ok(notif)
    }

    // ───── Export / Import ─────

    pub async fn export_school_data_stream(
        &self,
        school_id: &str,
    ) -> Result<axum::body::Body, Box<dyn Error + Send + Sync>> {
        let data = self.export_school_data(school_id).await?;
        let json_str = serde_json::to_string(&data)?;
        Ok(axum::body::Body::from(json_str))
    }

    pub async fn export_school_data(
        &self,
        school_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let school = self.get_school_full(school_id).await?;

        Ok(json!({
            "exportedAt":    chrono::Utc::now().to_rfc3339(),
            "exportVersion": "1.0",
            "school":        school,
            "students":      self.repos.config.fetch_table_for_school("students", school_id).await.unwrap_or_default(),
            "employees":     self.repos.config.fetch_table_for_school("employees", school_id).await.unwrap_or_default(),
            "classes":       self.repos.config.fetch_table_for_school("classes", school_id).await.unwrap_or_default(),
            "subjects":      self.repos.config.fetch_table_for_school("subjects", school_id).await.unwrap_or_default(),
            "fees":          self.repos.config.fetch_table_for_school("fees", school_id).await.unwrap_or_default(),
            "attendance":    self.repos.config.fetch_table_for_school("attendance", school_id).await.unwrap_or_default(),
            "announcements": self.repos.config.fetch_table_for_school("announcements", school_id).await.unwrap_or_default(),
            "events":        self.repos.config.fetch_table_for_school("events", school_id).await.unwrap_or_default(),
            "complains":     self.repos.config.fetch_table_for_school("complains", school_id).await.unwrap_or_default(),
            "spaces":        self.repos.config.fetch_table_for_school("spaces", school_id).await.unwrap_or_default(),
        }))
    }

    pub async fn export_all_schools(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let ids = self.repos.config.get_all_school_ids().await?;

        let mut exports = Vec::new();
        for id in &ids {
            match self.export_school_data(id).await {
                Ok(data) => exports.push(data),
                Err(e) => exports.push(json!({"schoolId": id, "error": e.to_string()})),
            }
        }
        Ok(json!({
            "exportedAt":    chrono::Utc::now().to_rfc3339(),
            "exportVersion": "1.0",
            "totalSchools":  exports.len(),
            "schools":       exports,
        }))
    }

    pub async fn import_school_data(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        if data["exportVersion"].is_null() {
            return Err("Invalid backup file: missing exportVersion".into());
        }
        let mut imported = 0u64;
        if let Some(students) = data["students"].as_array() {
            for s in students {
                let student_id = s["student_id"].as_str().unwrap_or("");
                if !student_id.is_empty() {
                    if self.repos.config.import_student_record(school_id, student_id, s.clone()).await.is_ok() {
                        imported += 1;
                    }
                }
            }
        }
        Ok(json!({
            "success": true,
            "imported": imported,
            "message": format!("Imported {} records for school {}", imported, school_id),
        }))
    }
}
