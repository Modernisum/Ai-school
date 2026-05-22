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
        .route("/spaces/categories/:categoryName", delete(spaces::delete_space_category))
        // Spaces
        .route("/spaces", get(spaces::list_spaces))
        .route("/spaces/:category", post(spaces::create_space_by_category))
        .route("/spaces/detail/:spaceName", get(spaces::get_space_details).put(spaces::update_space).delete(spaces::delete_space))
        .route("/spaces/detail/:spaceName/budget", get(spaces::get_space_budget).put(spaces::update_space_budget))
        .route("/spaces/materials/all", get(spaces::get_all_spaces_materials))
        .route("/spaces/:spaceName/materials", get(spaces::get_space_materials).post(spaces::assign_space_materials))
        .route("/spaces/:spaceName/materials/:materialName", delete(spaces::remove_space_material))
        .route("/spaces/:spaceName/materials/:materialName/transfer", post(spaces::transfer_space_material))
        .route("/spaces/:spaceName/clone", post(spaces::clone_space))
        // Materials
        .route("/materials", get(materials::list_materials).post(materials::create_material))
        .route("/materials/bulk", post(materials::bulk_import_materials))
        .route("/materials/shortage-summary", get(materials::get_shortage_summary))
        .route("/materials/run-shortage-check", post(materials::run_shortage_check))
        .route("/materials/:materialName", get(materials::get_material).patch(materials::update_material).delete(materials::delete_material))
        .route("/materials/:materialName/buy", post(materials::buy_material))
        .route("/materials/:materialName/sell", post(materials::sell_material))
        .route("/materials/:materialName/history", get(materials::get_material_history))
        // Events
        .route("/events", post(events::create_event).get(events::list_events))
        .route("/events/:eventId", patch(events::update_event).delete(events::delete_event))
        // Awards
        .route("/awards", get(award::list_awards))
        // Documents
        .route("/documents/upload", post(document_upload::upload_document))
        .route("/documents/upload/student/:studentId", post(document_upload::upload_document))
        .route("/documents/box", get(documentbox::list_documents))
        .with_state(state)
}
