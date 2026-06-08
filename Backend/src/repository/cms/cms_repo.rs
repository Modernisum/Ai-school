use crate::db::DbClient;
use crate::repository::traits::{AppError, CmsRepository};
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;
use uuid::Uuid;

pub struct PostgresCmsRepository {
    pub client: Arc<DbClient>,
}

impl PostgresCmsRepository {
    pub fn new(client: Arc<DbClient>) -> Self {
        Self { client }
    }
}

fn row_to_blog_post(r: &sqlx::postgres::PgRow) -> serde_json::Value {
    json!({
        "id": r.try_get::<Uuid, _>("id").map(|v| v.to_string()).unwrap_or_default(),
        "slug": r.try_get::<String, _>("slug").unwrap_or_default(),
        "title": r.try_get::<String, _>("title").unwrap_or_default(),
        "excerpt": r.try_get::<Option<String>, _>("excerpt").unwrap_or(None),
        "content": r.try_get::<String, _>("content").unwrap_or_default(),
        "cover_image_url": r.try_get::<Option<String>, _>("cover_image_url").unwrap_or(None),
        "author_name": r.try_get::<String, _>("author_name").unwrap_or_default(),
        "category": r.try_get::<Option<String>, _>("category").unwrap_or(None),
        "tags": r.try_get::<Option<Vec<String>>, _>("tags").unwrap_or(None).unwrap_or_default(),
        "is_published": r.try_get::<bool, _>("is_published").unwrap_or(false),
        "published_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("published_at").unwrap_or(None).map(|d| d.to_rfc3339()),
        "created_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").unwrap_or(None).map(|d| d.to_rfc3339()),
        "updated_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at").unwrap_or(None).map(|d| d.to_rfc3339()),
    })
}

#[async_trait]
impl CmsRepository for PostgresCmsRepository {
    async fn count_blog_posts(&self, published_only: bool) -> Result<i64, AppError> {
        let count_sql = if published_only {
            "SELECT COUNT(*) as count FROM blog_posts WHERE is_published = true"
        } else {
            "SELECT COUNT(*) as count FROM blog_posts"
        };
        let count: i64 = sqlx::query_scalar(count_sql)
            .fetch_one(&self.client.pool)
            .await
            .unwrap_or(0);
        Ok(count)
    }

