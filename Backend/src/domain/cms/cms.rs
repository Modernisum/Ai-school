use crate::AppState;
use crate::models::cms::{
    CreateBlogRequest, BlogListQuery, CreateTestimonialRequest, CreateSchoolAccessRequest,
};
use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::Row;
use uuid::Uuid;



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

// ─── Public Blog Endpoints ───

pub async fn list_blog_posts(
    State(state): State<AppState>,
    Query(query): Query<BlogListQuery>,
) -> impl IntoResponse {
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(10).clamp(1, 50);
    let offset = (page - 1) * per_page;
    let where_published = query.published.unwrap_or(true);

    let count_sql = if where_published {
        "SELECT COUNT(*) as count FROM blog_posts WHERE is_published = true"
    } else {
        "SELECT COUNT(*) as count FROM blog_posts"
    };

    let total: i64 = sqlx::query_scalar(count_sql)
        .fetch_one(&state.db.pool)
        .await
        .unwrap_or(0);

    let list_sql = if where_published {
        "SELECT id, slug, title, excerpt, content, cover_image_url, author_name, category, \
         tags, is_published, published_at, created_at, updated_at \
         FROM blog_posts WHERE is_published = true \
         ORDER BY published_at DESC LIMIT $1 OFFSET $2"
    } else {
        "SELECT id, slug, title, excerpt, content, cover_image_url, author_name, category, \
         tags, is_published, published_at, created_at, updated_at \
         FROM blog_posts ORDER BY created_at DESC LIMIT $1 OFFSET $2"
    };

    let rows: Vec<sqlx::postgres::PgRow> = sqlx::query(list_sql)
        .bind(per_page)
        .bind(offset)
        .fetch_all(&state.db.pool)
        .await
        .unwrap_or_default();

    let posts: Vec<serde_json::Value> = rows.iter().map(|r| row_to_blog_post(r)).collect();

    Json(json!({
        "success": true,
        "data": posts,
        "pagination": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": ((total as f64) / (per_page as f64)).ceil() as i64
        }
    }))
}

pub async fn get_blog_post(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    let row: Option<sqlx::postgres::PgRow> = sqlx::query(
        "SELECT id, slug, title, excerpt, content, cover_image_url, author_name, category, \
         tags, is_published, published_at, created_at, updated_at \
         FROM blog_posts WHERE slug = $1 AND is_published = true"
    )
    .bind(&slug)
    .fetch_optional(&state.db.pool)
    .await
    .unwrap_or(None);

    match row {
        Some(r) => Json(json!({
            "success": true,
            "data": row_to_blog_post(&r)
        }))
        .into_response(),
        None => (
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({ "success": false, "message": "Blog post not found" })),
        )
            .into_response(),
    }
}

// ─── Admin Blog Endpoints ───

pub async fn create_blog_post(
    State(state): State<AppState>,
    Json(body): Json<CreateBlogRequest>,
) -> impl IntoResponse {
    let published_at = if body.is_published.unwrap_or(false) {
        Some(chrono::Utc::now())
    } else {
        None
    };

    let result: Result<sqlx::postgres::PgRow, _> = sqlx::query(
        "INSERT INTO blog_posts (slug, title, excerpt, content, cover_image_url, \
         author_name, category, tags, is_published, published_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) \
         RETURNING id"
    )
    .bind(&body.slug)
    .bind(&body.title)
    .bind(&body.excerpt)
    .bind(&body.content)
    .bind(&body.cover_image_url)
    .bind(body.author_name.unwrap_or_else(|| "Vidhyam Team".to_string()))
    .bind(&body.category)
    .bind(&body.tags)
    .bind(body.is_published.unwrap_or(false))
    .bind(published_at)
    .fetch_one(&state.db.pool)
    .await;

    match result {
        Ok(row) => {
            let id: Uuid = row.get("id");
            Json(json!({ "success": true, "data": { "id": id.to_string() } })).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        )
            .into_response(),
    }
}

