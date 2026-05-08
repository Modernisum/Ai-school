use crate::routes::{announcement, chat};
use crate::AppState;
use axum::{routing::post, Router};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/announcements/:type/:userId", post(announcement::create_announcement))
        .nest("/chat", chat::router())
        .with_state(state)
}