    async fn list_blog_posts(
        &self,
        published_only: bool,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Value>, AppError> {
        let list_sql = if published_only {
            "SELECT id, slug, title, excerpt, content, cover_image_url, author_name, category, \
             tags, is_published, published_at, created_at, updated_at \
             FROM blog_posts WHERE is_published = true \
             ORDER BY published_at DESC LIMIT $1 OFFSET $2"
        } else {
            "SELECT id, slug, title, excerpt, content, cover_image_url, author_name, category, \
             tags, is_published, published_at, created_at, updated_at \
             FROM blog_posts ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        };

        let rows = sqlx::query(list_sql)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.client.pool)
            .await?;

        let posts: Vec<Value> = rows.iter().map(|r| row_to_blog_post(r)).collect();
        Ok(posts)
    }

    async fn get_blog_post(&self, slug: &str) -> Result<Option<Value>, AppError> {
        let row = sqlx::query(
            "SELECT id, slug, title, excerpt, content, cover_image_url, author_name, category, \
             tags, is_published, published_at, created_at, updated_at \
             FROM blog_posts WHERE slug = $1 AND is_published = true"
        )
        .bind(slug)
        .fetch_optional(&self.client.pool)
        .await?;

        Ok(row.map(|r| row_to_blog_post(&r)))
    }

    async fn create_blog_post(&self, data: Value) -> Result<Uuid, AppError> {
        let slug = data["slug"].as_str().unwrap_or_default();
        let title = data["title"].as_str().unwrap_or_default();
        let excerpt = data["excerpt"].as_str();
        let content = data["content"].as_str().unwrap_or_default();
        let cover_image_url = data["cover_image_url"].as_str();
        let author_name = data["author_name"].as_str().unwrap_or("Admin");
        let category = data["category"].as_str();
        let tags: Vec<String> = data["tags"].as_array().map(|arr| {
            arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect()
        }).unwrap_or_default();
        let is_published = data["is_published"].as_bool().unwrap_or(false);
        let published_at = if is_published { Some(chrono::Utc::now()) } else { None };

        let row = sqlx::query(
            "INSERT INTO blog_posts (slug, title, excerpt, content, cover_image_url, author_name, category, tags, is_published, published_at) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id"
        )
        .bind(slug)
        .bind(title)
        .bind(excerpt)
        .bind(content)
        .bind(cover_image_url)
        .bind(author_name)
        .bind(category)
        .bind(tags)
        .bind(is_published)
        .bind(published_at)
        .fetch_one(&self.client.pool)
        .await?;

        Ok(row.get(0))
    }

    async fn update_blog_post(&self, id: Uuid, data: Value) -> Result<(), AppError> {
        let slug = data["slug"].as_str().unwrap_or_default();
        let title = data["title"].as_str().unwrap_or_default();
        let excerpt = data["excerpt"].as_str();
        let content = data["content"].as_str().unwrap_or_default();
        let cover_image_url = data["cover_image_url"].as_str();
        let author_name = data["author_name"].as_str().unwrap_or("Admin");
        let category = data["category"].as_str();
        let tags: Vec<String> = data["tags"].as_array().map(|arr| {
            arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect()
        }).unwrap_or_default();
        let is_published = data["is_published"].as_bool().unwrap_or(false);

        sqlx::query(
            "UPDATE blog_posts SET slug = $1, title = $2, excerpt = $3, content = $4, cover_image_url = $5, \
             author_name = $6, category = $7, tags = $8, is_published = $9, updated_at = NOW() \
             WHERE id = $10"
        )
        .bind(slug)
        .bind(title)
        .bind(excerpt)
        .bind(content)
        .bind(cover_image_url)
        .bind(author_name)
        .bind(category)
        .bind(tags)
        .bind(is_published)
        .bind(id)
        .execute(&self.client.pool)
        .await?;

        Ok(())
    }

    async fn delete_blog_post(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM blog_posts WHERE id = $1")
            .bind(id)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn list_testimonials(&self, featured_only: bool) -> Result<Vec<Value>, AppError> {
        let sql = if featured_only {
            "SELECT id, client_name, client_title, school_name, avatar_url, rating, \
             content, is_featured, display_order, is_published, created_at \
             FROM testimonials WHERE is_featured = true AND is_published = true \
             ORDER BY display_order ASC"
        } else {
            "SELECT id, client_name, client_title, school_name, avatar_url, rating, \
             content, is_featured, display_order, is_published, created_at \
             FROM testimonials WHERE is_published = true \
             ORDER BY display_order ASC, created_at DESC"
        };

        let rows = sqlx::query(sql)
            .fetch_all(&self.client.pool)
            .await?;

        let list: Vec<Value> = rows.iter().map(|r| {
            json!({
                "id": r.get::<Uuid, _>("id").to_string(),
                "client_name": r.get::<String, _>("client_name"),
                "client_title": r.get::<Option<String>, _>("client_title"),
                "school_name": r.get::<Option<String>, _>("school_name"),
                "avatar_url": r.get::<Option<String>, _>("avatar_url"),
                "rating": r.get::<i16, _>("rating") as i32,
                "content": r.get::<String, _>("content"),
                "is_featured": r.get::<bool, _>("is_featured"),
                "display_order": r.get::<i32, _>("display_order"),
                "is_published": r.get::<bool, _>("is_published"),
                "created_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").map(|d| d.to_rfc3339()),
            })
        }).collect();

        Ok(list)
    }

    async fn create_testimonial(&self, data: Value) -> Result<Uuid, AppError> {
        let name = data["client_name"].as_str().unwrap_or_default();
        let title = data["client_title"].as_str();
        let school_name = data["school_name"].as_str();
        let avatar_url = data["avatar_url"].as_str();
        let rating = data["rating"].as_i64().unwrap_or(5) as i16;
        let content = data["content"].as_str().unwrap_or_default();
        let is_featured = data["is_featured"].as_bool().unwrap_or(false);
        let display_order = data["display_order"].as_i64().unwrap_or(0) as i32;
        let is_published = data["is_published"].as_bool().unwrap_or(false);

        let row = sqlx::query(
            "INSERT INTO testimonials (client_name, client_title, school_name, avatar_url, rating, content, is_featured, display_order, is_published) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id"
        )
        .bind(name)
        .bind(title)
        .bind(school_name)
        .bind(avatar_url)
        .bind(rating)
        .bind(content)
        .bind(is_featured)
        .bind(display_order)
        .bind(is_published)
        .fetch_one(&self.client.pool)
        .await?;

        Ok(row.get(0))
    }

    async fn update_testimonial(&self, id: Uuid, data: Value) -> Result<(), AppError> {
        let name = data["client_name"].as_str().unwrap_or_default();
        let title = data["client_title"].as_str();
        let school_name = data["school_name"].as_str();
        let avatar_url = data["avatar_url"].as_str();
        let rating = data["rating"].as_i64().unwrap_or(5) as i16;
        let content = data["content"].as_str().unwrap_or_default();
        let is_featured = data["is_featured"].as_bool().unwrap_or(false);
        let display_order = data["display_order"].as_i64().unwrap_or(0) as i32;
        let is_published = data["is_published"].as_bool().unwrap_or(false);

        sqlx::query(
            "UPDATE testimonials SET client_name = $1, client_title = $2, school_name = $3, avatar_url = $4, \
             rating = $5, content = $6, is_featured = $7, display_order = $8, is_published = $9, updated_at = NOW() \
             WHERE id = $10"
        )
        .bind(name)
        .bind(title)
        .bind(school_name)
        .bind(avatar_url)
        .bind(rating)
        .bind(content)
        .bind(is_featured)
        .bind(display_order)
        .bind(is_published)
        .bind(id)
        .execute(&self.client.pool)
        .await?;

        Ok(())
    }

    async fn delete_testimonial(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM testimonials WHERE id = $1")
            .bind(id)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn create_school_access_request(&self, data: Value) -> Result<Uuid, AppError> {
        let school_name = data["school_name"].as_str().unwrap_or_default();
        let contact_name = data["contact_name"].as_str().unwrap_or_default();
        let email = data["email"].as_str().unwrap_or_default();
        let phone = data["phone"].as_str();
        let employee_count = data["employee_count"].as_i64().map(|v| v as i32);
        let student_count = data["student_count"].as_i64().map(|v| v as i32);
        let message = data["message"].as_str();

        let row = sqlx::query(
            "INSERT INTO school_access_requests (school_name, contact_name, email, phone, employee_count, student_count, message, status) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING id"
        )
        .bind(school_name)
        .bind(contact_name)
        .bind(email)
        .bind(phone)
        .bind(employee_count)
        .bind(student_count)
        .bind(message)
        .fetch_one(&self.client.pool)
        .await?;

        Ok(row.get(0))
    }

    async fn list_school_access_requests(&self) -> Result<Vec<Value>, AppError> {
        let rows = sqlx::query(
            "SELECT id, school_name, contact_name, email, phone, employee_count, student_count, message, status, admin_notes \
             FROM school_access_requests ORDER BY created_at DESC"
        )
        .fetch_all(&self.client.pool)
        .await?;

        let list: Vec<Value> = rows.iter().map(|r| {
            json!({
                "id": r.get::<Uuid, _>("id").to_string(),
                "school_name": r.get::<String, _>("school_name"),
                "contact_name": r.get::<String, _>("contact_name"),
                "email": r.get::<String, _>("email"),
                "phone": r.get::<Option<String>, _>("phone"),
                "employee_count": r.get::<Option<i32>, _>("employee_count"),
                "student_count": r.get::<Option<i32>, _>("student_count"),
                "message": r.get::<Option<String>, _>("message"),
                "status": r.get::<Option<String>, _>("status"),
                "admin_notes": r.get::<Option<String>, _>("admin_notes"),
            })
        }).collect();

        Ok(list)
    }

    async fn update_school_access_request(
        &self,
        id: Uuid,
        status: &str,
        admin_notes: Option<&str>,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE school_access_requests SET status = $1, admin_notes = $2, updated_at = NOW() WHERE id = $3"
        )
        .bind(status)
        .bind(admin_notes)
        .bind(id)
        .execute(&self.client.pool)
        .await?;
        Ok(())
    }
}