pub async fn update_blog_post(
    State(state): State<AppState>,
    Path(post_id): Path<Uuid>,
    Json(body): Json<CreateBlogRequest>,
) -> impl IntoResponse {
    let result = sqlx::query(
        "UPDATE blog_posts SET slug = $1, title = $2, excerpt = $3, content = $4, \
         cover_image_url = $5, author_name = $6, category = $7, tags = $8, \
         is_published = $9, updated_at = NOW() \
         WHERE id = $10"
    )
    .bind(&body.slug)
    .bind(&body.title)
    .bind(&body.excerpt)
    .bind(&body.content)
    .bind(&body.cover_image_url)
    .bind(body.author_name.unwrap_or_else(|| "Vidhyam Team".to_string()))
    .bind(&body.category)
    .bind(&body.tags)
    .bind(body.is_published.unwrap_or(false))
    .bind(post_id)
    .execute(&state.db.pool)
    .await;

    match result {
        Ok(_) => Json(json!({ "success": true, "message": "Blog post updated" })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        )
            .into_response(),
    }
}

pub async fn delete_blog_post(
    State(state): State<AppState>,
    Path(post_id): Path<Uuid>,
) -> impl IntoResponse {
    let result = sqlx::query("DELETE FROM blog_posts WHERE id = $1")
        .bind(post_id)
        .execute(&state.db.pool)
        .await;

    match result {
        Ok(_) => Json(json!({ "success": true, "message": "Blog post deleted" })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        )
            .into_response(),
    }
}

// ─── Public Testimonials Endpoint ───

pub async fn list_testimonials(
    State(state): State<AppState>,
    Query(query): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let featured_only = query.get("featured").map(|v| v == "true").unwrap_or(false);

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

    let rows: Vec<sqlx::postgres::PgRow> = sqlx::query(sql)
        .fetch_all(&state.db.pool)
        .await
        .unwrap_or_default();

    let data: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<Uuid, _>("id").map(|v| v.to_string()).unwrap_or_default(),
                "client_name": r.try_get::<String, _>("client_name").unwrap_or_default(),
                "client_title": r.try_get::<Option<String>, _>("client_title").unwrap_or(None),
                "school_name": r.try_get::<Option<String>, _>("school_name").unwrap_or(None),
                "avatar_url": r.try_get::<Option<String>, _>("avatar_url").unwrap_or(None),
                "rating": r.try_get::<i16, _>("rating").unwrap_or(5),
                "content": r.try_get::<String, _>("content").unwrap_or_default(),
                "is_featured": r.try_get::<bool, _>("is_featured").unwrap_or(false),
                "display_order": r.try_get::<i32, _>("display_order").unwrap_or(0),
                "is_published": r.try_get::<bool, _>("is_published").unwrap_or(false),
                "created_at": r.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").unwrap_or(None).map(|d| d.to_rfc3339()),
            })
        })
        .collect();

    Json(json!({ "success": true, "data": data }))
}

// ─── Admin Testimonials Endpoints ───

pub async fn create_testimonial(
    State(state): State<AppState>,
    Json(body): Json<CreateTestimonialRequest>,
) -> impl IntoResponse {
    let result: Result<sqlx::postgres::PgRow, _> = sqlx::query(
        "INSERT INTO testimonials (client_name, client_title, school_name, avatar_url, \
         rating, content, is_featured, display_order, is_published) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id"
    )
    .bind(&body.client_name)
    .bind(&body.client_title)
    .bind(&body.school_name)
    .bind(&body.avatar_url)
    .bind(body.rating.unwrap_or(5))
    .bind(&body.content)
    .bind(body.is_featured.unwrap_or(false))
    .bind(body.display_order.unwrap_or(0))
    .bind(body.is_published.unwrap_or(false))
    .fetch_one(&state.db.pool)
    .await;

    match result {
        Ok(row) => {
            let id: Uuid = row.get("id");
            Json(json!({ "success": true, "data": { "id": id.to_string() } })).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        )
            .into_response(),
    }
}

pub async fn update_testimonial(
    State(state): State<AppState>,
    Path(testimonial_id): Path<Uuid>,
    Json(body): Json<CreateTestimonialRequest>,
) -> impl IntoResponse {
    let result = sqlx::query(
        "UPDATE testimonials SET client_name = $1, client_title = $2, school_name = $3, \
         avatar_url = $4, rating = $5, content = $6, is_featured = $7, \
         display_order = $8, is_published = $9, updated_at = NOW() \
         WHERE id = $10"
    )
    .bind(&body.client_name)
    .bind(&body.client_title)
    .bind(&body.school_name)
    .bind(&body.avatar_url)
    .bind(body.rating.unwrap_or(5))
    .bind(&body.content)
    .bind(body.is_featured.unwrap_or(false))
    .bind(body.display_order.unwrap_or(0))
    .bind(body.is_published.unwrap_or(false))
    .bind(testimonial_id)
    .execute(&state.db.pool)
    .await;

    match result {
        Ok(_) => Json(json!({ "success": true, "message": "Testimonial updated" })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        )
            .into_response(),
    }
}

