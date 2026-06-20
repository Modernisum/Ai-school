mod queries;
mod validation;

pub use queries::StudentQueries;
pub use validation::StudentValidation;

use crate::error::{AppError, AppResult};
use crate::repository::Repositories;
use crate::services::traits::*;
use crate::services::utils::{audit::log_audit, global_sync, delta::calculate_delta};
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct PostgresStudentService {
    pub repos: Arc<Repositories>,
    pub queries: StudentQueries,
    pub validation: StudentValidation,
}

impl PostgresStudentService {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self {
            queries: StudentQueries::new(repos.clone()),
            validation: StudentValidation::new(repos.clone()),
            repos,
        }
    }
}

#[async_trait]
impl StudentService for PostgresStudentService {
    async fn create_student(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        // Security checks (Aadhaar, Phone, Email)
        self.validation.validate_student_data(school_id, data.clone()).await?;

        // Validate required fields
        let class_name = data["className"].as_str().ok_or_else(|| AppError::Validation("Missing className".to_string()))?;

        // 1. Get next roll number
        let roll_number = self
            .repos
            .student
            .get_next_roll_number(school_id, class_name)
            .await?;

        // 2. Assign section
        let section_size = 60; // Default section size
        
        let section = self.queries.get_section_for_roll(roll_number, section_size);

        // Full section name (which acts as the Space name for validation)
        let full_section_name = format!("{}-{}", class_name, section);

        // Security: Ensure the target space is actually a 'classroom' or 'lab'
        if let Ok(Some(space)) = self.repos.resource.get_space_details(school_id, &full_section_name).await {
            let category = space["spaceCategory"].as_str().or(space["category"].as_str()).unwrap_or("");
            let allowed_categories = ["classroom", "lab"];
            if !allowed_categories.contains(&category.to_lowercase().as_str()) {
                return Err(AppError::Validation(format!(
                    "Student cannot be assigned to '{}'. Students can only be assigned to spaces with 'classroom' or 'lab' category.", 
                    full_section_name
                )));
            }
        }

        // Auto-Creation of Space if it doesn't exist
        if let Ok(None) = self.repos.resource.get_space_details(school_id, &full_section_name).await {
            // Create a new classroom space matching the generated section name
            let _ = self.repos.resource.create_space(school_id, "classroom", full_section_name.clone(), None).await;
        }

        // 3. Generate Student ID
        let student_id = self.repos.student.generate_student_id(school_id).await?;

        let mut student_data = data.clone();
        
        // Auto-assign the generated section room (e.g. Class 10-A)
        // AND Seat Index (e.g. 1 to 60)
        let (section, room_index, full_section_name) = self.queries.calculate_room_and_section(roll_number, section_size, class_name);
        
        student_data["sectionRoom"] = json!(full_section_name);
        student_data["roomNumber"] = json!(room_index.to_string());
        
        // Auto-calculate Base Fees from Responsibilities
        if let Ok(fee) = self.repos.responsibility.get_student_fee_sum_for_space(school_id, &full_section_name).await {
            if fee > 0.0 {
                student_data["totalFees"] = json!(fee);
            }
        }

        student_data["studentId"] = json!(student_id);
        student_data["rollNumber"] = json!(roll_number);
        student_data["section"] = json!(section);
        student_data["status"] = json!("active");

        let result = self
            .repos
            .student
            .add_student(school_id, student_data.clone())
            .await?;

        tracing::info!(
            "Student Created: {} (Roll: {}, Class: {}) by admin: {}",
            student_id, roll_number, class_name, admin_id
        );

        // Audit Log
        log_audit(&self.repos.audit, school_id, admin_id, "STUDENT", &student_id, "CREATE", result.clone()).await;

        // Sync to Global User Table
        global_sync::sync(&self.repos.global_user, global_sync::build_sync_payload("student", school_id, &student_id, &student_data)).await;

        // Fetch responsibilities to embed in the response
        let responsibilities = self.repos.responsibility.get_student_responsibilities(school_id, &student_id).await.unwrap_or(vec![]);

        // Clean up response data to meet requirements
        let mut final_result = result.clone();
        if let Some(obj) = final_result.as_object_mut() {
            obj.remove("rollNumber");
            obj.remove("updatedAt");
            obj.remove("sectionRoom");
            obj.insert("responsibilities".to_string(), json!(responsibilities));
        }

        Ok(final_result)
    }

