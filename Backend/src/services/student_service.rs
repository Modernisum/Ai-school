use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

// Pagination struct
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct PaginationParams {
    pub page: u32,
    pub limit: u32,
}

impl Default for PaginationParams {
    fn default() -> Self {
        Self { page: 1, limit: 50 }
    }
}

pub struct PostgresStudentService {
    pub repos: Arc<Repositories>,
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
        self.validate_student_data(school_id, data.clone()).await?;

        // Validate required fields
        let class_name = data["className"].as_str().ok_or_else(|| AppError::Validation("Missing className".to_string()))?;

        // 1. Get next roll number
        let roll_number = self
            .repos
            .student
            .get_next_roll_number(school_id, class_name)
            .await?;

        // 2. Assign section
        let class_details = self.repos.academic.get_class_by_name(school_id, class_name).await?;
        let section_size = class_details
            .as_ref()
            .and_then(|c| c["sectionSize"].as_i64())
            .unwrap_or(60) as i32;
        
        let section = self.get_section_for_roll(roll_number, section_size);

        // 3. Generate Student ID
        let student_id = self.repos.student.generate_student_id(school_id).await?;

        let mut student_data = data.clone();
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
        self.repos.audit.log_action(
            school_id,
            admin_id,
            "STUDENT",
            &student_id,
            "CREATE",
            result.clone()
        ).await.ok(); // ok() because logging failure shouldn't crash the main action

        // Sync to Global User Table
        let sync_data = json!({
            "phone": student_data["contact"],
            "email": student_data["email"],
            "alternativePhone": student_data["alternativeContact"],
            "aadhaarNumber": student_data["aadhaarNumber"],
            "schoolId": school_id,
            "userId": student_id,
            "userType": "student",
            "name": student_data["name"],
            "className": student_data["className"],
            "imageUrl": student_data["imageUrl"]
        });
        self.repos.global_user.sync_user(sync_data).await.ok();

        Ok(result)
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

