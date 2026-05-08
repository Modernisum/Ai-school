use crate::routes::{exam, timetable, topic};
use crate::AppState;
use axum::{
    routing::{delete, get, post},
    Router,
};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        // Exams
        .route("/exams", post(exam::create_exam).get(exam::list_exams))
        .route("/exams/ai/generate", post(exam::ai_generate_exam))
        // Timetable
        .nest("/timetable", Router::new()
            .route("/generate", post(timetable::generate_timetable))
            .route("/", get(timetable::list_timetables))
            .route("/:configId", get(timetable::get_timetable))
            .route("/:configId/approve", post(timetable::approve_timetable))
            .route("/:configId", delete(timetable::delete_timetable)))
        // Topics
        .route("/topics", post(topic::create_topic))
        .with_state(state)
}
