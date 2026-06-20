use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::{Acquire, Row};
use std::sync::Arc;

pub struct PostgresDocumentBoxRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl DocumentBoxRepository for PostgresDocumentBoxRepository {
    async fn add_document(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let res = sqlx::query("INSERT INTO document_boxes (school_id, user_id, doc_type, file_url) VALUES ($1, $2, $3, $4) RETURNING id")
            .bind(school_id)
            .bind(data["studentId"].as_str().or(data["userId"].as_str()))
            .bind(data["title"].as_str().or(data["docType"].as_str()))
            .bind(data["fileUrl"].as_str().or(data["file_url"].as_str()))
            .fetch_one(&mut *conn).await?;
        let mut ret = data.clone();
        ret["id"] = json!(res.get::<i32, _>("id"));
        Ok(ret)
    }

    async fn get_documents(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = if let Some(sid) = student_id {
            sqlx::query("SELECT id, doc_type as title, file_url FROM document_boxes WHERE school_id = $1 AND user_id = $2")
                .bind(school_id).bind(sid).fetch_all(&mut *conn).await?
        } else {
            sqlx::query("SELECT id, doc_type as title, file_url FROM document_boxes WHERE school_id = $1")
                .bind(school_id)
                .fetch_all(&mut *conn)
                .await?
        };
        Ok(rows.into_iter().map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title"), "fileUrl": r.get::<String, _>("file_url")})).collect())
    }

    async fn get_document(
        &self,
        school_id: &str,
        document_id: i32,
    ) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT id, doc_type as title, file_url FROM document_boxes WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(document_id)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(row.map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title")})))
    }

    async fn delete_document(&self, school_id: &str, document_id: i32) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM document_boxes WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(document_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }
}