    async fn bulk_create_students(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Vec<Value>,
    ) -> AppResult<Value> {
        let mut successful = 0;
        let mut failed = 0;
        let mut errors = Vec::new();

        for (index, mut student_data) in data.into_iter().enumerate() {
            let row_number = student_data["rowNumber"]
                .as_u64()
                .unwrap_or((index + 2) as u64);

            let class_name = match student_data["className"].as_str() {
                Some(c) if !c.trim().is_empty() => c.to_string(),
                _ => {
                    failed += 1;
                    errors.push(json!({ "row": row_number, "error": "Missing className" }));
                    continue;
                }
            };

            let name = match student_data["name"].as_str() {
                Some(n) if !n.trim().is_empty() => n.to_string(),
                _ => {
                    failed += 1;
                    errors.push(json!({ "row": row_number, "error": "Missing name" }));
                    continue;
                }
            };

            // Security checks for bulk import
            if let Err(e) = self.validation.validate_student_data(school_id, student_data.clone()).await {
                failed += 1;
                let error_msg = format!("{}", e);
                errors.push(json!({ "row": row_number, "name": name, "error": error_msg }));
                continue;
            }

            let roll_number = match self
                .repos
                .student
                .get_next_roll_number(school_id, &class_name)
                .await
            {
                Ok(r) => r,
                Err(e) => {
                    failed += 1;
                    errors.push(json!({ "row": row_number, "name": name, "error": format!("Failed to generate roll number: {}", e) }));
                    continue;
                }
            };

            let section_size = 60;

            let section = self.queries.get_section_for_roll(roll_number, section_size);

            let full_section_name = format!("{}-{}", class_name, section);

            // Auto-Creation of Space if it doesn't exist
            if let Ok(None) = self.repos.resource.get_space_details(school_id, &full_section_name).await {
                let _ = self.repos.resource.create_space(school_id, "classroom", full_section_name.clone(), None).await;
            }

            let student_id = match self.repos.student.generate_student_id(school_id).await {
                Ok(id) => id,
                Err(e) => {
                    failed += 1;
                    errors.push(json!({ "row": row_number, "name": name, "error": format!("Failed to generate student ID: {}", e) }));
                    continue;
                }
            };

            let (section, room_index, full_section_name) = self.queries.calculate_room_and_section(roll_number, section_size, &class_name);

            student_data["studentId"] = json!(student_id);
            student_data["sectionRoom"] = json!(full_section_name);
            student_data["roomNumber"] = json!(room_index.to_string());
            student_data["rollNumber"] = json!(roll_number);
            student_data["section"] = json!(section);
            student_data["status"] = json!("active");

            // Auto-calculate Base Fees from Responsibilities
            if let Ok(fee) = self.repos.responsibility.get_student_fee_sum_for_space(school_id, &full_section_name).await {
                if fee > 0.0 {
                    student_data["totalFees"] = json!(fee);
                }
            }

            match self
                .repos
                .student
                .add_student(school_id, student_data.clone())
                .await
            {
                Ok(_) => {
                    successful += 1;
                    let student_id_str = student_data["studentId"].as_str().unwrap_or("unknown").to_string();
                    log_audit(&self.repos.audit, school_id, admin_id, "STUDENT", &student_id_str, "CREATE_BULK", student_data.clone()).await;
                    global_sync::sync(&self.repos.global_user, global_sync::build_sync_payload("student", school_id, &student_id_str, &student_data)).await;
                },
                Err(e) => {
                    failed += 1;
                    errors.push(json!({ "row": row_number, "name": name, "error": format!("Database Error: {}", e) }));
                }
            }
        }

        Ok(json!({
            "total": successful + failed,
            "successful": successful,
            "failed": failed,
            "errors": errors
        }))
    }

    async fn list_students(&self, school_id: &str) -> AppResult<Vec<Value>> {
        self.repos.student.get_students(school_id).await.map_err(AppError::from)
    }

    async fn list_students_paginated(
        &self,
        school_id: &str,
        page: i32,
        limit: i32,
        space_id: Option<&str>,
        status: Option<&str>,
        search: Option<&str>,
    ) -> AppResult<(Vec<Value>, i64)> {
        self.repos.student.get_students_paginated(
            school_id, 
            page, 
            limit, 
            space_id, 
            None, // section
            status, 
            search
        ).await.map_err(AppError::from)
    }

    async fn list_students_by_space(
        &self,
        school_id: &str,
        space_id: &str,
    ) -> AppResult<Vec<Value>> {
        self.repos
            .student
            .get_students_by_class(school_id, space_id, None)
            .await
            .map_err(AppError::from)
    }

    async fn get_student(&self, school_id: &str, student_id: &str) -> AppResult<Option<Value>> {
        self.repos.student.get_student(school_id, student_id).await.map_err(AppError::from)
    }

