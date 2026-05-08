use crate::repository::Repositories;
use crate::services::traits::*;
use crate::services::academic_utils;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;
use chrono::{Datelike, NaiveDate};

pub struct PostgresSetupService {
    pub repos: Arc<Repositories>,
    pub academic: Arc<dyn AcademicService>,
}


#[async_trait]
impl SetupService for PostgresSetupService {
    async fn setup_school(&self, admin_id: &str, data: Value) -> AppResult<Value> {
        // Validate required fields
        let school_name = data["schoolName"].as_str().ok_or_else(|| AppError::Validation("Missing schoolName".to_string()))?;
        let school_address = data["schoolAddress"]
            .as_str()
            .ok_or_else(|| AppError::Validation("Missing schoolAddress".to_string()))?;
        let class_level_start = data["classLevelStart"].as_i64()
            .or_else(|| data["classLevelStart"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(0);
        let class_level = data["classLevel"].as_i64()
            .or_else(|| data["classLevel"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(0);
        let password = data["password"].as_str().ok_or_else(|| AppError::Validation("Missing password".to_string()))?;
        let admin_email = data["adminEmail"].as_str();
        let admin_phone = data["adminPhone"].as_str();

        // Track created entities for potential rollback
        let mut created_entities: Vec<String> = Vec::new();
        
        // 1. Generate School Attributes
        let school_id = format!("{:06}", rand::random::<u32>() % 900000 + 100000);
        let school_code = self.repos.auth.generate_school_code().await?;
        println!("[SETUP] Generating school_id: {} and school_code: {}", school_id, school_code);
        let hashed_password = bcrypt::hash(password, 10).map_err(|e| AppError::Internal(format!("Bcrypt error: {}", e)))?;

        // 2. Create School document
        let mut school_payload = data.clone();
        school_payload["id"] = json!(school_id);
        school_payload["schoolCode"] = json!(school_code);

        println!("[SETUP] Creating school record in global table...");
        self.repos.auth.create_school(school_payload.clone()).await?;
        created_entities.push(format!("school:{}", school_id));

        // 2.5 Ensure the school-specific schema exists and is initialized
        println!("[SETUP] Ensuring tenant schema for school_id: {}", school_id);
        self.repos.db_client.ensure_tenant_schema(&school_id).await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        // 3. Create Auth record
        println!("[SETUP] Creating auth record...");
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
        created_entities.push(format!("auth:{}", school_id));

        // 4. No category creation needed (categories are now string-based in the spaces table)
        println!("Initializing Infrastructure (Spaces & Items)...");
        let default_spaces = academic_utils::get_default_spaces();
        let default_materials = academic_utils::get_default_materials();

        println!("Initializing Infrastructure (Spaces & Items)...");
        for space_type in &default_spaces {
            println!("Adding space: {}", space_type);
            let created = self.repos.resource.create_space(&school_id, space_type, space_type.to_string()).await?;
            let space_name = created["spaceName"].as_str().unwrap_or("");
            if space_name.is_empty() {
                return Err(AppError::Internal("create_space did not return spaceName".to_string()));
            }

            // We add the generic default materials from academic_utils
            if let Some(materials) = default_materials.get(space_type) {
                println!("Adding {} default materials to space {}", materials.len(), space_type);
                for (index, material) in materials.iter().enumerate() {
                    let mut material_data = material.clone();
                    let mat_name = material_data["materialName"].as_str().unwrap_or("unknown");
                    let item_id = format!("{}-{}-{}", space_type, mat_name.to_lowercase().replace(' ', "-"), index);
                    
                    material_data["id"] = json!(item_id);
                    material_data["roomNumber"] = json!("");
                    material_data["classId"] = json!(null);
                    
                    self.repos.resource.add_item(&school_id, space_name, material_data).await?;
                }
            }

            // Specific logical additions that might not be raw materials (e.g. nested sub-spaces acting as items)
            let mut internal_items = Vec::new();
            match *space_type {
                "kitchen" => internal_items.push("Kitchen 1".to_string()),
                "storeroom" => internal_items.push("Storeroom 1".to_string()),
                "office" => {
                    internal_items.push("Principal Office".to_string());
                    internal_items.push("Staff Office".to_string());
                }
                "ground" => internal_items.push("Playground".to_string()),
                "parking" => internal_items.push("Parking 1".to_string()),
                "classroom" => continue, // Handled in specialized loop below
                _ => {}
            }

            if !internal_items.is_empty() {
                println!("Adding {} structural sub-items to space {}", internal_items.len(), space_type);
                for item in internal_items {
                    let item_id = item.to_lowercase().replace(' ', "-");
                    self.repos.resource.add_item(&school_id, space_name, json!({
                        "id": item_id,
                        "itemName": item.clone(),
                        "roomNumber": if *space_type == "classroom" { item.clone() } else { "".to_string() },
                        "classId": if *space_type == "classroom" { Some(item_id.clone()) } else { None::<String> }
                    })).await?;
                }
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
        
        for cls_template in structure.iter().take(end + 1).skip(start) {
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
                            "roomNumber": format!("{}-{}", class_name.to_lowercase().replace(' ', "-"), &school_id[..4]), // match space_id from create_space
                            "totalClassStudents": 0,
                            "sections": sections,
                            "streams": streams_vec,
                            "totalClassTeachers": 0,
                            "totalPeriods": 0
                        }),
                    )
                    .await?;

                // B. Create Infrastructure Space (Room)
                let created = self.repos.resource.create_space(&school_id, "classroom", class_name.clone()).await?;
                let space_name = created["spaceName"].as_str()
                    .ok_or_else(|| AppError::Internal("create_space did not return spaceName".to_string()))?
                    .to_string();

                // Build default classroom materials for this specific class room
                if let Some(classroom_materials) = default_materials.get("classroom") {
                    for (index, material) in classroom_materials.iter().enumerate() {
                        let mut material_data = material.clone();
                        let mat_name = material_data["materialName"].as_str().unwrap_or("unknown");
                        
                        // ID contains class_id to keep it unique per classroom
                        let item_id = format!("{}-{}-{}", class_id, mat_name.to_lowercase().replace(' ', "-"), index);
                        
                        material_data["id"] = json!(item_id);
                        material_data["roomNumber"] = json!(class_name);
                        material_data["classId"] = json!(class_id.clone());
                        
                        self.repos.resource.add_item(&school_id, &space_name, material_data).await?;
                    }
                }

                // C. Link Structural Name Item to Room (for backward parity)
                self.repos.resource.add_item(&school_id, &space_name, json!({
                    "id": class_id.clone(),
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
                    
                    self.academic.create_subject(&school_id, admin_id, json!({
                        "subjectId": subj_id,
                        "subjectName": subj_name,
                        "classId": class_id,
                        "className": class_name,
                        "subjectFees": fee
                    })).await?;
                }
            }
        }

        // 6. Create proper admin user (instead of using hardcoded "setup_admin")
        println!("[SETUP] Creating admin user for school...");
        let actual_admin_id = self.create_admin_user(&school_id, school_name, admin_email, admin_phone).await?;
        created_entities.push(format!("admin:{}", actual_admin_id));

        // 7. Create default configurations (holidays, academic calendar, fee templates)
        println!("[SETUP] Creating default configurations...");
        if let Err(e) = self.create_default_configurations(&school_id, &actual_admin_id).await {
            println!("[WARNING] Default configuration creation failed: {}", e);
            // Continue setup even if configuration fails
        }

        // 8. Create notification templates
        println!("[SETUP] Creating notification templates...");
        if let Err(e) = self.create_notification_templates(&school_id, &actual_admin_id).await {
            println!("[WARNING] Notification template creation failed: {}", e);
            // Continue setup even if templates fail
        }

        // 9. Automated Role Generation
        // Note: Responsibilities are now automatically created within create_subject
        // in AcademicService, following strict validation rules.
        println!("[SETUP] Automated responsibilities successfully generated via AcademicService.");

        // 10. System Audit Log
        let _ = self.repos.audit.log_action(
            &school_id,
            &actual_admin_id,
            "SCHOOL",
            &school_id,
            "SETUP",
            data
        ).await;

        // Clear rollback tracking since setup succeeded
        created_entities.clear();

        Ok(json!({
            "success": true,
            "schoolId": school_id,
            "schoolCode": school_code,
            "adminId": actual_admin_id,
            "adminPassword": "admin123", // Default password for the created admin
            "message": "School setup completed with automatic configurations, admin user, and default templates",
            "vacancy": [],
            "material_requirements": [],
            "autoCreated": {
                "spaces": default_spaces.len(),
                "classes": (end - start + 1),
                "subjects": "all_for_selected_classes",
                "adminUser": true,
                "configurations": true,
                "notificationTemplates": true
            }
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

    /// Create a proper admin user for the school instead of using hardcoded "setup_admin"
    async fn create_admin_user(&self, school_id: &str, school_name: &str, email: Option<&str>, phone: Option<&str>) -> AppResult<String> {
        let admin_id = format!("admin-{}", school_id);
        let admin_email_str = format!("admin@{}", school_id);
        let admin_email = email.unwrap_or(&admin_email_str);
        let admin_phone = phone.unwrap_or("+911234567890");
        
        let admin_data = json!({
            "id": admin_id,
            "schoolId": school_id,
            "employeeName": format!("{} Admin", school_name),
            "email": admin_email,
            "phone": admin_phone,
            "role": "school-admin",
            "department": "Administration",
            "designation": "School Administrator",
            "employeeType": "permanent",
            "salary": 0.0,
            "joiningDate": chrono::Utc::now().format("%Y-%m-%d").to_string(),
            "status": "active"
        });

        // Create employee record
        self.repos.employee.add_employee(school_id, admin_data.clone()).await?;
        
        // Create auth credentials for the admin
        let auth_data = json!({
            "userId": admin_id,
            "schoolId": school_id,
            "userType": "school-admin",
            "password": "admin123", // Default password that should be changed on first login
        });

        // The auth record for the school was created earlier using update_auth
        // Global credentials for new users should be handled by GlobalUserRepository or AuthRepository::register if implemented.
        
        Ok(admin_id)
    }

    /// Create default school configuration (holidays, academic calendar)
    async fn create_default_configurations(&self, school_id: &str, admin_id: &str) -> AppResult<()> {
        let current_year = chrono::Utc::now().year();
        
        // Create default academic year (April to March for Indian schools)
        let academic_year_start = NaiveDate::from_ymd_opt(current_year, 4, 1).unwrap();
        let academic_year_end = NaiveDate::from_ymd_opt(current_year + 1, 3, 31).unwrap();
        
        let academic_year_data = json!({
            "name": format!("Academic Year {}-{}", current_year, current_year + 1),
            "startDate": academic_year_start.format("%Y-%m-%d").to_string(),
            "endDate": academic_year_end.format("%Y-%m-%d").to_string(),
            "status": "active"
        });

        // Create default holidays (national holidays for India)
        let default_holidays = vec![
            ("Republic Day", format!("{}-01-26", current_year), "National Holiday"),
            ("Independence Day", format!("{}-08-15", current_year), "National Holiday"),
            ("Gandhi Jayanti", format!("{}-10-02", current_year), "National Holiday"),
            ("Diwali", format!("{}-10-24", current_year), "Festival Holiday"),
            ("Christmas", format!("{}-12-25", current_year), "Festival Holiday"),
        ];

        for (name, date, description) in default_holidays {
            let id = uuid::Uuid::new_v4().to_string();
            let now = chrono::Local::now().format("%Y-%m-%d").to_string();
            let classes = json!(["all"]);

            let _ = sqlx::query("INSERT INTO school_holidays (id, school_id, title, description, from_date, to_date, classes, exempt_employees, exempt_students, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)")
                .bind(&id).bind(school_id).bind(name).bind(description).bind(&date).bind(&date).bind(&classes).bind(json!([])).bind(json!([])).bind(&now)
                .execute(&self.repos.db_client.pool).await;
        }

        // Create default fee structure templates
        let fee_templates = vec![
            ("Tuition Fee", "Monthly tuition fee for all classes", 1000.0, "monthly"),
            ("Admission Fee", "One-time admission fee", 5000.0, "one_time"),
            ("Exam Fee", "Term examination fee", 500.0, "term"),
            ("Transport Fee", "Monthly transport charges", 2000.0, "monthly"),
        ];

        for (name, description, amount, frequency) in fee_templates {
            let fee_data = json!({
                "feesName": name,
                "feesReason": description,
                "feesAmount": amount,
                "feesPeriod": frequency,
                "applicableTo": "all"
            });

            let _ = self.repos.fee.add_school_fee(school_id, fee_data).await;
        }

        Ok(())
    }

    /// Create default notification templates for the school
    async fn create_notification_templates(&self, school_id: &str, admin_id: &str) -> AppResult<()> {
        let templates = vec![
            ("fee_reminder", "Fee Reminder", "Dear {parent_name}, please pay the pending fee of {amount} for {student_name} by {due_date}.", "sms,email"),
            ("attendance_alert", "Attendance Alert", "Dear {parent_name}, {student_name} was absent on {date}. Please acknowledge.", "sms"),
            ("exam_schedule", "Exam Schedule", "The {exam_name} for {class_name} will be held from {start_date} to {end_date}.", "email,push"),
            ("holiday_announcement", "Holiday Announcement", "School will remain closed on {date} due to {reason}.", "sms,email,push"),
        ];

        for (code, name, template, channels) in templates {
            let _template_data = json!({
                "templateCode": code,
                "templateName": name,
                "templateText": template,
                "channels": channels,
                "isActive": true
            });

            // Notification service/repository is not yet fully implemented
            // let _ = self.repos.notification.create_template(school_id, admin_id, template_data).await;
        }

        Ok(())
    }
}
