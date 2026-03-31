use crate::repository::Repositories;
use crate::services::traits::*;
use crate::services::academic_utils;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;

pub struct PostgresSetupService {
    pub repos: Arc<Repositories>,
}


#[async_trait]
impl SetupService for PostgresSetupService {
    async fn setup_school(&self, admin_id: &str, data: Value) -> AppResult<Value> {
        let _school_name = data["schoolName"].as_str().ok_or_else(|| AppError::Validation("Missing schoolName".to_string()))?;
        let _school_address = data["schoolAddress"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing schoolAddress".to_string()))?;
        let class_level_start = data["classLevelStart"].as_i64()
            .or_else(|| data["classLevelStart"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(0);
        let class_level = data["classLevel"].as_i64()
            .or_else(|| data["classLevel"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(0);
        let password = data["password"].as_str().ok_or_else(|| AppError::Validation("Missing password".to_string()))?;

        // 1. Generate School Attributes
        let school_id = format!("{:06}", rand::random::<u32>() % 900000 + 100000);
        let school_code = self.repos.auth.generate_school_code().await?;
        println!("Generating school_id: {} and school_code: {}", school_id, school_code);
        let hashed_password = bcrypt::hash(password, 10).map_err(|e| AppError::Internal(format!("Bcrypt error: {}", e)))?;

        // 2. Create School document
        let mut school_payload = data.clone();
        school_payload["id"] = json!(school_id);
        school_payload["schoolCode"] = json!(school_code);

        println!("Creating school record in global table...");
        self.repos.auth.create_school(school_payload.clone()).await?;

        // 2.5 Ensure the school-specific schema exists and is initialized
        println!("Ensuring tenant schema for school_id: {}", school_id);
        self.repos.db_client.ensure_tenant_schema(&school_id).await
            .map_err(|e| AppError::Internal(e.to_string()))?;

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
            .await?;

        // 4. Create Space Categories
        let default_categories = academic_utils::get_default_space_categories();
        println!("Creating space categories...");
        for category in default_categories {
            self.repos.resource.create_space_category(&school_id, category).await?;
        }

        // 5. Initialize Infrastructure (Spaces & Items)
        let default_spaces = academic_utils::get_default_spaces();

        // Build mapping from category name to id
        let categories = self.repos.resource.get_space_categories(&school_id).await?;
        let mut category_map = HashMap::new();
        for cat in categories {
            if let (Some(id), Some(name)) = (cat["id"].as_i64(), cat["name"].as_str()) {
                category_map.insert(name.to_string(), id as i32);
            }
        }

        println!("Initializing Infrastructure (Spaces & Items)...");
        for space_type in default_spaces {
            println!("Adding space: {}", space_type);
            let category_id = category_map.get(space_type).cloned()
                .ok_or_else(|| AppError::Internal(format!("Category not found for {}", space_type)))?;
            
            // This call to create_space handles ALL automatic material allocation
            // based on category templates, just like a frontend API call would.
            let space_data = json!({
                "categoryId": category_id,
                "spaceNumber": "",
                "capacity": 0,
            });
            let created = self.repos.resource.create_space(&school_id, space_data).await?;
            let space_id = created["spaceId"].as_str().unwrap_or("");
            if space_id.is_empty() {
                return Err(AppError::Internal("create_space did not return spaceId".to_string()));
            }

            // We only need to add specialized sub-items (like 'Principal Office') 
            // that aren't part of the generic template.
            let mut items = Vec::new();
            match space_type {
                "kitchen" => items.push("Kitchen 1".to_string()),
                "storeroom" => items.push("Storeroom 1".to_string()),
                "office" => {
                    items.push("Principal Office".to_string());
                    items.push("Staff Office".to_string());
                }
                "ground" => items.push("Playground".to_string()),
                "parking" => items.push("Parking 1".to_string()),
                "classroom" => continue, // Handled in specialized loop below
                _ => {}
            }

            println!("Adding {} items to space {}", items.len(), space_type);
            for item in items {
                let item_id = item.to_lowercase().replace(' ', "-");
                self.repos.resource.add_item(&school_id, space_id, json!({
                    "id": item_id,
                    "itemName": item.clone(),
                    "roomNumber": if space_type == "classroom" { item.clone() } else { "".to_string() },
                    "classId": if space_type == "classroom" { Some(item_id.clone()) } else { None::<String> }
                })).await?;
            }
        }

        // 5. Initialize Academic Structure & Automated Infrastructure Roles
        let structure = academic_utils::get_indian_school_structure();
        // Frontend now sends 0-based array indices directly:
        //   0=Pre-Nursery, 1=Nursery, 2=LKG, 3=UKG, 4=Class1 ... 15=Class12
        // classLevelStart / classLevel are these indices.
        let start = (class_level_start as usize).min(structure.len() - 1);
        let end = (class_level as usize).min(structure.len() - 1);
        let (start, end) = if start <= end { (start, end) } else { (end, start) };


        println!("Initializing Academic Structure & Automated Roles for levels {} to {}", start, end);
        
        for i in start..=end {
            let cls_template = &structure[i];
            let class_names_to_create = if let Some(ref streams) = cls_template.streams {
                // Ensure deterministic ordering or just iterate
                let mut names = streams.keys().map(|s| format!("{} {}", cls_template.name, s)).collect::<Vec<_>>();
                names.sort(); // Sorting for consistency
                names
            } else {
                vec![cls_template.name.to_string()]
            };

            for class_name in class_names_to_create {
                println!("Initialing class: {}", class_name);
                let class_id = class_name.to_lowercase().replace(' ', "-");
                let fee = academic_utils::calculate_fee(&class_name) as f64;
                let sections = academic_utils::generate_sections(0);

                let mut streams_vec = Vec::new();
                if class_name.contains("Class 11") || class_name.contains("Class 12") {
                    let parts: Vec<&str> = class_name.split_whitespace().collect();
                    if parts.len() >= 3 {
                        streams_vec.push(parts[2].to_string());
                    }
                }

                // A. Create Academic Class
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
                            "streams": streams_vec,
                            "totalClassTeachers": 0,
                            "totalPeriods": 0
                        }),
                    )
                    .await?;

                // B. Create Infrastructure Space (Room)
                let category_id = *category_map.get("classroom")
                    .ok_or_else(|| AppError::Internal("Classroom category not found".to_string()))?;
                let space_data = json!({
                    "categoryId": category_id,
                    "spaceNumber": class_id,
                    "capacity": 0,
                    "spaceName": class_name,
                });
                let created = self.repos.resource.create_space(&school_id, space_data).await?;
                let space_id = created["spaceId"].as_str()
                    .ok_or_else(|| AppError::Internal("create_space did not return spaceId".to_string()))?
                    .to_string();

                // C. Add Item to the Space
                let item_id = class_id.clone();
                self.repos.resource.add_item(&school_id, &space_id, json!({
                    "id": item_id,
                    "itemName": class_name.clone(),
                    "roomNumber": class_name.clone(),
                    "classId": Some(class_id.clone())
                })).await?;

                // D. Create Academic Subjects
                let subjects = if let Some(ref streams) = cls_template.streams {
                    let stream_part = class_name.replace(cls_template.name.as_str(), "").trim().to_string();
                    streams.get(&stream_part).cloned().unwrap_or_default()
                } else {
                    cls_template.subjects.clone()
                };

                for subj_name in subjects {
                    // 1. Create Academic Subject
                    let prefix = &subj_name.replace(' ', "");
                    let prefix = &prefix[..std::cmp::min(4, prefix.len())].to_uppercase();
                    let subj_id = format!("{}{:06}", prefix, rand::random::<u32>() % 1_000_000);
                    
                    self.repos.academic.add_subject(&school_id, json!({
                        "subjectId": subj_id,
                        "subjectName": subj_name,
                        "classId": class_id,
                        "className": class_name,
                        "subjectFees": fee
                    })).await?;
                }
            }
        }

        // 6. Automated Role Generation
        // Trigger the standard subject role sync to create infrastructure roles (responsibilities)
        // This ensures the metadata (required_employee: 0) and unique role naming are handled 
        // exactly as they would be via the "Sync Roles" API endpoint.
        println!("Syncing automated roles for school: {}", school_id);
        self.repos.responsibility.sync_subject_roles(&school_id).await?;

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
            "message": "School setup completed with full logic parity",
            "vacancy": [],
            "material_requirements": []
        }))
    }

    async fn get_setup(&self, school_id: &str) -> AppResult<Value> {
        match self.repos.school.get_school(school_id).await? {
            Some(v) => Ok(v),
            None => Err(AppError::NotFound("School not found".to_string())),
        }
    }
}

impl PostgresSetupService {
    #[allow(dead_code)]
    async fn get_next_sequence_val(
        &self,
        seq_name: &str,
    ) -> AppResult<i64> {
        use sqlx::Row;
        let query = format!("SELECT nextval('{}')", seq_name);
        let row: sqlx::postgres::PgRow = sqlx::query(&query)
            .fetch_one(&self.repos.db_client.pool)
            .await?;
        Ok(row.get(0))
    }
}
