use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::error::Error;
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
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.award.add_award(school_id, data).await
    }
    async fn list_awards(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.award.get_awards(school_id, student_id).await
    }
}

#[async_trait]
impl ComplainService for PostgresAuxiliaryService {
    async fn create_complain(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.complain.add_complain(school_id, data).await
    }
    async fn list_complains(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.complain.get_complains(school_id, student_id).await
    }
}

#[async_trait]
impl ReminderService for PostgresAuxiliaryService {
    async fn create_reminder(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos.reminder.add_reminder(school_id, data).await
    }
    async fn list_reminders(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.reminder.get_reminders(school_id).await
    }
}

#[async_trait]
impl DocumentBoxService for PostgresAuxiliaryService {
    async fn upload_document(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let res = self.repos.document_box.add_document(school_id, data.clone()).await?;
        
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
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.document_box.get_documents(school_id, student_id).await
    }
}

#[async_trait]
impl SchoolService for PostgresAuxiliaryService {
    async fn get_school_details(
        &self,
        school_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        match self.repos.school.get_school(school_id).await? {
            Some(school) => Ok(school),
            None => Err("School not found".into()),
        }
    }
}

#[async_trait]
impl ResponsibilityService for PostgresAuxiliaryService {
    async fn list_responsibilities(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos
            .responsibility
            .get_responsibilities(school_id)
            .await
    }

    async fn create_responsibility(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        self.repos
            .responsibility
            .add_responsibility(school_id, data)
            .await
    }

    async fn assign_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos
            .responsibility
            .assign_responsibility(school_id, employee_id, responsibility_id)
            .await
    }

    async fn remove_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos
            .responsibility
            .remove_responsibility(school_id, employee_id, responsibility_id)
            .await
    }

    async fn list_employee_responsibilities(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
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
    ) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        self.repos.task.get_tasks(school_id).await
    }
}