pub async fn delete_testimonial(
    State(state): State<AppState>,
    Path(testimonial_id): Path<Uuid>,
) -> impl IntoResponse {
    let result = sqlx::query("DELETE FROM testimonials WHERE id = $1")
        .bind(testimonial_id)
        .execute(&state.db.pool)
        .await;

    match result {
        Ok(_) => Json(json!({ "success": true, "message": "Testimonial deleted" })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        )
            .into_response(),
    }
}

// ─── Public School Access Request Endpoint ───

pub async fn create_school_access_request(
    State(state): State<AppState>,
    Json(body): Json<CreateSchoolAccessRequest>,
) -> impl IntoResponse {
    if body.school_name.trim().is_empty() || body.contact_name.trim().is_empty() || body.email.trim().is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({ "success": false, "message": "School name, contact name, and email are required" })),
        )
            .into_response();
    }

    let result: Result<sqlx::postgres::PgRow, _> = sqlx::query(
        "INSERT INTO school_access_requests (school_name, contact_name, email, phone, \
         employee_count, student_count, message, status) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING id"
    )
    .bind(&body.school_name)
    .bind(&body.contact_name)
    .bind(&body.email)
    .bind(&body.phone)
    .bind(body.employee_count)
    .bind(body.student_count)
    .bind(&body.message)
    .fetch_one(&state.db.pool)
    .await;

    match result {
        Ok(row) => {
            let id: Uuid = row.get("id");
            Json(json!({ "success": true, "data": { "id": id.to_string(), "status": "pending" } })).into_response()
        }
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        )
            .into_response(),
    }
}

// ─── Admin: List School Access Requests ───

pub async fn list_school_access_requests(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let rows: Vec<sqlx::postgres::PgRow> = sqlx::query(
        "SELECT id, school_name, contact_name, email, phone, employee_count, \
         student_count, message, status, admin_notes \
         FROM school_access_requests ORDER BY created_at DESC"
    )
    .fetch_all(&state.db.pool)
    .await
    .unwrap_or_default();

    let requests: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.try_get::<Uuid, _>("id").map(|v| v.to_string()).unwrap_or_default(),
                "school_name": r.try_get::<String, _>("school_name").unwrap_or_default(),
                "contact_name": r.try_get::<String, _>("contact_name").unwrap_or_default(),
                "email": r.try_get::<String, _>("email").unwrap_or_default(),
                "phone": r.try_get::<Option<String>, _>("phone").unwrap_or(None),
                "employee_count": r.try_get::<Option<i32>, _>("employee_count").unwrap_or(None),
                "student_count": r.try_get::<Option<i32>, _>("student_count").unwrap_or(None),
                "message": r.try_get::<Option<String>, _>("message").unwrap_or(None),
                "status": r.try_get::<Option<String>, _>("status").unwrap_or(None),
                "admin_notes": r.try_get::<Option<String>, _>("admin_notes").unwrap_or(None),
            })
        })
        .collect();

    Json(json!({ "success": true, "data": requests }))
}

pub async fn update_school_access_request(
    State(state): State<AppState>,
    Path(request_id): Path<Uuid>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let status = body.get("status").and_then(|s| s.as_str()).unwrap_or("pending");
    let admin_notes = body.get("admin_notes").and_then(|s| s.as_str());

    let result = sqlx::query(
        "UPDATE school_access_requests SET status = $1, admin_notes = $2, updated_at = NOW() WHERE id = $3"
    )
    .bind(status)
    .bind(admin_notes)
    .bind(request_id)
    .execute(&state.db.pool)
    .await;

    match result {
        Ok(_) => Json(json!({ "success": true, "message": "Request updated" })).into_response(),
        Err(e) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "message": e.to_string() })),
        )
            .into_response(),
    }
}