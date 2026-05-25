pub mod ocr;
use crate::AppState;
use axum::{routing::post, Router};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/extract", post(ocr::extract_ocr))
        .route("/extract-batch", post(ocr::extract_ocr_batch))
        .with_state(state)
}
