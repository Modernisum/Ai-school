pub mod ai;
pub mod content_generation;
use crate::AppState;
use axum::{
    routing::post,
    Router,
    middleware::Next,
    response::Response,
    extract::Request,
};

pub fn routes(state: AppState) -> Router<AppState> {
    let ai_limiter = state.ai_limiter.clone();
    Router::new()
        .nest(
            "/school/:schoolId/ai",
            Router::new()
                .nest("/chat", ai::ai_routes())
                .route("/content/generate/exam", post(content_generation::generate_exam_questions))
                .route("/content/generate/lesson-plan", post(content_generation::generate_lesson_plan))
                .route("/content/generate/study-materials", post(content_generation::generate_study_materials))
                .route("/content/generate/practice-problems", post(content_generation::generate_practice_problems))
                .route("/content/summarize", post(content_generation::summarize_content))
                .route("/content/enhanced/generate-exam", post(content_generation::enhanced_generate_exam))
        )
        .layer(axum::middleware::from_fn(move |req: Request, next: Next| {
            let client_ip = crate::middleware::rate_limiter::RateLimiter::extract_client_ip(&req);
            let limiter = ai_limiter.clone();
            async move {
                limiter.check(&client_ip).await?;
                Ok::<Response, Response>(next.run(req).await)
            }
        }))
        .with_state(state)
}
