pub mod ai;
pub mod content_generation;
use crate::AppState;
use axum::{routing::post, Router};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .nest("/chat", ai::ai_routes())
        .route("/content/generate/exam", post(content_generation::generate_exam_questions))
        .route("/content/generate/lesson-plan", post(content_generation::generate_lesson_plan))
        .route("/content/generate/study-materials", post(content_generation::generate_study_materials))
        .route("/content/generate/practice-problems", post(content_generation::generate_practice_problems))
        .route("/content/summarize", post(content_generation::summarize_content))
        .route("/content/enhanced/generate-exam", post(content_generation::enhanced_generate_exam))
        .with_state(state)
}
