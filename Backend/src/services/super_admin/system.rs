use super::AdminService;
use sqlx::{Row, Connection};
use std::error::Error;
use serde_json::{json, Value};
use futures_util::TryStreamExt;

impl AdminService {
    pub async fn get_system_config(&self, key: &str) -> Result<String, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let row = sqlx::query("SELECT config_value FROM system_config WHERE config_key = $1")
            .bind(key)
            .fetch_optional(&mut *conn)
            .await?;

        match row {
            Some(r) => Ok(r.get::<String, _>("config_value")),
            None => Err(format!("Config key '{}' not found", key).into()),
        }
    }

    pub async fn update_system_config(&self, key: &str, value: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        sqlx::query(
            "INSERT INTO system_config (config_key, config_value, updated_at) 
             VALUES ($1, $2, NOW()) 
             ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = EXCLUDED.updated_at"
        )
        .bind(key)
        .bind(value)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    pub async fn set_global_notification(
        &self,
        notification: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let mut tx = conn.begin().await?;

        // 1. Deactivate existing global notifications
        sqlx::query("UPDATE global_notifications SET active = FALSE WHERE active = TRUE")
            .execute(&mut *tx)
            .await?;

        // 2. Insert new one
        sqlx::query("INSERT INTO global_notifications (notification, active) VALUES ($1, TRUE)")
            .bind(notification)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }

    pub async fn clear_global_notification(&self) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        sqlx::query("UPDATE global_notifications SET active = FALSE WHERE active = TRUE")
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    pub async fn get_global_notification(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let row = sqlx::query("SELECT notification FROM global_notifications WHERE active = TRUE ORDER BY created_at DESC LIMIT 1")
            .fetch_optional(&mut *conn)
            .await?;

        match row {
            Some(r) => Ok(r.try_get::<Value, _>("notification")?),
            None => Ok(json!(null)),
        }
    }

    // ───── Export / Import (Internal) ─────

    async fn fetch_table_for_school(&self, table: &str, school_id: &str) -> Vec<Value> {
        let mut conn = match self.db.acquire_super_admin_connection().await {
            Ok(c) => c,
            Err(_) => return Vec::new(),
        };
        let q = format!("SELECT row_to_json(t) as j FROM {} t WHERE school_id = $1", table);
        let mut rows = sqlx::query(&q).bind(school_id).fetch(&mut *conn);
        let mut results = Vec::new();
        while let Ok(Some(row)) = TryStreamExt::try_next(&mut rows).await {
            if let Ok(val) = row.try_get::<Value, _>(0) {
               results.push(val);
            }
        }
        results
    }

    pub async fn export_school_data_stream(
        &self,
        school_id: &str,
    ) -> Result<axum::body::Body, Box<dyn Error + Send + Sync>> {
        use futures_util::StreamExt;
        
        let school = self.get_school_full(school_id).await?;
        let school_id_owned = school_id.to_string();
        let db = self.db.clone();

        let stream = async_stream::stream! {
            // yield prefix
            yield Ok::<_, sqlx::Error>(format!(
                "{{\"exportedAt\":\"{}\",\"exportVersion\":\"1.1\",\"school\":{},",
                chrono::Utc::now().to_rfc3339(),
                serde_json::to_string(&school).unwrap_or_else(|_| "null".to_string())
            ));

            let tables = [
                "students", "employees", "classes", "subjects", "fees", 
                "attendance", "announcements", "events", "complains", "spaces"
            ];

            for (i, table) in tables.iter().enumerate() {
                yield Ok(format!("\"{}\":[", table));
                
                let mut conn = match db.acquire_super_admin_connection().await {
                    Ok(c) => c,
                    Err(e) => {
                        yield Err(e);
                        return;
                    }
                };

                let q = format!("SELECT row_to_json(t) as j FROM {} t WHERE school_id = $1", table);
                let mut rows = sqlx::query(&q).bind(&school_id_owned).fetch(&mut *conn);
                
                let mut first = true;
                while let Some(row_result) = rows.next().await {
                    match row_result {
                        Ok(row) => {
                            if let Ok(val) = row.try_get::<Value, _>(0) {
                                if !first { yield Ok(",".to_string()); }
                                yield Ok(serde_json::to_string(&val).unwrap_or_default());
                                first = false;
                            }
                        },
                        Err(e) => {
                            yield Err(e);
                            return;
                        }
                    }
                }
                
                if i < tables.len() - 1 {
                    yield Ok("],".to_string());
                } else {
                    yield Ok("]".to_string());
                }
            }
            
            yield Ok("}".to_string());
        };

        Ok(axum::body::Body::from_stream(stream))
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
            "students":      self.fetch_table_for_school("students", school_id).await,
            "employees":     self.fetch_table_for_school("employees", school_id).await,
            "classes":       self.fetch_table_for_school("classes", school_id).await,
            "subjects":      self.fetch_table_for_school("subjects", school_id).await,
            "fees":          self.fetch_table_for_school("fees", school_id).await,
            "attendance":    self.fetch_table_for_school("attendance", school_id).await,
            "announcements": self.fetch_table_for_school("announcements", school_id).await,
            "events":        self.fetch_table_for_school("events", school_id).await,
            "complains":     self.fetch_table_for_school("complains", school_id).await,
            "spaces":        self.fetch_table_for_school("spaces", school_id).await,
        }))
    }

    pub async fn export_all_schools(&self) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let ids: Vec<String> = sqlx::query("SELECT school_id FROM schools")
            .fetch_all(&mut *conn)
            .await?
            .into_iter()
            .filter_map(|r| r.try_get::<String, _>("school_id").ok())
            .collect();

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
            let mut conn = self.db.acquire_super_admin_connection().await?;
            for s in students {
                let _ = sqlx::query(
                    "INSERT INTO students (student_id, school_id, data, created_at, updated_at)
                     VALUES ($1, $2, $3, NOW(), NOW())
                     ON CONFLICT (student_id) DO UPDATE SET data = EXCLUDED.data",
                )
                .bind(s["student_id"].as_str().unwrap_or(""))
                .bind(school_id)
                .bind(s)
                .execute(&mut *conn)
                .await;
                imported += 1;
            }
        }
        Ok(json!({
            "success": true,
            "imported": imported,
            "message": format!("Imported {} records for school {}", imported, school_id),
        }))
    }
}
