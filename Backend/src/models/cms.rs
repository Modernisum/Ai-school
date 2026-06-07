use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBlogRequest {
    pub title: String,
    pub slug: String,
    pub excerpt: Option<String>,
    pub content: String,
    pub cover_image_url: Option<String>,
    pub author_name: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub is_published: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BlogListQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub published: Option<bool>,
    pub category: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTestimonialRequest {
    pub client_name: String,
    pub client_title: Option<String>,
    pub school_name: Option<String>,
    pub avatar_url: Option<String>,
    pub rating: Option<i16>,
    pub content: String,
    pub is_featured: Option<bool>,
    pub display_order: Option<i32>,
    pub is_published: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSchoolAccessRequest {
    pub school_name: String,
    pub contact_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub employee_count: Option<i32>,
    pub student_count: Option<i32>,
    pub message: Option<String>,
}
