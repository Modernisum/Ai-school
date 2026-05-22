use crate::routes::{daily_report, exam, exam_checker, exam_results, period_plan, schedule_change, syllabus_calendar, timetable, timetable_enhanced, topic};
use crate::AppState;
use axum::{
    routing::{delete, get, post},
    Router,
};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        // Exams
        .route("/exams", post(exam::create_exam).get(exam::list_exams))
        .route("/exams/:examId/sections", post(exam::create_exam_section).get(exam::list_exam_sections))
        .route("/exams/:examId/sections/:sectionId", axum::routing::patch(exam::update_exam_section))
        .route("/exams/ai/generate", post(exam::ai_generate_exam))
        .route("/exams/ai/regenerate-question", post(exam::ai_regenerate_question))
        .route("/exams/submit-test", post(exam::submit_test))
        .route("/exams/teacher-test", post(exam::create_teacher_test))
        // Exam Checker Workflow
        .route("/exams/checker/assign/:examId", post(exam_checker::assign_checker))
        .route("/exams/checker/pending", get(exam_checker::checker_pending_exams))
        .route("/exams/checker/submissions/:examId", get(exam_checker::list_exam_submissions))
        .route("/exams/checker/review/:examId/:submissionId", post(exam_checker::checker_review))
        .route("/exams/approve/:examId/:submissionId", post(exam_checker::teacher_approve))
        .route("/exams/reject/:examId/:submissionId", post(exam_checker::teacher_reject))
        .route("/exams/publish/:examId", post(exam_checker::publish_results))
        .route("/exams/results/:studentId", get(exam_results::get_student_results))
        // Timetable
        .nest("/timetable", Router::new()
            .route("/generate", post(timetable::generate_timetable))
            .route("/", get(timetable::list_timetables))
            .route("/:configId", get(timetable::get_timetable))
            .route("/:configId/approve", post(timetable::approve_timetable))
            .route("/:configId", delete(timetable::delete_timetable)))
        // Topics
        .route("/topics", post(topic::create_topic))
        // Syllabus Calendar
        .route("/syllabus/:subjectId", get(syllabus_calendar::get_syllabus))
        .route("/syllabus/:subjectId/plot", post(syllabus_calendar::plot_annual))
        .route("/syllabus/:subjectId/micro-plan", post(syllabus_calendar::micro_plan_periods))
        .route("/syllabus/chapter/:chapterId", axum::routing::patch(syllabus_calendar::update_chapter_plan))
        .route("/syllabus/quarter/:quarter", get(syllabus_calendar::quarter_report))
        // Period Plans
        .route("/period-plans/today", get(period_plan::get_daily_todo))
        .route("/period-plans/:date", get(period_plan::get_date_plan))
        .route("/period-plans/:id/status", post(period_plan::update_status))
        .route("/period-plans/restructure", post(period_plan::restructure_pending))
        // Schedule Changes
        .route("/changes/request", post(schedule_change::request_change))
        .route("/changes/pending", get(schedule_change::list_pending))
        .route("/changes/:id/approve", post(schedule_change::approve_change))
        .route("/changes/:id/reject", post(schedule_change::reject_change))
        // Daily Reports
        .route("/reports/daily", post(daily_report::submit_daily_report))
        .route("/reports/daily/:date", get(daily_report::get_report))
        .route("/reports/missed", get(daily_report::missed_reports))
        // Timetable Enhanced (top-level to avoid nest Handler issues)
        .route("/timetable-issue-box/:configId", get(timetable_enhanced::issue_box))
        .route("/timetable-view/:configId", get(timetable_enhanced::view_filtered))
        .route("/timetable-substitute/:classId/:subjectId/:day/:period", get(timetable_enhanced::suggest_substitute))
        .with_state(state)
}
