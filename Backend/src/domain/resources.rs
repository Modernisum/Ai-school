use crate::routes::{award, document_upload, documentbox, events, materials, spaces, storage};
use crate::AppState;
use axum::{
    routing::{delete, get, patch, post, put},
    Router,
};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        // Space Categories
        .route("/spaces/categories", get(spaces::list_space_categories).post(spaces::create_space_category))
        // Spaces
        .route("/spaces", get(spaces::list_spaces))
        .route("/spaces/:category", post(spaces::create_space_by_category))
        .route("/spaces/detail/:spaceName", get(spaces::get_space_details).put(spaces::update_space).delete(spaces::delete_space))
        .route("/spaces/:spaceName/materials", post(spaces::assign_space_materials))
        // Materials
        .route("/materials", get(materials::list_materials).post(materials::create_material))
        .route("/materials/bulk", post(materials::bulk_import_materials))
        .route("/materials/:materialName", get(materials::get_material).patch(materials::update_material).delete(materials::delete_material))
        .route("/materials/:materialName/buy", post(materials::buy_material))
        .route("/materials/:materialName/sell", post(materials::sell_material))
        // Events
        .route("/events", post(events::create_event))
        // Awards
        .route("/awards", get(award::list_awards))
        // Documents
        .route("/documents/upload", post(document_upload::upload_document))
        .route("/documents/upload/student/:studentId", post(document_upload::upload_document))
        .route("/documents/box", get(documentbox::list_documents))
        .with_state(state)
}
