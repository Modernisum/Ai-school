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
    ) -> Result<Value, AppError> {
        let res = self.repos.award.add_award(school_id, data.clone()).await?;
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
    ) -> Result<Vec<Value>, AppError> {
        Ok(self.repos.award.get_awards(school_id, student_id).await?)
    }

    async fn delete_award(
        &self,
        school_id: &str,
        admin_id: &str,
        award_id: i32,
    ) -> Result<(), AppError> {
        let award = self.repos.award.get_award(school_id, award_id).await?
            .ok_or("Award not found")?;

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
    ) -> Result<Value, AppError> {
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
        student_id: Option<&str>,
    ) -> Result<Vec<Value>, AppError> {
        Ok(self.repos.complain.get_complains(school_id, student_id).await?)
    }

    async fn delete_complain(
        &self,
        school_id: &str,
        admin_id: &str,
        complain_id: i32,
    ) -> Result<(), AppError> {
        let complain = self.repos.complain.get_complain(school_id, complain_id).await?
            .ok_or("Complain not found")?;

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
    ) -> Result<Value, AppError> {
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
    ) -> Result<Vec<Value>, AppError> {
        Ok(self.repos.reminder.get_reminders(school_id).await?)
    }

    async fn delete_reminder(
        &self,
        school_id: &str,
        admin_id: &str,
        reminder_id: i32,
    ) -> Result<(), AppError> {
        let reminder = self.repos.reminder.get_reminder(school_id, reminder_id).await?
            .ok_or("Reminder not found")?;

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
    ) -> Result<Value, AppError> {
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
                // Note: Simplified. Production would check file extension or mime type.
                if file_url.ends_with(".png") || file_url.ends_with(".jpg") || file_url.ends_with(".jpeg") || file_url.contains("storage") {
                    if let Ok(ocr_res) = ocr.perform_ocr(&file_url).await {
                        let text = ocr_res["cleaned_text"].as_str().or(ocr_res["raw_text"].as_str()).unwrap_or("");
                        if !text.is_empty() {
                            // 2. Chunking (Simplified: by character count/paragraphs)
                            let chunks = text.split("\n\n").collect::<Vec<&str>>();
                            for (i, chunk) in chunks.iter().enumerate() {
                                if chunk.trim().is_empty() { continue; }
                                // 3. Embed
                                if let Ok(emb) = ai.generate_embedding(chunk).await {
                                    // 4. Save to document_embeddings
                                    let mut conn = repos.db_client.acquire_tenant_connection(&school_id).await.expect("DB failure");
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
            });
        }
        
        Ok(res)
    }
    async fn list_documents(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<Vec<Value>, AppError> {
        Ok(self.repos.document_box.get_documents(school_id, student_id).await?)
    }

    async fn delete_document(
        &self,
        school_id: &str,
        admin_id: &str,
        document_id: i32,
    ) -> Result<(), AppError> {
        let document = self.repos.document_box.get_document(school_id, document_id).await?
            .ok_or("Document not found")?;

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
    ) -> Result<Value, AppError> {
        match self.repos.school.get_school(school_id).await? {
            Some(school) => Ok(school),
            None => Err(Box::<dyn std::error::Error + Send + Sync>::from("School not found")),
        }
    }

    async fn update_school(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> Result<(), AppError> {
        // 1. Fetch old data to check classLevel increase
        let old_school = self.get_school_details(school_id).await?;
        let old_level = old_school["data"]["classLevel"].as_i64()
            .or_else(|| old_school["data"]["classLevel"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(0);
        
        let new_level = data["classLevel"].as_i64()
            .or_else(|| data["classLevel"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(old_level);

        // 2. Update database
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        
        let update_data = data.clone();
        sqlx::query(
            "UPDATE schools SET data = COALESCE(data, '{}'::jsonb) || $1::jsonb, updated_at = NOW() WHERE school_id = $2"
        )
        .bind(&update_data)
        .bind(school_id)
        .execute(&mut *conn)
        .await?;

        if let Some(name) = data["schoolName"].as_str() {
             sqlx::query("UPDATE schools SET school_name = $1 WHERE school_id = $2")
                .bind(name)
                .bind(school_id)
                .execute(&mut *conn)
                .await?;
        }

        // 3. Trigger auto-generation if level increased
        if new_level > old_level {
            // We need an AcademicService instance. 
            // PostgresAcademicService is just a wrapper around repos.
            let academic_svc = crate::services::academic_service::PostgresAcademicService {
                repos: self.repos.clone(),
            };
            academic_svc.auto_generate_classes(school_id, admin_id, (old_level + 1) as i32, new_level as i32).await?;
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
    ) -> Result<Vec<Value>, AppError> {
        Ok(self.repos
            .responsibility
            .get_responsibilities(school_id)
            .await?)
    }

    async fn create_responsibility(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Value,
    ) -> Result<Value, AppError> {
        let res = self.repos.responsibility.add_responsibility(school_id, data.clone()).await?;
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "RESPONSIBILITY",
            &res["id"].as_i64().map(|id| id.to_string()).unwrap_or_else(|| "0".to_string()),
            "CREATE",
            data
        ).await;
        Ok(res)
    }

    async fn assign_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
        admin_id: &str,
    ) -> Result<(), AppError> {
        self.repos
            .responsibility
            .assign_responsibility(school_id, employee_id, responsibility_id)
            .await?;
        
        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "RESPONSIBILITY_ASSIGN",
            "0",
            "ASSIGN",
            json!({"employeeId": employee_id, "responsibilityId": responsibility_id})
        ).await;
        Ok(())
    }

    async fn remove_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
        admin_id: &str,
    ) -> Result<(), AppError> {
        self.repos
            .responsibility
            .remove_responsibility(school_id, employee_id, responsibility_id)
            .await?;

        let _ = self.repos.audit.log_action(
            school_id,
            admin_id,
            "RESPONSIBILITY_REMOVE",
            "0",
            "REMOVE",
            json!({"employeeId": employee_id, "responsibilityId": responsibility_id})
        ).await;
        Ok(())
    }

    async fn list_employee_responsibilities(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<Value, AppError> {
        let responsibilities = self
            .repos
            .responsibility
            .get_employee_responsibilities(school_id, employee_id)
            .await?;

        // Calculate total per day price
        let total_per_day_price: f64 = responsibilities
            .iter()
            .map(|r| r["perDayPrice"].as_f64().unwrap_or(0.0))
            .sum();

        // Fetch employee base salary
        let employee = self
            .repos
            .employee
            .get_employee(school_id, employee_id)
            .await?;
        let base_salary = employee
            .as_ref()
            .and_then(|e| e["baseSalary"].as_str())
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0);

        Ok(json!({
            "employee": {
                "employeeId": employee_id,
                "responsibilities": responsibilities,
                "totalPerDayPrice": total_per_day_price,
                "baseSalary": base_salary
            }
        }))
    }
}

#[async_trait]
impl TaskService for PostgresAuxiliaryService {
    async fn list_tasks(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError> {
        Ok(self.repos.task.get_tasks(school_id).await?)
    }
}
