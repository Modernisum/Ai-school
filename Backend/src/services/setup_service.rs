use crate::repository::Repositories;
use crate::services::traits::*;
use crate::services::academic_utils;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::error::Error;
use std::sync::Arc;
use std::sync::OnceLock;

pub struct PostgresSetupService {
    pub repos: Arc<Repositories>,
}

// --- Logic Parity Constants ---

fn get_subjects() -> HashMap<&'static str, Vec<&'static str>> {
    academic_utils::get_subjects_map()
}

#[async_trait]
impl SetupService for PostgresSetupService {
    async fn setup_school(&self, admin_id: &str, data: Value) -> Result<Value, AppError> {
        let _school_name = data["schoolName"].as_str().ok_or("Missing schoolName")?;
        let _school_address = data["schoolAddress"]
            .as_str()
            .ok_or("Missing schoolAddress")?;
        let class_level_start = data["classLevelStart"].as_i64()
            .or_else(|| data["classLevelStart"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(0);
        let class_level = data["classLevel"].as_i64()
            .or_else(|| data["classLevel"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(0);
        let password = data["password"].as_str().ok_or("Missing password")?;
        let _affiliated_board = data["affiliatedBoard"].as_str().unwrap_or("");

        // 1. Generate School Attributes
        let school_id = format!("{:06}", rand::random::<u32>() % 900000 + 100000);
        let school_code = self.repos.auth.generate_school_code().await?;
        println!("Generating school_id: {} and school_code: {}", school_id, school_code);
        let hashed_password = bcrypt::hash(password, 10)?;

        // 2. Create School document
        let mut school_payload = data.clone();
        school_payload["id"] = json!(school_id);
        school_payload["schoolCode"] = json!(school_code);

        println!("Creating school record in global table...");
        self.repos.auth.create_school(school_payload.clone()).await.map_err(|e| {
            println!("create_school failed: {}", e);
            e
        })?;

        // 2.5 Ensure the school-specific schema exists and is initialized
        println!("Ensuring tenant schema for school_id: {}", school_id);
        self.repos.db_client.ensure_tenant_schema(&school_id).await
            .map_err(|e| {
                println!("ensure_tenant_schema failed: {}", e);
                Box::<dyn std::error::Error + Send + Sync>::from(e.to_string())
            })?;

        // 2.6 Populate local schools table in tenant schema
        println!("Populating local schools table for school_id: {}", school_id);
        let mut conn = self.repos.db_client.acquire_tenant_connection(&school_id).await
            .map_err(|e| Box::<dyn std::error::Error + Send + Sync>::from(e.to_string()))?;
        
        sqlx::query("INSERT INTO schools (school_id, school_name, data) VALUES ($1, $2, $3)")
            .bind(&school_id)
            .bind(school_payload["schoolName"].as_str().unwrap_or(""))
            .bind(&school_payload)
            .execute(&mut *conn)
            .await
            .map_err(|e| Box::<dyn std::error::Error + Send + Sync>::from(e.to_string()))?;

        // 3. Create Auth record
        println!("Creating auth record...");
        self.repos
            .auth
            .update_auth(
                &school_id,
                json!({
                    "password": hashed_password,
                    "password_temp": false
                }),
            )
            .await.map_err(|e| {
                println!("update_auth failed: {}", e);
                e
            })?;

        // 4. Initialize Infrastructure (Spaces & Items)
        let default_mats = academic_utils::get_default_materials();
        let default_spaces = academic_utils::get_default_spaces();

        println!("Initializing Infrastructure (Spaces & Items)...");
        for space_type in default_spaces {
            println!("Adding space: {}", space_type);
            self.repos
                .resource
                .add_space(&school_id, json!({"id": space_type, "name": space_type}))
                .await?;

            let mut items = Vec::new();
            match space_type {
                "classroom" => {
                    items = academic_utils::generate_classes(class_level_start as i32, class_level as i32);
                }
                "kitchen" => items.push("Kitchen 1".to_string()),
                "storeroom" => items.push("Storeroom 1".to_string()),
                "office" => {
                    items.push("Principal Office".to_string());
                    items.push("Staff Office".to_string());
                }
                "ground" => items.push("Playground".to_string()),
                "parking" => items.push("Parking 1".to_string()),
                _ => {}
            }

            println!("Adding {} items to space {}", items.len(), space_type);
            for item in items {
                let item_id = item.to_lowercase().replace(' ', "-");
                self.repos.resource.add_item(&school_id, space_type, json!({
                    "id": item_id,
                    "itemName": item.clone(),
                    "roomNumber": if space_type == "classroom" { item.clone() } else { "".to_string() },
                    "classId": if space_type == "classroom" { Some(item_id.clone()) } else { None::<String> }
                })).await?;

                if let Some(mats) = default_mats.get(space_type) {
                    for mat in mats {
                        let material_name = mat["materialName"].as_str().unwrap();
                        let material_id = material_name.to_lowercase();
                        self.repos
                            .resource
                            .add_material(&school_id, mat.clone())
                            .await?;
                        self.repos
                            .resource
                            .add_material_location(
                                &school_id,
                                &material_id,
                                space_type,
                                &item_id,
                                mat["quantity"].as_i64().unwrap() as i32,
                            )
                            .await?;
                    }
                }
            }
        }

        // 5. Initialize Academic Structure
        let class_names = academic_utils::generate_classes(class_level_start as i32, class_level as i32);
        println!("Generated {} class names to initialize", class_names.len());
        let subjects_map = get_subjects();
        for class_name in class_names {
            println!("Initialing class: {}", class_name);
            let class_id = class_name.to_lowercase().replace(' ', "-");
            let fee = academic_utils::calculate_fee(&class_name) as f64;
            let sections = academic_utils::generate_sections(0);

            let mut streams = Vec::new();
            if class_name.starts_with("Class 11") || class_name.starts_with("Class 12") {
                let parts: Vec<&str> = class_name.split_whitespace().collect();
                if parts.len() >= 3 {
                    streams.push(parts[2].to_string());
                }
            }

            self.repos
                .academic
                .add_class(
                    &school_id,
                    json!({
                        "id": class_id,
                        "className": class_name,
                        "classFees": fee,
                        "totalClassStudents": 0,
                        "sections": sections,
                        "streams": streams,
                        "totalClassTeachers": 0,
                        "totalPeriods": 0
                    }),
                )
                .await?;

            if let Some(subjs) = subjects_map.get(class_name.as_str()) {
                for subj_name in subjs {
                    let prefix = &subj_name.replace(' ', "");
                    let prefix = &prefix[..std::cmp::min(4, prefix.len())].to_uppercase();
                    let subj_id = format!("{}{:03}", prefix, rand::random::<u32>() % 1000);
                    self.repos
                        .academic
                        .add_subject(
                            &school_id,
                            json!({
                                "subjectId": subj_id,
                                "subjectName": subj_name,
                                "classId": class_id,
                                "className": class_name,
                                "subjectFees": fee
                            }),
                        )
                        .await?;
                }
            }
        }

        // System Audit Log
        let _ = self.repos.audit.log_action(
            &school_id,
            admin_id,
            "SCHOOL",
            &school_id,
            "SETUP",
            data
        ).await;

        Ok(json!({
            "success": true,
            "schoolId": school_id,
            "schoolCode": school_code,
            "message": "School setup completed with full logic parity"
        }))
    }

    async fn get_setup(&self, school_id: &str) -> Result<Value, AppError> {
        match self.repos.school.get_school(school_id).await? {
            Some(v) => Ok(v),
            None => Err(Box::<dyn std::error::Error + Send + Sync>::from("School not found")),
        }
    }
}

impl PostgresSetupService {
    // Removed redundant logic (moved to academic_utils.rs)

    #[allow(dead_code)]
    async fn get_next_sequence_val(
        &self,
        seq_name: &str,
    ) -> Result<i64, Box<dyn Error + Send + Sync>> {
        use sqlx::Row;
        let query = format!("SELECT nextval('{}')", seq_name);
        let row: sqlx::postgres::PgRow = sqlx::query(&query)
            .fetch_one(&self.repos.db_client.pool)
            .await?;
        Ok(row.get(0))
    }
}
