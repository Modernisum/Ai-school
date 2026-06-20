use crate::repository::Repositories;
use crate::services::traits::*;
use crate::services::academic_utils;
use crate::logic::password_helper::hash_password;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;
use chrono::Datelike;

pub struct PostgresSetupService {
    pub repos: Arc<Repositories>,
    pub academic: Arc<dyn AcademicService>,
}

#[async_trait]
impl SetupService for PostgresSetupService {
    async fn setup_school(&self, _admin_id: &str, data: Value) -> AppResult<Value> {
        // Validate required fields
        let school_name = data["schoolName"].as_str().ok_or_else(|| AppError::Validation("Missing schoolName".to_string()))?;
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
        let admin_email = data["adminEmail"].as_str();
        let admin_phone = data["adminPhone"].as_str();
        
        // 1. Generate School Attributes
        let school_id = format!("{:06}", rand::random::<u32>() % 900000 + 100000);
        let school_code = self.repos.auth.generate_school_code().await?;
        println!("[SETUP] Generating school_id: {} and school_code: {}", school_id, school_code);
        let hashed_password = hash_password(password)?;

        // 2. Create School document
        let mut school_payload = data.clone();
        school_payload["id"] = json!(school_id);
        school_payload["schoolCode"] = json!(school_code);

        // 2.5 Ensure the school-specific schema exists and is initialized
        println!("[SETUP] Ensuring tenant schema for school_id: {}", school_id);
        self.repos.db_client.ensure_tenant_schema(&school_id).await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        // 3. Assemble Spaces and Items
        let default_spaces = academic_utils::get_default_spaces();
        let default_materials = academic_utils::get_default_materials();
        let mut spaces = Vec::new();
        let mut items = Vec::new();

        for space_type in &default_spaces {
            spaces.push((space_type.to_string(), space_type.to_string()));

            if let Some(materials) = default_materials.get(space_type) {
                for (index, material) in materials.iter().enumerate() {
                    let mut material_data = material.clone();
                    let mat_name = material_data["materialName"].as_str().unwrap_or("unknown");
                    let item_id = format!("{}-{}-{}", space_type, mat_name.to_lowercase().replace(' ', "-"), index);
                    
                    material_data["id"] = json!(item_id);
                    material_data["roomNumber"] = json!("");
                    material_data["classId"] = json!(null);
                    
                    items.push((space_type.to_string(), material_data));
                }
            }

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
                "classroom" => continue,
                _ => {}
            }

            for item in internal_items {
                let item_id = item.to_lowercase().replace(' ', "-");
                items.push((space_type.to_string(), json!({
                    "id": item_id,
                    "itemName": item.clone(),
                    "roomNumber": "",
                    "classId": null
                })));
            }
        }

        // 4. Initialize Academic Structure & Responsibilities
        let structure = academic_utils::get_indian_school_structure();
        let start = (class_level_start as usize).min(structure.len() - 1);
        let end = (class_level as usize).min(structure.len() - 1);
        let (start, end) = if start <= end { (start, end) } else { (end, start) };

        let mut responsibilities = Vec::new();

        for cls_template in structure.iter().take(end + 1).skip(start) {
            let class_names_to_create = if let Some(ref streams) = cls_template.streams {
                let mut names = streams.keys().map(|s| format!("{} {}", cls_template.name, s)).collect::<Vec<_>>();
                names.sort();
                names
            } else {
                vec![cls_template.name.to_string()]
            };

            for class_name in class_names_to_create {
                let class_id = class_name.to_lowercase().replace(' ', "-");
                let fee = academic_utils::calculate_fee(&class_name) as f64;

                // Add classroom space
                spaces.push(("classroom".to_string(), class_name.clone()));

                // Add default classroom materials
                if let Some(classroom_materials) = default_materials.get("classroom") {
                    for (index, material) in classroom_materials.iter().enumerate() {
                        let mut material_data = material.clone();
                        let mat_name = material_data["materialName"].as_str().unwrap_or("unknown");
                        let item_id = format!("{}-{}-{}", class_id, mat_name.to_lowercase().replace(' ', "-"), index);
                        
                        material_data["id"] = json!(item_id);
                        material_data["roomNumber"] = json!(class_name);
                        material_data["classId"] = json!(class_id.clone());
                        
                        items.push((class_name.clone(), material_data));
                    }
                }

                // Add default responsibilities for academic subjects
                let subjects = if let Some(ref streams) = cls_template.streams {
                    let stream_part = class_name.replace(cls_template.name.as_str(), "").trim().to_string();
                    streams.get(&stream_part).cloned().unwrap_or_default()
                } else {
                    cls_template.subjects.clone()
                };

                for subj_name in subjects {
                    responsibilities.push(json!({
                        "name": format!("{} - {}", subj_name, class_name),
                        "description": format!("Teaching {} for {}", subj_name, class_name),
                        "spaceCategory": "classroom",
                        "employeeType": "teaching",
                        "workLevel": "senior",
                        "workAmount": 0.0,
                        "workPeriod": "monthly",
                        "spaceIds": vec![class_id.clone()],
                        "studentFee": fee
                    }));
                }
            }
        }

