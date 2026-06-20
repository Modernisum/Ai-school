pub mod cms;
use crate::AppState;
use axum::{
    routing::{get, post, put, delete},
    Router,
};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .nest(
            "/cms",
            Router::new()
                .route("/blog", get(cms::list_blog_posts))
                .route("/blog/:slug", get(cms::get_blog_post))
                .route("/testimonials", get(cms::list_testimonials))
                .route("/school-request", post(cms::create_school_access_request))
        )
        .with_state(state)
}

pub fn admin_routes(state: AppState) -> Router<AppState> {
    Router::new()
        // Blog CRUD (admin)
        .route("/blog", post(cms::create_blog_post))
        .route("/blog/:id", put(cms::update_blog_post).delete(cms::delete_blog_post))
        // Testimonials CRUD (admin)
        .route("/testimonials", post(cms::create_testimonial))
        .route("/testimonials/:id", put(cms::update_testimonial).delete(cms::delete_testimonial))
        // School access requests (admin)
        .route("/school-requests", get(cms::list_school_access_requests))
        .route("/school-requests/:id", put(cms::update_school_access_request))
        .with_state(state)
}