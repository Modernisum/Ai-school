use crate::routes::attendance;
use crate::routes::attendance_automation;
use crate::AppState;
use axum::{
    routing::{delete, get, post, put},
    Router,
};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/:role/:userId/present", post(attendance::mark_present))
        .route("/:role/:userId/holiday", post(attendance::mark_holiday))
        .route("/:role/:userId/:date", put(attendance::update_attendance).delete(attendance::delete_attendance))
        .route("/student/date/:date", get(attendance::list_attendance_by_date))
        .route("/:role/:userId", get(attendance::list_attendance))
        .route("/holidays", get(attendance::list_school_holidays).post(attendance::create_school_holiday))
        .route("/holidays/check", get(attendance::check_school_holiday))
        .route("/holidays/:holidayId", get(attendance::get_holiday_detail).delete(attendance::delete_school_holiday))
        .route("/bulk", post(attendance::bulk_mark_attendance))
        .route("/class", get(attendance::get_class_attendance))
        .route("/qr", post(attendance::generate_qr_attendance))
        .route("/mobile", post(attendance::mobile_mark_attendance))
        .route("/offline-sync", post(attendance::offline_sync_attendance))
        .route("/", get(attendance::get_school_attendance))
        .route("/reports/student", get(attendance::get_student_report))
        .route("/reports/class", get(attendance::get_class_report))
        .route("/reports/employee", get(attendance::get_employee_report))
        .route("/reports/custom", post(attendance::generate_custom_report))
        .route("/auto-assign-teacher", get(attendance_automation::auto_assign_teacher))
        .with_state(state)
}
