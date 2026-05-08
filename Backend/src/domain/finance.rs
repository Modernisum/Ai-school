use crate::routes::{fees, payment};
use crate::AppState;
use axum::{
    routing::{delete, get, post, put},
    Router,
};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/fees", get(fees::get_school_fees).post(fees::create_school_fee))
        .route("/fees/pending", get(fees::get_pending_fees))
        .route("/fees/student/:studentId", get(fees::get_student_fee))
        .route("/fees/student/:studentId/ai-reminder", get(fees::generate_fee_reminder))
        .route("/fees/student/:studentId/add", post(fees::add_fee_to_student_route))
        .route("/fees/student/:studentId/pay", post(fees::pay_fee))
        .route("/fees/student/:studentId/discount", post(fees::apply_discount))
        .route("/fees/custom", get(fees::list_custom_fees).post(fees::create_custom_fee))
        .route("/fees/custom/:feeId", delete(fees::delete_custom_fee))
        .route("/fees/custom/:feeId/apply", post(fees::apply_custom_fee))
        .route("/coupons", get(fees::list_coupons).post(fees::create_coupon))
        .route("/coupons/validate", post(fees::validate_coupon))
        .route("/coupons/:couponId", delete(fees::delete_coupon))
        .route("/coupons/:couponId/block", put(fees::block_coupon))
        .route("/coupons/:couponId/use", post(fees::use_coupon))
        .nest("/payment", payment::router())
        .with_state(state)
}
