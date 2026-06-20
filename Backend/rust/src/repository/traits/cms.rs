use async_trait::async_trait;
use crate::repository::traits::AppError;
use serde_json::Value;
use uuid::Uuid;

#[async_trait]
pub trait CmsRepository: Send + Sync {
    async fn count_blog_posts(&self, published_only: bool) -> Result<i64, AppError>;

    async fn list_blog_posts(
        &self,
        published_only: bool,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Value>, AppError>;

    async fn get_blog_post(&self, slug: &str) -> Result<Option<Value>, AppError>;

    async fn create_blog_post(&self, data: Value) -> Result<Uuid, AppError>;

    async fn update_blog_post(&self, id: Uuid, data: Value) -> Result<(), AppError>;

    async fn delete_blog_post(&self, id: Uuid) -> Result<(), AppError>;

    async fn list_testimonials(&self, featured_only: bool) -> Result<Vec<Value>, AppError>;

    async fn create_testimonial(&self, data: Value) -> Result<Uuid, AppError>;

    async fn update_testimonial(&self, id: Uuid, data: Value) -> Result<(), AppError>;

    async fn delete_testimonial(&self, id: Uuid) -> Result<(), AppError>;

    async fn create_school_access_request(&self, data: Value) -> Result<Uuid, AppError>;

    async fn list_school_access_requests(&self) -> Result<Vec<Value>, AppError>;

    async fn update_school_access_request(
        &self,
        id: Uuid,
        status: &str,
        admin_notes: Option<&str>,
    ) -> Result<(), AppError>;
}
