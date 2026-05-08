use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::sync::Arc;

pub struct PostgresDocumentBoxService {
    pub repos: Arc<Repositories>,
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
