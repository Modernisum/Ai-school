use crate::repository::traits::*;
use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::error::Error;
use std::sync::Arc;

// Pagination struct
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
        // Validate required fields
        let class_name = data["className"].as_str().ok_or("Missing className")?;
        
        // Name is explicitly optional because the Admin frontend creates a "shell" 
        // student immediately after class selection to generate an ID ahead of time.
        // It patches the name later via update_student.
        let _name = data["name"].as_str().unwrap_or("");

        // 1. Get next roll number
        let roll_number = self
            .repos
            .student
            .get_next_roll_number(school_id, class_name)
            .await?;

        // 2. Assign section (Parity with Node.js logic)
        let section = if roll_number <= 60 {
            "A"
        } else if roll_number <= 120 {
            "B"
        } else {
            "C"
        };

        // 3. Generate Student ID (Parity Sequential S+6 digits)
        let student_id = self.repos.student.generate_student_id().await?;

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

        // 4. Invalidate cache (student list changed)
        // Cache removed since generic Redis methods exist in Repositories
        
        tracing::info!("Cache invalidated: students:list:{} (new student created)", school_id);

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
            // Assume frontend sends "rowNumber" but fallback to index + 2 (Excel header offset)
            let row_number = student_data["rowNumber"].as_u64().unwrap_or((index + 2) as u64);

            // Validate required fields
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
            
            // Generate sequence IDs
            let roll_number = match self.repos.student.get_next_roll_number(school_id, &class_name).await {
                Ok(r) => r,
                Err(e) => {
                    failed += 1;
                    errors.push(json!({ "row": row_number, "name": name, "error": format!("Failed to generate roll number: {}", e) }));
                    continue;
                }
            };

            let section = if roll_number <= 60 { "A" } else if roll_number <= 120 { "B" } else { "C" };

            let student_id = match self.repos.student.generate_student_id().await {
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

            // Attempt Database Insert
            match self.repos.student.add_student(school_id, student_data).await {
                Ok(_) => successful += 1,
                Err(e) => {
                    failed += 1;
                    errors.push(json!({ "row": row_number, "name": name, "error": format!("Database Error: {}", e) }));
                }
            }
        }

        tracing::info!("Bulk student import for school {}: {} successful, {} failed", school_id, successful, failed);

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
        // Cache key for this school's students list
        let cache_key = format!("students:list:{}", school_id);
        
        tracing::debug!("Cache MISS for {}", cache_key);
        
        // Cache miss - fetch from database
        let students = self.repos.student.get_students(school_id).await?;
        
        Ok(students)
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

        // 1. If className changes, handle roll number and resequencing
        let mut final_data = data.clone();
        if let Some(nc) = new_class {
            if nc != old_class {
                // Get next roll number in NEW class
                let next_roll = self
                    .repos
                    .student
                    .get_next_roll_number(school_id, nc)
                    .await?;
                final_data["rollNumber"] = json!(next_roll);
                final_data["section"] = json!(self.get_section_for_roll(next_roll));
            }
        }

        self.repos
            .student
            .update_student(school_id, student_id, final_data)
            .await?;

        // 2. Resequence OLD class if student moved out
        if let Some(nc) = new_class {
            if nc != old_class && !old_class.is_empty() {
                self.resequence_roll_numbers(school_id, old_class).await?;
            }
        }

        // 3. Invalidate cache
        // Cache removed since generic Redis methods aren't in Repositories
        tracing::info!("Cache invalidated: students:list:{} (student updated)", school_id);

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

            // Logic Parity: Resequence roll numbers after deletion
            if !class_name.is_empty() {
                self.resequence_roll_numbers(school_id, class_name).await?;
            }
        }
        
        // Invalidate cache
        // Cache removed since generic Redis methods aren't in Repositories
        tracing::info!("Cache invalidated: students:list:{} (student deleted)", school_id);
        
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

        // Sort by existing roll number for stable resequence
        class_students.sort_by_key(|s| s["rollNumber"].as_i64().unwrap_or(0));

        for (i, student) in class_students.into_iter().enumerate() {
            let new_roll = (i + 1) as i32;
            let new_section = self.get_section_for_roll(new_roll);

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
        let ids = students
            .into_iter()
            .filter_map(|s| s["studentId"].as_str().map(|id| id.to_string()))
            .collect();
        Ok(ids)
    }
}

impl PostgresStudentService {
    fn get_section_for_roll(&self, roll: i32) -> String {
        if roll <= 0 {
            return "A".to_string();
        }
        let index = ((roll - 1) / 60) as usize;
        let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        alphabet.chars().nth(index).unwrap_or('Z').to_string()
    }
}
