use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct PostgresAuxiliaryService {
    pub repos: Arc<Repositories>,
    pub ocr: Arc<dyn OCRService>,
    pub ai: Arc<dyn AiService>,
}

#[async_trait]
impl AwardService for PostgresAuxiliaryService {
    async fn create_award(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.repos.award.add_award(school_id, data.clone()).await.map_err(AppError::from)?;
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "AWARD",
            &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()),
            "CREATE",
            data
        ).await;
        Ok(res)
    }
    async fn list_awards(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> AppResult<Vec<Value>> {
        Ok(self.repos.award.get_awards(school_id, student_id).await.map_err(AppError::from)?)
    }

    async fn delete_award(
        &self,
        school_id: &str,
        admin_id: &str,
        award_id: i32,
    ) -> AppResult<()> {
        let award = self.repos.award.get_award(school_id, award_id).await?
            .ok_or_else(|| AppError::NotFound("Award not found".to_string()))?;

        self.repos.award.delete_award(school_id, award_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "AWARD",
            &award_id.to_string(),
            "DELETE",
            award
        ).await;

        Ok(())
    }
}

#[async_trait]
impl ComplainService for PostgresAuxiliaryService {
    async fn create_complain(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.repos.complain.add_complain(school_id, data.clone()).await?;
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "COMPLAIN",
            &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()),
            "CREATE",
            data
        ).await;
        Ok(res)
    }
    async fn list_complains(
        &self,
        school_id: &str,
        user_id: Option<&str>,
        user_role: Option<&str>,
    ) -> AppResult<Vec<Value>> {
        Ok(self.repos.complain.get_complains(school_id, user_id, user_role).await?)
    }

    async fn delete_complain(
        &self,
        school_id: &str,
        admin_id: &str,
        complain_id: i32,
    ) -> AppResult<()> {
        let complain = self.repos.complain.get_complain(school_id, complain_id).await?
            .ok_or_else(|| AppError::NotFound("Complain not found".to_string()))?;

        self.repos.complain.delete_complain(school_id, complain_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "COMPLAIN",
            &complain_id.to_string(),
            "DELETE",
            complain
        ).await;

        Ok(())
    }
}

#[async_trait]
impl ReminderService for PostgresAuxiliaryService {
    async fn create_reminder(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.repos.reminder.add_reminder(school_id, data.clone()).await?;
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "REMINDER",
            &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()),
            "CREATE",
            data
        ).await;
        Ok(res)
    }
    async fn list_reminders(
        &self,
        school_id: &str,
    ) -> AppResult<Vec<Value>> {
        Ok(self.repos.reminder.get_reminders(school_id).await?)
    }

    async fn delete_reminder(
        &self,
        school_id: &str,
        admin_id: &str,
        reminder_id: i32,
    ) -> AppResult<()> {
        let reminder = self.repos.reminder.get_reminder(school_id, reminder_id).await?
            .ok_or_else(|| AppError::NotFound("Reminder not found".to_string()))?;

        self.repos.reminder.delete_reminder(school_id, reminder_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "REMINDER",
            &reminder_id.to_string(),
            "DELETE",
            reminder
        ).await;

        Ok(())
    }
}