    async fn update_student(
        &self,
        school_id: &str,
        student_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()> {
        let old_student = self
            .repos
            .student
            .get_student(school_id, student_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Student not found".to_string()))?;

        let old_class = old_student["className"].as_str().unwrap_or("");
        let new_class = data["className"].as_str();

        let mut final_data = data.clone();
        if let Some(nc) = new_class {
            if nc != old_class {
                let next_roll = self
                    .repos
                    .student
                    .get_next_roll_number(school_id, nc)
                    .await?;
                
                let section_size = 60;

                let section = self.queries.get_section_for_roll(next_roll, section_size);
                let full_section_name = format!("{}-{}", nc, section);

                // Security: Ensure the target space is actually a 'classroom' or 'lab'
                if let Ok(Some(space)) = self.repos.resource.get_space_details(school_id, &full_section_name).await {
                    let category = space["spaceCategory"].as_str().or(space["category"].as_str()).unwrap_or("");
                    let allowed_categories = ["classroom", "lab"];
                    if !allowed_categories.contains(&category.to_lowercase().as_str()) {
                        return Err(AppError::Validation(format!(
                            "Student cannot be moved to '{}'. Students can only be assigned to spaces with 'classroom' or 'lab' category.", 
                            full_section_name
                        )));
                    }
                }

                // Auto-Creation of Space if it doesn't exist
                if let Ok(None) = self.repos.resource.get_space_details(school_id, &full_section_name).await {
                    let _ = self.repos.resource.create_space(school_id, "classroom", full_section_name.clone(), None).await;
                }

                let room_index = ((next_roll - 1) % section_size) + 1;
                final_data["rollNumber"] = json!(next_roll);
                final_data["section"] = json!(section);
                final_data["roomNumber"] = json!(room_index.to_string());
                final_data["sectionRoom"] = json!(full_section_name);
            }
        }

        // Auto-calculate Base Fees from Responsibilities if space changed or fee doesn't exist
        let old_space = old_student["sectionRoom"].as_str().unwrap_or("");
        let new_space = final_data["sectionRoom"].as_str().unwrap_or("");
        
        if (!new_space.is_empty() && new_space != old_space) || (final_data["totalFees"].is_null() && !new_space.is_empty()) {
            if let Ok(fee) = self.repos.responsibility.get_student_fee_sum_for_space(school_id, new_space).await {
                if fee > 0.0 {
                    final_data["totalFees"] = json!(fee);
                }
            }
        }

        // Perform the update
        self.repos
            .student
            .update_student(school_id, student_id, final_data.clone())
            .await?;

        // Audit History Logic
        let rev_no = self.repos.student.get_next_rev_no(school_id, student_id).await?;
        let delta = calculate_delta(&old_student, &final_data);
        
        // Universal Audit Log
        if !delta.as_object().map(|obj| obj.is_empty()).unwrap_or(true) {
            log_audit(&self.repos.audit, school_id, admin_id, "STUDENT", student_id, "UPDATE", delta.clone()).await;
            
            // Legacy Audit History Logic
            self.repos.student.add_history(school_id, student_id, rev_no, final_data.clone(), delta).await?;
        }

        if let Some(nc) = new_class {
            if nc != old_class && !old_class.is_empty() {
                self.resequence_roll_numbers(school_id, old_class).await?;
            }
        }

        // Sync Updated Data to Global
        let updated_student = self.repos.student.get_student(school_id, student_id).await?.unwrap_or(final_data);
        global_sync::sync(&self.repos.global_user, global_sync::build_sync_payload("student", school_id, student_id, &updated_student)).await;

        Ok(())
    }

    async fn delete_student(
        &self,
        school_id: &str,
        student_id: &str,
        admin_id: &str,
    ) -> AppResult<()> {
        let student = self
            .repos
            .student
            .get_student(school_id, student_id)
            .await?;
        if let Some(s) = student {
            let class_name = s["className"].as_str().unwrap_or("").to_string();
            self.repos
                .student
                .delete_student(school_id, student_id)
                .await?;

            // Audit Log
            log_audit(&self.repos.audit, school_id, admin_id, "STUDENT", student_id, "DELETE", s).await;

            if !class_name.is_empty() {
                self.resequence_roll_numbers(school_id, &class_name).await?;
            }

            // Remove from Global
            global_sync::delete(&self.repos.global_user, school_id, student_id, "student").await;
        }
        Ok(())
    }

    async fn resequence_roll_numbers(
        &self,
        school_id: &str,
        space_id: &str,
    ) -> AppResult<()> {
        Ok(self.repos.student.resequence_roll_numbers(school_id, space_id).await?)
    }

    async fn list_student_ids(&self, school_id: &str) -> AppResult<Vec<String>> {
        let students = self.repos.student.get_students(school_id).await?;
        Ok(students
            .into_iter()
            .filter_map(|s| s["studentId"].as_str().map(|id| id.to_string()))
            .collect())
    }

    async fn validate_student_data(&self, school_id: &str, data: Value) -> AppResult<()> {
        self.validation.validate_student_data(school_id, data).await
    }
}
