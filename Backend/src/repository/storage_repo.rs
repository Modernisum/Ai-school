use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::{PgPool, Row};

use crate::repository::traits::{AppError, JsonList, StorageRepository};

pub struct PostgresStorageRepository {
    pool: PgPool,
}

impl PostgresStorageRepository {
    pub fn new(pool: PgPool) -> Self {
        PostgresStorageRepository { pool }
    }
}

#[async_trait]
impl StorageRepository for PostgresStorageRepository {
    async fn save_file_metadata(&self, data: Value) -> Result<Value, AppError> {
        let file_hash = data["file_hash"].as_str().ok_or("Missing file_hash")?;
        let school_id = data["school_id"].as_str().unwrap_or("public");
        let user_id = data["user_id"].as_str().unwrap_or("system");
        let user_type = data["user_type"].as_str().unwrap_or("system");
        let file_name = data["file_name"].as_str().unwrap_or("unnamed_file");
        let content_type = data["content_type"].as_str().unwrap_or("application/octet-stream");
        let file_size = data["file_size"].as_i64().unwrap_or(0);
        let file_path = data["file_path"].as_str().ok_or("Missing file_path")?;
        let public_url = data["public_url"].as_str().ok_or("Missing public_url")?;

        let row = sqlx::query(
            r#"
            INSERT INTO app_files 
            (file_hash, school_id, user_id, user_type, file_name, content_type, file_size, file_path, public_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, file_hash, school_id, user_id, user_type, file_name, content_type, file_size, file_path, public_url, created_at
            "#
        )
        .bind(file_hash)
        .bind(school_id)
        .bind(user_id)
        .bind(user_type)
        .bind(file_name)
        .bind(content_type)
        .bind(file_size)
        .bind(file_path)
        .bind(public_url)
        .fetch_one(&self.pool)
        .await?;

        let id: i32 = row.get("id");
        
        Ok(json!({
            "id": id,
            "file_hash": row.get::<String, _>("file_hash"),
            "school_id": row.get::<String, _>("school_id"),
            "user_id": row.get::<String, _>("user_id"),
            "user_type": row.get::<String, _>("user_type"),
            "file_name": row.get::<String, _>("file_name"),
            "content_type": row.get::<String, _>("content_type"),
            "file_size": row.get::<i64, _>("file_size"),
            "file_path": row.get::<String, _>("file_path"),
            "public_url": row.get::<String, _>("public_url"),
            "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339()
        }))
    }

    async fn get_file_metadata(&self, id: i32) -> Result<Option<Value>, AppError> {
        let row_opt = sqlx::query(
            "SELECT id, file_hash, school_id, public_url, file_path, content_type, file_size FROM app_files WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        match row_opt {
            Some(row) => Ok(Some(json!({
                "id": row.get::<i32, _>("id"),
                "file_hash": row.get::<String, _>("file_hash"),
                "school_id": row.get::<String, _>("school_id"),
                "public_url": row.get::<String, _>("public_url"),
                "file_path": row.get::<String, _>("file_path"),
                "content_type": row.get::<String, _>("content_type"),
                "file_size": row.get::<i64, _>("file_size"),
            }))),
            None => Ok(None)
        }
    }

    async fn get_file_by_hash(&self, file_hash: &str) -> Result<Option<Value>, AppError> {
        let row_opt = sqlx::query(
            "SELECT id, public_url, file_path, content_type, file_size FROM app_files WHERE file_hash = $1"
        )
        .bind(file_hash)
        .fetch_optional(&self.pool)
        .await?;

        match row_opt {
            Some(row) => Ok(Some(json!({
                "id": row.get::<i32, _>("id"),
                "public_url": row.get::<String, _>("public_url"),
                "file_path": row.get::<String, _>("file_path"),
                "content_type": row.get::<String, _>("content_type"),
                "file_size": row.get::<i64, _>("file_size"),
            }))),
            None => Ok(None)
        }
    }

    async fn delete_file_metadata(&self, id: i32) -> Result<(), AppError> {
        sqlx::query("DELETE FROM app_files WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn delete_file_by_url(&self, url: &str, school_id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM app_files WHERE public_url = $1 AND school_id = $2")
            .bind(url)
            .bind(school_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }


    async fn list_files(&self, school_id: Option<&str>, user_id: Option<&str>) -> Result<JsonList, AppError> {
        let mut query_str = String::from("SELECT id, public_url, file_name, file_size, content_type, created_at FROM app_files WHERE 1=1");
        
        if school_id.is_some() {
            query_str.push_str(" AND school_id = $1");
        }
        if user_id.is_some() {
            query_str.push_str(if school_id.is_some() { " AND user_id = $2" } else { " AND user_id = $1" });
        }
        
        query_str.push_str(" ORDER BY created_at DESC LIMIT 100");

        let mut query = sqlx::query(&query_str);
        
        if let Some(sid) = school_id {
            query = query.bind(sid);
        }
        if let Some(uid) = user_id {
            query = query.bind(uid);
        }

        let rows = query.fetch_all(&self.pool).await?;

        let mut files = Vec::new();
        for row in rows {
            files.push(json!({
                "id": row.get::<i32, _>("id"),
                "public_url": row.get::<String, _>("public_url"),
                "file_name": row.get::<String, _>("file_name"),
                "file_size": row.get::<i64, _>("file_size"),
                "content_type": row.get::<String, _>("content_type"),
                "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339()
            }));
        }

        Ok(files)
    }

    async fn get_orphaned_files(&self, older_than_hours: i32) -> Result<JsonList, AppError> {
        let rows = sqlx::query(
            "SELECT id, file_path, public_url FROM app_files 
             WHERE is_permanent = FALSE 
             AND created_at < NOW() - ($1 * INTERVAL '1 hour')"
        )
        .bind(older_than_hours)
        .fetch_all(&self.pool)
        .await?;

        let mut files = Vec::new();
        for row in rows {
            files.push(json!({
                "id": row.get::<i32, _>("id"),
                "file_path": row.get::<String, _>("file_path"),
                "public_url": row.get::<String, _>("public_url"),
            }));
        }
        Ok(files)
    }

    async fn get_orphaned_files_minutes(&self, older_than_minutes: i32) -> Result<JsonList, AppError> {
        let rows = sqlx::query(
            "SELECT id, file_path, public_url FROM app_files 
             WHERE is_permanent = FALSE 
             AND created_at < NOW() - ($1 * INTERVAL '1 minute')"
        )
        .bind(older_than_minutes)
        .fetch_all(&self.pool)
        .await?;

        let mut files = Vec::new();
        for row in rows {
            files.push(json!({
                "id": row.get::<i32, _>("id"),
                "file_path": row.get::<String, _>("file_path"),
                "public_url": row.get::<String, _>("public_url"),
            }));
        }
        Ok(files)
    }

    async fn check_storage_status(&self, school_id: &str) -> Result<(), AppError> {
        sqlx::query("SELECT COUNT(*) FROM app_files WHERE school_id = $1")
            .bind(school_id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(())
    }
}
