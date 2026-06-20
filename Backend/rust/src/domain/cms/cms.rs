use crate::AppState;
use crate::models::cms::{
    CreateBlogRequest, BlogListQuery, CreateTestimonialRequest, CreateSchoolAccessRequest,
};
use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use uuid::Uuid;

// ─── Public Blog Endpoints ───

pub async fn list_blog_posts(
    State(state): State<AppState>,
    Query(query): Query<BlogListQuery>,
) -> impl IntoResponse {
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(10).clamp(1, 50);
    let offset = (page - 1) * per_page;
    let where_published = query.published.unwrap_or(true);

    let total = match state.repos.cms.count_blog_posts(where_published).await {
        Ok(c) => c,
        Err(e) => return (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    };

    match state.repos.cms.list_blog_posts(where_published, per_page, offset).await {
        Ok(posts) => Json(json!({
            "success": true,
            "data": posts,
            "pagination": {
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": ((total as f64) / (per_page as f64)).ceil() as i64
            }
        })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}

pub async fn get_blog_post(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    match state.repos.cms.get_blog_post(&slug).await {
        Ok(Some(post)) => Json(json!({
            "success": true,
            "data": post
        })).into_response(),
        Ok(None) => (
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({ "success": false, "message": "Blog post not found" })),
        ).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}

// ─── Admin Blog Endpoints ───

pub async fn create_blog_post(
    State(state): State<AppState>,
    Json(body): Json<CreateBlogRequest>,
) -> impl IntoResponse {
    let data = json!({
        "slug": body.slug,
        "title": body.title,
        "excerpt": body.excerpt,
        "content": body.content,
        "cover_image_url": body.cover_image_url,
        "author_name": body.author_name,
        "category": body.category,
        "tags": body.tags,
        "is_published": body.is_published,
    });

    match state.repos.cms.create_blog_post(data).await {
        Ok(id) => Json(json!({ "success": true, "data": { "id": id.to_string() } })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}

pub async fn update_blog_post(
    State(state): State<AppState>,
    Path(post_id): Path<Uuid>,
    Json(body): Json<CreateBlogRequest>,
) -> impl IntoResponse {
    let data = json!({
        "slug": body.slug,
        "title": body.title,
        "excerpt": body.excerpt,
        "content": body.content,
        "cover_image_url": body.cover_image_url,
        "author_name": body.author_name,
        "category": body.category,
        "tags": body.tags,
        "is_published": body.is_published,
    });

    match state.repos.cms.update_blog_post(post_id, data).await {
        Ok(_) => Json(json!({ "success": true, "message": "Blog post updated" })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}

pub async fn delete_blog_post(
    State(state): State<AppState>,
    Path(post_id): Path<Uuid>,
) -> impl IntoResponse {
    match state.repos.cms.delete_blog_post(post_id).await {
        Ok(_) => Json(json!({ "success": true, "message": "Blog post deleted" })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}

// ─── Testimonials Endpoints ───

pub async fn list_testimonials(
    State(state): State<AppState>,
    Query(query): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let featured_only = query.get("featured").map(|v| v == "true").unwrap_or(false);

    match state.repos.cms.list_testimonials(featured_only).await {
        Ok(list) => Json(json!({ "success": true, "data": list })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}

pub async fn create_testimonial(
    State(state): State<AppState>,
    Json(body): Json<CreateTestimonialRequest>,
) -> impl IntoResponse {
    let data = json!({
        "client_name": body.client_name,
        "client_title": body.client_title,
        "school_name": body.school_name,
        "avatar_url": body.avatar_url,
        "rating": body.rating,
        "content": body.content,
        "is_featured": body.is_featured,
        "display_order": body.display_order,
        "is_published": body.is_published,
    });

    match state.repos.cms.create_testimonial(data).await {
        Ok(id) => Json(json!({ "success": true, "data": { "id": id.to_string() } })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}

pub async fn update_testimonial(
    State(state): State<AppState>,
    Path(testimonial_id): Path<Uuid>,
    Json(body): Json<CreateTestimonialRequest>,
) -> impl IntoResponse {
    let data = json!({
        "client_name": body.client_name,
        "client_title": body.client_title,
        "school_name": body.school_name,
        "avatar_url": body.avatar_url,
        "rating": body.rating,
        "content": body.content,
        "is_featured": body.is_featured,
        "display_order": body.display_order,
        "is_published": body.is_published,
    });

    match state.repos.cms.update_testimonial(testimonial_id, data).await {
        Ok(_) => Json(json!({ "success": true, "message": "Testimonial updated" })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}

pub async fn delete_testimonial(
    State(state): State<AppState>,
    Path(testimonial_id): Path<Uuid>,
) -> impl IntoResponse {
    match state.repos.cms.delete_testimonial(testimonial_id).await {
        Ok(_) => Json(json!({ "success": true, "message": "Testimonial deleted" })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}

// ─── School Access Requests ───

pub async fn create_school_access_request(
    State(state): State<AppState>,
    Json(body): Json<CreateSchoolAccessRequest>,
) -> impl IntoResponse {
    if body.school_name.trim().is_empty() || body.contact_name.trim().is_empty() || body.email.trim().is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({ "success": false, "message": "School name, contact name, and email are required" })),
        ).into_response();
    }

    let data = json!({
        "school_name": body.school_name,
        "contact_name": body.contact_name,
        "email": body.email,
        "phone": body.phone,
        "employee_count": body.employee_count,
        "student_count": body.student_count,
        "message": body.message,
    });

    match state.repos.cms.create_school_access_request(data).await {
        Ok(id) => Json(json!({ "success": true, "data": { "id": id.to_string(), "status": "pending" } })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}

pub async fn list_school_access_requests(
    State(state): State<AppState>,
) -> impl IntoResponse {
    match state.repos.cms.list_school_access_requests().await {
        Ok(list) => Json(json!({ "success": true, "data": list })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}

pub async fn update_school_access_request(
    State(state): State<AppState>,
    Path(request_id): Path<Uuid>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let status = body.get("status").and_then(|s| s.as_str()).unwrap_or("pending");
    let admin_notes = body.get("admin_notes").and_then(|s| s.as_str());

    match state.repos.cms.update_school_access_request(request_id, status, admin_notes).await {
        Ok(_) => Json(json!({ "success": true, "message": "Request updated" })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        ).into_response(),
    }
}