#[async_trait]
impl DocumentBoxService for PostgresAuxiliaryService {
    async fn upload_document(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        let res = self.repos.document_box.add_document(school_id, data.clone()).await?;
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "DOCUMENT",
            &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()),
            "UPLOAD",
            data.clone()
        ).await;
        
        // Phase 3: RAG Ingestion (Background)
        if let Some(file_url) = data["fileUrl"].as_str() {
            let ocr = self.ocr.clone();
            let ai = self.ai.clone();
            let repos = self.repos.clone();
            let school_id = school_id.to_string();
            let file_url = file_url.to_string();
            
            tokio::spawn(async move {
                // 1. Perform OCR (if it's an image)
                if file_url.ends_with(".png") || file_url.ends_with(".jpg") || file_url.ends_with(".jpeg") || file_url.contains("storage") {
                    if let Ok(ocr_res) = ocr.perform_ocr(&file_url).await {
                        let text = ocr_res["cleaned_text"].as_str().or(ocr_res["raw_text"].as_str()).unwrap_or("");
                        if !text.is_empty() {
                            // 2. Chunking
                            let chunks = text.split("\n\n").collect::<Vec<&str>>();
                            for (i, chunk) in chunks.iter().enumerate() {
                                if chunk.trim().is_empty() { continue; }
                                // 3. Embed
                                if let Ok(emb) = ai.generate_embedding(chunk).await {
                                    // 4. Save to document_embeddings
                                    if let Ok(mut conn) = repos.db_client.acquire_tenant_connection(&school_id).await {
                                        let _ = sqlx::query("INSERT INTO document_embeddings (school_id, content, embedding, metadata) VALUES ($1, $2, $3, $4)")
                                            .bind(&school_id)
                                            .bind(chunk)
                                            .bind(&emb)
                                            .bind(json!({"chunk": i, "file_url": file_url}))
                                            .execute(&mut *conn).await;
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }
        
        Ok(res)
    }
    async fn list_documents(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> AppResult<Vec<Value>> {
        Ok(self.repos.document_box.get_documents(school_id, student_id).await?)
    }

    async fn delete_document(
        &self,
        school_id: &str,
        admin_id: &str,
        document_id: i32,
    ) -> AppResult<()> {
        let document = self.repos.document_box.get_document(school_id, document_id).await?
            .ok_or_else(|| AppError::NotFound("Document not found".to_string()))?;

        self.repos.document_box.delete_document(school_id, document_id).await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "DOCUMENT",
            &document_id.to_string(),
            "DELETE",
            document
        ).await;

        Ok(())
    }
}

#[async_trait]
impl SchoolService for PostgresAuxiliaryService {
    async fn get_school_details(
        &self,
        school_id: &str,
        filter: Option<String>,
    ) -> AppResult<Value> {
        if let Some(f) = filter {
            if f == "session" {
                let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
                let row = sqlx::query("SELECT session_duration_hours FROM schools WHERE school_id = $1")
                    .bind(school_id)
                    .fetch_optional(&mut *conn)
                    .await?;
                
                return match row {
                    Some(r) => Ok(json!({ "sessionDurationHours": sqlx::Row::get::<i32, _>(&r, "session_duration_hours") })),
                    None => Err(AppError::NotFound("School not found".to_string())),
                };
            }
        }

        match self.repos.school.get_school(school_id).await? {
            Some(school) => Ok(school),
            None => Err(AppError::NotFound("School not found".to_string())),
        }
    }

    async fn update_school(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()> {
        // 1. Fetch old data to check classLevel increase
        let old_school = self.get_school_details(school_id, None).await?;
        let old_level = old_school["data"]["classLevel"].as_i64()
            .or_else(|| old_school["data"]["classLevel"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(0);
        
        let new_level = data["classLevel"].as_i64()
            .or_else(|| data["classLevel"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(old_level);

        // 2. Update database
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await.map_err(AppError::Database)?;
        
        let update_data = data.clone();
        sqlx::query(
            "UPDATE schools SET data = COALESCE(data, '{}'::jsonb) || $1::jsonb, updated_at = NOW() WHERE school_id = $2"
        )
        .bind(&update_data)
        .bind(school_id)
        .execute(&mut *conn)
        .await
        .map_err(AppError::Database)?;

        // if let Some(name) = data["schoolName"].as_str() {
        //      sqlx::query("UPDATE schools SET school_name = $1 WHERE school_id = $2")
        //         .bind(name)
        //         .bind(school_id)
        //         .execute(&mut *conn)
        //         .await
        //         .map_err(AppError::Database)?;
        // }

        if let Some(hours) = data["sessionDurationHours"].as_i64() {
             sqlx::query("UPDATE schools SET session_duration_hours = $1 WHERE school_id = $2")
                .bind(hours as i32)
                .bind(school_id)
                .execute(&mut *conn)
                .await
                .map_err(AppError::Database)?;
        }

        // 3. Trigger auto-generation if level increased
        if new_level > old_level {
            let _ = self.repos.audit.log_action(school_id, admin_id, "CLASS", "AUTO_GENERATE", "CREATE", json!({})).await;
        }

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "SCHOOL",
            "0",
            "UPDATE",
            data
        ).await;

        Ok(())
    }
}

#[async_trait]
impl ResponsibilityService for PostgresAuxiliaryService {
    async fn list_responsibilities(
        &self,
        school_id: &str,
        employee_type: Option<String>,
    ) -> AppResult<Vec<Value>> {
        Ok(self.repos
            .responsibility
            .get_responsibilities(school_id, employee_type)
            .await?)
    }

    async fn create_responsibility(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<Value> {
        // --- Validation ---
        let _name = data["name"].as_str().filter(|s| !s.trim().is_empty())
            .ok_or_else(|| AppError::from("Responsibility 'name' is required and cannot be empty"))?;
        
        let _ = data["spaceCategory"].as_str()
            .ok_or_else(|| AppError::from("'spaceCategory' is required"))?;
        
        let _ = data["employeeType"].as_str()
            .ok_or_else(|| AppError::from("'employeeType' is required"))?;

        let space_ids = data["spaceIds"].as_array()
            .ok_or_else(|| AppError::from("'spaceIds' array is required"))?;
        
        if space_ids.is_empty() {
             return Err(AppError::from("At least one 'spaceId' is required in 'spaceIds' array"));
        }

        // --- Space Verification ---
        for sid_val in space_ids {
            let sid = sid_val.as_str().ok_or_else(|| AppError::from("Invalid spaceId in array"))?;
            let space_exists = self.repos.resource.get_space_details(school_id, sid).await?;
            if space_exists.is_none() {
                return Err(AppError::from(format!("Space ID '{}' does not exist in infrastructure records", sid)));
            }
        }

        let res = self.repos.responsibility.add_responsibility(school_id, data.clone()).await?;
        
        if let Some(responsibility_id) = res["responsibilityId"].as_str() {
            // Also assign the spaceIds to the responsibility root if needed or to the employees
            // In the user request, they provided spaceIds at the root. 
            // If they also provide employees, the existing logic handles it.
            if let Some(employees) = data["employees"].as_array() {
                let mut assignments = Vec::new();
                for emp in employees {
                    if let Some(emp_id) = emp["employeeId"].as_str() {
                        let e_space_ids: Vec<String> = emp["spaceIds"]
                            .as_array()
                            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                            .unwrap_or_else(|| space_ids.iter().filter_map(|v| v.as_str().map(String::from)).collect()); // Default to root space_ids if not per-employee
                        assignments.push((emp_id.to_string(), e_space_ids));
                    }
                }
                
                if !assignments.is_empty() {
                    let _ = self.repos.responsibility.assign_employees_with_spaces(
                        school_id,
                        responsibility_id,
                        assignments,
                    ).await;
                }
            } else {
                // If no employees provided yet, we just created the definition. 
                // The spaceIds are stored in the 'data' blob anyway by default repository logic.
            }
        }

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "RESPONSIBILITY",
            res["responsibilityId"].as_str().unwrap_or("0"),
            "CREATE",
            data
        ).await;
        Ok(res)
    }


    async fn get_responsibility(&self, school_id: &str, responsibility_id: &str) -> AppResult<Option<Value>> {
        Ok(self.repos.responsibility.get_responsibility(school_id, responsibility_id).await?)
    }





    async fn get_responsibility_analytics(&self, school_id: &str, responsibility_id: &str) -> AppResult<Value> {
        let analytics = self.repos.responsibility.get_responsibility_analytics(school_id, responsibility_id).await?;
        Ok(analytics)
    }

    async fn list_student_responsibilities(&self, school_id: &str, student_id: &str) -> AppResult<Vec<Value>> {
        let responsibilities = self.repos.responsibility.get_student_responsibilities(school_id, student_id).await?;
        Ok(responsibilities)
    }

    async fn update_responsibility(&self, school_id: &str, responsibility_id: &str, admin_id: &str, data: Value) -> AppResult<()> {
        // 1. Fetch Old Data for Audit/Recovery
        let old_data = self.repos.responsibility.get_responsibility(school_id, responsibility_id).await?
            .ok_or_else(|| AppError::from("Responsibility not found"))?;

        // 2. Validation (Optional fields but if provided must be valid)
        if let Some(space_ids) = data["spaceIds"].as_array() {
            if space_ids.is_empty() {
                return Err(AppError::from("At least one 'spaceId' is required if 'spaceIds' array is provided"));
            }
            for sid_val in space_ids {
                let sid = sid_val.as_str().ok_or_else(|| AppError::from("Invalid spaceId in array"))?;
                let space_exists = self.repos.resource.get_space_details(school_id, sid).await?;
                if space_exists.is_none() {
                    return Err(AppError::from(format!("Space ID '{}' does not exist in infrastructure records", sid)));
                }
            }
        }

        // 3. Perform update
        self.repos.responsibility.update_responsibility(school_id, responsibility_id, data.clone()).await?;

        // 4. Log Update Action for Recovery (Old vs New)
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "RESPONSIBILITY_UPDATE",
            responsibility_id,
            "UPDATE",
            json!({
                "old": old_data,
                "new": data
            })
        ).await;

        Ok(())
    }
}


#[async_trait]
impl TaskService for PostgresAuxiliaryService {
    async fn add_task(&self, school_id: &str, data: Value) -> AppResult<Value> {
        Ok(self.repos.task.add_task(school_id, data).await?)
    }

    async fn list_tasks(
        &self,
        school_id: &str,
        start_date: Option<&str>,
        end_date: Option<&str>
    ) -> AppResult<Vec<Value>> {
        Ok(self.repos.task.get_tasks(school_id, start_date, end_date).await?)
    }

    async fn update_task_status(&self, school_id: &str, task_id: &str, status: &str) -> AppResult<()> {
        Ok(self.repos.task.update_task_status(school_id, task_id, status).await?)
    }
}
