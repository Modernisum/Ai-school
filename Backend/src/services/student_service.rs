use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::error::Error;
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
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        // Security checks (Aadhaar, Phone, Email)
        self.validate_student_data(school_id, data.clone()).await?;

        // Validate required fields
        let class_name = data["className"].as_str().ok_or("Missing className")?;

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
            .add_student(school_id, student_data)
            .await?;

        tracing::info!(
            "Student Created: {} (Roll: {}, Class: {})",
            student_id, roll_number, class_name
        );

        Ok(result)
    }

    async fn bulk_create_students(
        &self,
        school_id: &str,
        data: Vec<Value>,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
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
                .add_student(school_id, student_data)
                .await
            {
                Ok(_) => successful += 1,
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
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.student.get_students(school_id).await
    }

    async fn get_student(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Option<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.student.get_student(school_id, student_id).await
    }

    async fn update_student(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let old_student = self
            .repos
            .student
            .get_student(school_id, student_id)
            .await?
            .ok_or("Student not found")?;

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

        self.repos
            .student
            .update_student(school_id, student_id, final_data)
            .await?;

        if let Some(nc) = new_class {
            if nc != old_class && !old_class.is_empty() {
                self.resequence_roll_numbers(school_id, old_class).await?;
            }
        }

        Ok(())
    }

    async fn delete_student(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let student = self
            .repos
            .student
            .get_student(school_id, student_id)
            .await?;
        if let Some(s) = student {
            let class_name = s["className"].as_str().unwrap_or("");
            self.repos
                .student
                .delete_student(school_id, student_id)
                .await?;

            if !class_name.is_empty() {
                self.resequence_roll_numbers(school_id, class_name).await?;
            }
        }
        Ok(())
    }

    async fn resequence_roll_numbers(
        &self,
        school_id: &str,
        class_name: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
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
    ) -> Result<Vec<String>, Box<dyn Error + Send + Sync>> {
        let students = self.repos.student.get_students(school_id).await?;
        Ok(students
            .into_iter()
            .filter_map(|s| s["studentId"].as_str().map(|id| id.to_string()))
            .collect())
    }

    async fn validate_student_data(&self, school_id: &str, data: Value) -> Result<(), AppError> {
        // 1. Aadhaar Uniqueness (Cross Student & Employee)
        if let Some(aadhaar) = data["aadhaarNumber"].as_str() {
            if !aadhaar.trim().is_empty() {
                if self.repos.student.check_aadhaar_exists(school_id, aadhaar).await? {
                    return Err("Aadhaar Number already exists for another student or staff member".into());
                }
            }
        }

        // 2. Phone Limit (Max 3 students)
        if let Some(phone) = data["contact"].as_str() {
            if !phone.trim().is_empty() {
                let count = self.repos.student.count_phone_usage(school_id, phone).await?;
                if count >= 3 {
                    return Err("This Contact Number is already used by 3 or more student accounts".into());
                }
            }
        }

        // 3. Email Limit (Max 3 students)
        if let Some(email) = data["email"].as_str() {
            if !email.trim().is_empty() {
                let count = self.repos.student.count_email_usage(school_id, email).await?;
                if count >= 3 {
                    return Err("This Email Address is already used by 3 or more student accounts".into());
                }
            }
        }

        Ok(())
    }
}

impl PostgresStudentService {
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
