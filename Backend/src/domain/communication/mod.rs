pub mod announcement;
pub mod chat;
pub mod notification;
pub mod ws;
pub mod webhook;
use crate::AppState;
use axum::{routing::post, Router};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .nest(
            "/school/:schoolId/comm",
            Router::new()
                .route("/announcements/:type/:userId", post(announcement::create_announcement))
                .nest("/chat", chat::router())
                .nest("/notifications", notification::router())
                .route("/school/notification", axum::routing::get(notification::get_school_notification)
                    .delete(notification::clear_school_notification))
                .route("/school/notify/global", axum::routing::get(notification::get_global_notification))
                .nest("/ws", ws::router())
                .nest("/webhooks", Router::new()
                    .route("/", axum::routing::post(webhook::register_webhook).get(webhook::list_webhooks))
                    .route("/:webhookId", axum::routing::delete(webhook::delete_webhook))
                    .route("/:webhookId/logs", axum::routing::get(webhook::get_webhook_logs)))
        )
        .with_state(state)
}

pub fn legacy_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/school/:schoolId/notification", axum::routing::get(notification::get_school_notification)
            .delete(notification::clear_school_notification))
        .route("/global/notification", axum::routing::get(notification::get_global_notification))
        .with_state(state)
}


