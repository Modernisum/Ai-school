pub mod announcement;
pub mod chat;
use crate::AppState;
use axum::{routing::post, Router};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .nest(
            "/school/:schoolId/comm",
            Router::new()
                .route("/announcements/:type/:userId", post(announcement::create_announcement))
                .nest("/chat", chat::router())
        )
        .with_state(state)
}
