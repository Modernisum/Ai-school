use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct PostgresDocumentBoxService {
    pub repos: Arc<Repositories>,
    pub ocr: Arc<dyn OCRService>,
    pub ai: Arc<dyn AiService>,
}

#[async_trait]
impl DocumentBoxService for PostgresDocumentBoxService {
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