            // Security checks for bulk import (Optional: can be slow, but recommended)
            if let Err(e) = self.validate_student_data(school_id, student_data.clone()).await {
                failed += 1;
                errors.push(json!({ "row": row_number, "name": name, "error": e.to_string() }));
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

            let class_details = self.repos.academic.get_class_by_name(school_id, &class_name).await?;
            let section_size = class_details
                .as_ref()
                .and_then(|c| c["sectionSize"].as_i64())
                .unwrap_or(60) as i32;

            let section = self.get_section_for_roll(roll_number, section_size);

            let student_id = match self.repos.student.generate_student_id(school_id).await {
                Ok(id) => id,
                Err(e) => {
                    failed += 1;
                    errors.push(json!({ "row": row_number, "name": name, "error": format!("Failed to generate student ID: {}", e) }));
                    continue;
                }
            };

            student_data["studentId"] = json!(student_id);
            student_data["rollNumber"] = json!(roll_number);
            student_data["section"] = json!(section);
            student_data["status"] = json!("active");

            match self
                .repos
                .student
                .add_student(school_id, student_data.clone())
                .await
            {
                Ok(_) => {
                    successful += 1;
                    // Log each creation (optional, could be noisy but accurate)
                    let student_id_str = student_data["studentId"].as_str().unwrap_or("unknown").to_string();
                    self.repos.audit.log_action(
                        school_id,
                        admin_id,
                        "STUDENT",
                        &student_id_str,
                        "CREATE_BULK",
                        student_data.clone()
                    ).await.ok();

                    // Sync to Global
                    let sync_data = json!({
                        "phone": student_data["contact"],
                        "email": student_data["email"],
                        "alternativePhone": student_data["alternativeContact"],
                        "aadhaarNumber": student_data["aadhaarNumber"],
                        "schoolId": school_id,
                        "userId": student_id_str,
                        "userType": "student",
                        "name": student_data["name"],
                        "className": student_data["className"],
                        "imageUrl": student_data["imageUrl"]
                    });
                    self.repos.global_user.sync_user(sync_data).await.ok();
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

    async fn list_students(
        &self,
        school_id: &str,
    ) -> AppResult<Vec<Value>> {
        self.repos.student.get_students(school_id).await.map_err(AppError::from)
    }

    async fn list_students_by_class(
        &self,
        school_id: &str,
        class_name: &str,
        section: Option<&str>,
    ) -> AppResult<Vec<Value>> {
        self.repos
            .student
            .get_students_by_class(school_id, class_name, section)
            .await
            .map_err(AppError::from)
    }

    async fn get_student(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> AppResult<Option<Value>> {
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
                
                let class_details = self.repos.academic.get_class_by_name(school_id, nc).await?;
                let section_size = class_details
                    .as_ref()
                    .and_then(|c| c["sectionSize"].as_i64())
                    .unwrap_or(60) as i32;

                final_data["rollNumber"] = json!(next_roll);
                final_data["section"] = json!(self.get_section_for_roll(next_roll, section_size));
            }
        }

        // Perform the update
        self.repos
            .student
            .update_student(school_id, student_id, final_data.clone())
            .await?;

        // Audit History Logic
        let rev_no = self.repos.student.get_next_rev_no(school_id, student_id).await?;
        let delta = self.calculate_delta(&old_student, &final_data);
        
        // Universal Audit Log
        if !delta.as_object().map(|obj| obj.is_empty()).unwrap_or(true) {
            self.repos.audit.log_action(
                school_id,
                admin_id,
                "STUDENT",
                student_id,
                "UPDATE",
                delta.clone()
            ).await.ok();
            
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
        let sync_data = json!({
            "phone": updated_student["contact"],
            "email": updated_student["email"],
            "alternativePhone": updated_student["alternativeContact"],
            "aadhaarNumber": updated_student["aadhaarNumber"],
            "schoolId": school_id,
            "userId": student_id,
            "userType": "student",
            "name": updated_student["name"],
            "className": updated_student["className"],
            "imageUrl": updated_student["imageUrl"]
        });
        self.repos.global_user.sync_user(sync_data).await.ok();

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
            self.repos.audit.log_action(
                school_id,
                admin_id,
                "STUDENT",
                student_id,
                "DELETE",
                s
            ).await.ok();

            if !class_name.is_empty() {
                self.resequence_roll_numbers(school_id, &class_name).await?;
            }

            // Remove from Global
            self.repos.global_user.delete_user(school_id, student_id, "student").await.ok();
        }
        Ok(())
    }

    async fn resequence_roll_numbers(
        &self,
        school_id: &str,
        class_name: &str,
    ) -> AppResult<()> {
        let students = self.repos.student.get_students(school_id).await?;
        let mut class_students: Vec<Value> = students
            .into_iter()
            .filter(|s| s["className"].as_str() == Some(class_name))
            .collect();

        class_students.sort_by_key(|s| s["rollNumber"].as_i64().unwrap_or(0));

        for (i, student) in class_students.into_iter().enumerate() {
            let new_roll = (i + 1) as i32;
            let class_details = self.repos.academic.get_class_by_name(school_id, class_name).await?;
            let section_size = class_details
                .as_ref()
                .and_then(|c| c["sectionSize"].as_i64())
                .unwrap_or(60) as i32;

            let new_section = self.get_section_for_roll(new_roll, section_size);

            let sid = student["studentId"].as_str().unwrap_or("");
            let update_data = json!({
                "rollNumber": new_roll,
                "section": new_section
            });
            self.repos
                .student
                .update_student(school_id, sid, update_data)
                .await?;
        }
        Ok(())
    }

    async fn list_student_ids(
        &self,
        school_id: &str,
    ) -> AppResult<Vec<String>> {
        let students = self.repos.student.get_students(school_id).await?;
        Ok(students
            .into_iter()
            .filter_map(|s| s["studentId"].as_str().map(|id| id.to_string()))
            .collect())
    }

    async fn validate_student_data(&self, school_id: &str, data: Value) -> AppResult<()> {
        let exclude_sid = data["studentId"].as_str();

        // 1. Aadhaar Uniqueness (Cross Student & Employee)
        if let Some(aadhaar) = data["aadhaarNumber"].as_str() {
            if !aadhaar.trim().is_empty() {
                if self.repos.student.check_aadhaar_exists(school_id, aadhaar, exclude_sid, None).await? {
                    return Err(AppError::Validation("Aadhaar Number already exists for another student or staff member in this or another school".to_string()));
                }
            }
        }

        // 2. Phone Limit (Max 3 students)
        if let Some(phone) = data["contact"].as_str() {
            if !phone.trim().is_empty() {
                let count = self.repos.student.count_phone_usage(school_id, phone, exclude_sid, None).await?;
                if count >= 3 {
                    return Err(AppError::Validation("This Contact Number is already used by 3 or more student accounts".to_string()));
                }
            }
        }

        // 3. Email Limit (Max 3 students)
        if let Some(email) = data["email"].as_str() {
            if !email.trim().is_empty() {
                let count = self.repos.student.count_email_usage(school_id, email, exclude_sid, None).await?;
                if count >= 3 {
                    return Err(AppError::Validation("This Email Address is already used by 3 or more student accounts".to_string()));
                }
            }
        }

        Ok(())
    }
}

impl PostgresStudentService {
    fn calculate_delta(&self, old: &Value, new: &Value) -> Value {
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

    fn get_section_for_roll(&self, roll: i32, section_size: i32) -> String {
        if roll <= 0 {
            return "A".to_string();
        }
        let size = if section_size <= 0 { 60 } else { section_size };
        let index = ((roll - 1) / size) as usize;
        let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        alphabet.chars().nth(index).unwrap_or('Z').to_string()
    }
}