        // 5. Admin Employee Details
        let actual_admin_id = format!("admin-{}", school_id);
        let admin_email_str = admin_email.unwrap_or(&format!("admin@{}", school_id)).to_string();
        let admin_phone_str = admin_phone.unwrap_or("+911234567890").to_string();
        
        let admin_employee = json!({
            "employeeId": actual_admin_id,
            "schoolId": school_id,
            "employeeName": format!("{} Admin", school_name),
            "email": admin_email_str,
            "phone": admin_phone_str,
            "role": "school-admin",
            "department": "Administration",
            "designation": "School Administrator",
            "employeeType": "permanent",
            "salary": 0.0,
            "joiningDate": chrono::Utc::now().format("%Y-%m-%d").to_string(),
            "status": "active"
        });

        // 6. Default Holidays
        let current_year = chrono::Utc::now().year();
        let default_holidays = vec![
            ("Republic Day", format!("{}-01-26", current_year), "National Holiday"),
            ("Independence Day", format!("{}-08-15", current_year), "National Holiday"),
            ("Gandhi Jayanti", format!("{}-10-02", current_year), "National Holiday"),
            ("Diwali", format!("{}-10-24", current_year), "Festival Holiday"),
            ("Christmas", format!("{}-12-25", current_year), "Festival Holiday"),
        ];
        let mut holidays = Vec::new();
        for (name, date, description) in default_holidays {
            let id = uuid::Uuid::new_v4().to_string();
            let now = chrono::Local::now().format("%Y-%m-%d").to_string();
            holidays.push(json!({
                "id": id,
                "title": name,
                "description": description,
                "fromDate": date,
                "toDate": date,
                "classes": json!(["all"]),
                "exemptEmployees": json!([]),
                "exemptStudents": json!([]),
                "createdAt": now
            }));
        }

        // 7. Default Fees
        let fee_templates = vec![
            ("Tuition Fee", "Monthly tuition fee for all classes", 1000.0, "monthly"),
            ("Admission Fee", "One-time admission fee", 5000.0, "one_time"),
            ("Exam Fee", "Term examination fee", 500.0, "term"),
            ("Transport Fee", "Monthly transport charges", 2000.0, "monthly"),
        ];
        let mut fees = Vec::new();
        for (name, description, amount, frequency) in fee_templates {
            fees.push(json!({
                "feesName": name,
                "feesReason": description,
                "feesAmount": amount,
                "feesPeriod": frequency,
                "applicableTo": "all"
            }));
        }

        // 8. Run transactional setup
        let setup_payload = crate::repository::traits::SchoolSetupPayload {
            school_id: school_id.clone(),
            school_name: school_name.to_string(),
            school_logo_url: data["schoolLogoUrl"].as_str().map(|s| s.to_string()),
            school_data: school_payload,
            hashed_password,
            admin_id: actual_admin_id.clone(),
            admin_email: admin_email_str,
            admin_phone: admin_phone_str,
            admin_employee,
            spaces,
            items,
            responsibilities,
            holidays,
            fees,
        };

        println!("[SETUP] Executing transactional setup for school: {}...", school_id);
        self.repos.school.setup_school_transaction(setup_payload).await?;

        Ok(json!({
            "success": true,
            "schoolId": school_id,
            "schoolCode": school_code,
            "adminId": actual_admin_id,
            "adminPassword": "admin123", // Default password for the created admin
            "message": "School setup completed with automatic configurations, admin user, and default templates in a single database transaction",
            "vacancy": [],
            "material_requirements": [],
            "autoCreated": {
                "spaces": default_spaces.len() + (end - start + 1),
                "classes": (end - start + 1),
                "subjects": "all_for_selected_classes",
                "adminUser": true,
                "configurations": true,
                "notificationTemplates": true
            }
        }))
    }

}
