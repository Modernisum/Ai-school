use async_trait::async_trait;
use serde_json::Value;

pub type AppError = Box<dyn std::error::Error + Send + Sync>;
pub type JsonList = Vec<serde_json::Value>;

#[async_trait]
pub trait AuthRepository: Send + Sync {
    async fn create_school(&self, data: Value) -> Result<(), AppError>;
    async fn get_auth_by_id(&self, id: &str) -> Result<Option<Value>, AppError>;
    async fn update_auth(&self, id: &str, data: Value) -> Result<(), AppError>;
    async fn save_token(&self, token_id: &str, data: Value) -> Result<(), AppError>;
    async fn get_token(&self, token_id: &str) -> Result<Option<Value>, AppError>;
    async fn delete_token(&self, token_id: &str) -> Result<(), AppError>;
    async fn revoke_token(&self, token_id: &str) -> Result<(), AppError>;
    async fn cleanup_expired_tokens(&self) -> Result<usize, AppError>;
    async fn add_auth_log(&self, id: &str, action: &str, details: Value) -> Result<(), AppError>;
    async fn change_school_id(&self, old_id: &str, new_id: &str) -> Result<(), AppError>;
    async fn generate_school_code(&self) -> Result<String, AppError>;
}

#[async_trait]
pub trait StudentRepository: Send + Sync {
    async fn add_student(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_students(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_students_by_class(
        &self,
        school_id: &str,
        class_name: &str,
        section: Option<&str>,
    ) -> Result<JsonList, AppError>;
    async fn get_student(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Option<Value>, AppError>;
    async fn update_student(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn delete_student(&self, school_id: &str, student_id: &str) -> Result<(), AppError>;
    async fn get_next_roll_number(
        &self,
        school_id: &str,
        class_name: &str,
    ) -> Result<i32, AppError>;
    async fn generate_student_id(&self, school_id: &str) -> Result<String, AppError>;
    
    // Security & Validation
    async fn check_aadhaar_exists(&self, school_id: &str, aadhaar: &str, exclude_sid: Option<&str>) -> Result<bool, AppError>;
    async fn count_phone_usage(&self, school_id: &str, phone: &str, exclude_sid: Option<&str>) -> Result<i32, AppError>;
    async fn count_email_usage(&self, school_id: &str, email: &str, exclude_sid: Option<&str>) -> Result<i32, AppError>;

    // History & Rollback
    async fn add_history(&self, school_id: &str, student_id: &str, rev_no: i32, snapshot: Value, delta: Value) -> Result<(), AppError>;
    async fn get_next_rev_no(&self, school_id: &str, student_id: &str) -> Result<i32, AppError>;
    async fn get_history_by_id(&self, school_id: &str, id: i32) -> Result<Option<Value>, AppError>;
    async fn get_all_student_history(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_student_profile(&self, school_id: &str, student_id: &str) -> Result<Option<Value>, AppError>;
}

#[async_trait]
pub trait EmployeeRepository: Send + Sync {
    async fn add_employee(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_employees(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_employee(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<Option<Value>, AppError>;
    async fn update_employee(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn delete_employee(&self, school_id: &str, employee_id: &str) -> Result<(), AppError>;
    async fn generate_employee_id(&self) -> Result<String, AppError>;
}

#[async_trait]
pub trait AcademicRepository: Send + Sync {
    // Classes
    async fn add_class(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_classes(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_class(&self, school_id: &str, class_id: &str) -> Result<Option<Value>, AppError>;
    async fn get_class_by_name(&self, school_id: &str, name: &str) -> Result<Option<Value>, AppError>;
    async fn update_class(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn update_class_aggregates(
        &self,
        school_id: &str,
        class_id: &str,
        aggregates: Value,
    ) -> Result<(), AppError>;
    async fn get_class_students_count(
        &self,
        school_id: &str,
        class_name: &str,
    ) -> Result<i64, AppError>;

    // Subjects
    async fn add_subject(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn generate_subject_id(&self, subject_name: &str) -> Result<String, AppError>;
    async fn get_subjects(&self, school_id: &str) -> Result<JsonList, AppError>;

    // Exams
    async fn add_exam(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_exams(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<JsonList, AppError>;
    async fn add_student_exam(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), AppError>;

    // Topics
    async fn add_topic(&self, data: Value) -> Result<Value, AppError>;
    async fn get_topics(&self) -> Result<JsonList, AppError>;

    // Periods
    async fn add_period(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn get_periods_count(&self, school_id: &str, class_id: &str) -> Result<i64, AppError>;

    // Streams
    async fn add_stream(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<(), AppError>;

    async fn delete_class(&self, school_id: &str, class_id: &str) -> Result<(), AppError>;
    async fn get_subject(&self, school_id: &str, subject_id: &str) -> Result<Option<Value>, AppError>;
    async fn update_subject(&self, school_id: &str, subject_id: &str, data: Value) -> Result<(), AppError>;
    async fn delete_subject(&self, school_id: &str, subject_id: &str) -> Result<(), AppError>;
    async fn get_exam(&self, school_id: &str, exam_id: &str) -> Result<Option<Value>, AppError>;
    async fn update_exam(&self, school_id: &str, exam_id: &str, data: Value) -> Result<(), AppError>;
    async fn delete_exam(&self, school_id: &str, exam_id: &str) -> Result<(), AppError>;
}

#[async_trait]
pub trait AttendanceRepository: Send + Sync {
    async fn mark_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn get_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
    ) -> Result<JsonList, AppError>;
    async fn delete_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
    ) -> Result<(), AppError>;
    async fn add_attendance_history(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), AppError>;
}

#[async_trait]
pub trait FeeRepository: Send + Sync {
    async fn add_school_fee(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_school_fees(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_pending_fees(
        &self,
        school_id: &str,
        min_percentage: f64,
        class_name: Option<String>,
    ) -> Result<JsonList, AppError>;
    async fn add_student_fee(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn get_student_fee(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Option<Value>, AppError>;
    async fn update_student_fee(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn add_fee_history(
        &self,
        school_id: &str,
        fee_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), AppError>;

    async fn add_custom_fee(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_custom_fees(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn delete_custom_fee(&self, school_id: &str, fee_id: &str) -> Result<(), AppError>;
    async fn apply_custom_fee(&self, school_id: &str, fee_id: &str) -> Result<Value, AppError>;
    async fn get_student_custom_fees(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Vec<Value>, AppError>;
}

#[async_trait]
pub trait CouponRepository: Send + Sync {
    async fn create_coupon(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_coupons(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn delete_coupon(&self, school_id: &str, coupon_id: &str) -> Result<(), AppError>;
    async fn block_coupon(
        &self,
        school_id: &str,
        coupon_id: &str,
        blocked: bool,
    ) -> Result<(), AppError>;
    async fn validate_coupon(
        &self,
        school_id: &str,
        coupon_name: &str,
    ) -> Result<Option<Value>, AppError>;
    async fn use_coupon(
        &self,
        school_id: &str,
        coupon_id: &str,
        student_id: &str,
        discount: f64,
    ) -> Result<Value, AppError>;
}

#[async_trait]
pub trait PayrollRepository: Send + Sync {
    async fn update_employee_salary_params(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn add_employee_payment(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn add_payroll_salary(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn get_payroll_summary(
        &self,
        school_id: &str,
        employee_id: &str,
        page: u32,
        limit: u32,
    ) -> Result<Value, AppError>;
    async fn add_payment_history(
        &self,
        school_id: &str,
        employee_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), AppError>;
}

#[async_trait]
pub trait TransactionRepository: Send + Sync {
    async fn create_online_transaction(
        &self,
        school_id: &str,
        student_id: &str,
        fee_type: &str,
        fee_id: &str,
        amount: f64,
        currency: &str,
        gateway_order_id: &str,
    ) -> Result<(), AppError>;

    async fn complete_online_transaction(
        &self,
        gateway_order_id: &str,
        gateway_payment_id: &str,
        gateway_signature: &str,
    ) -> Result<Option<String>, AppError>;
}


#[async_trait]
pub trait ResourceRepository: Send + Sync {
    // Infrastructure
    async fn add_space(&self, school_id: &str, data: Value) -> Result<(), AppError>;
    async fn create_space(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn update_space(
        &self,
        school_id: &str,
        space_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn delete_space(&self, school_id: &str, space_id: &str) -> Result<(), AppError>;
    async fn add_item(&self, school_id: &str, space_id: &str, data: Value) -> Result<(), AppError>;
    async fn add_material(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_material(
        &self,
        school_id: &str,
        material_id: &str,
    ) -> Result<Option<Value>, AppError>;
    async fn update_material(
        &self,
        school_id: &str,
        material_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn add_material_location(
        &self,
        school_id: &str,
        material_id: &str,
        space_id: &str,
        item_id: &str,
        quantity: i32,
    ) -> Result<(), AppError>;
    async fn add_material_history(
        &self,
        school_id: &str,
        material_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), AppError>;

    // Announcements
    async fn add_announcement(
        &self,
        school_id: &str,
        collection: &str,
        user_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn get_announcements(
        &self,
        school_id: &str,
        collection: &str,
        user_id: &str,
    ) -> Result<JsonList, AppError>;
    async fn get_announcement(&self, school_id: &str, announcement_id: i32) -> Result<Option<Value>, AppError>;

    // Events
    async fn add_event_summary(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_event(&self, school_id: &str, event_id: i32) -> Result<Option<Value>, AppError>;
    async fn get_materials(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_spaces(&self, school_id: &str) -> Result<JsonList, AppError>;

    async fn get_space_details(
        &self,
        school_id: &str,
        space_id: &str,
    ) -> Result<Option<Value>, AppError>;

    async fn get_space_categories(&self, school_id: &str) -> Result<JsonList, AppError>;

    async fn create_space_category(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn delete_space_category(
        &self,
        school_id: &str,
        category_id: i32,
    ) -> Result<(), AppError>;

    async fn assign_space_materials(
        &self,
        school_id: &str,
        space_id: &str,
        materials: Vec<Value>,
    ) -> Result<(), AppError>;

    async fn assign_space_employees(
        &self,
        school_id: &str,
        space_id: &str,
        employee_ids: Vec<String>,
    ) -> Result<(), AppError>;

    async fn remove_space_employee(
        &self,
        school_id: &str,
        space_id: &str,
        employee_id: &str,
    ) -> Result<(), AppError>;

    async fn delete_announcement(&self, school_id: &str, announcement_id: i32) -> Result<(), AppError>;
    async fn delete_material(&self, school_id: &str, material_id: &str) -> Result<(), AppError>;
    async fn delete_event(&self, school_id: &str, event_id: i32) -> Result<(), AppError>;
}

#[async_trait]
pub trait OCRRepository: Send + Sync {
    async fn process_ocr(&self, file_path: &str, engine: &str) -> Result<Value, AppError>;

    async fn save_ocr_result(&self, school_id: &str, result_data: Value) -> Result<(), AppError>;
}

#[async_trait]
pub trait AwardRepository: Send + Sync {
    async fn add_award(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_awards(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<JsonList, AppError>;
    async fn get_award(&self, school_id: &str, award_id: i32) -> Result<Option<Value>, AppError>;
    async fn delete_award(&self, school_id: &str, award_id: i32) -> Result<(), AppError>;
}

#[async_trait]
pub trait ComplainRepository: Send + Sync {
    async fn add_complain(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_complains(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<JsonList, AppError>;
    async fn get_complain(&self, school_id: &str, complain_id: i32) -> Result<Option<Value>, AppError>;
    async fn delete_complain(&self, school_id: &str, complain_id: i32) -> Result<(), AppError>;
}

#[async_trait]
pub trait ReminderRepository: Send + Sync {
    async fn add_reminder(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_reminders(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_reminder(&self, school_id: &str, reminder_id: i32) -> Result<Option<Value>, AppError>;
    async fn delete_reminder(&self, school_id: &str, reminder_id: i32) -> Result<(), AppError>;
}

#[async_trait]
pub trait DocumentBoxRepository: Send + Sync {
    async fn add_document(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_documents(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<JsonList, AppError>;
    async fn get_document(&self, school_id: &str, document_id: i32) -> Result<Option<Value>, AppError>;
    async fn delete_document(&self, school_id: &str, document_id: i32) -> Result<(), AppError>;
}

#[async_trait]
pub trait SchoolRepository: Send + Sync {
    async fn get_school(&self, school_id: &str) -> Result<Option<Value>, AppError>;
}

#[async_trait]
pub trait ResponsibilityRepository: Send + Sync {
    async fn get_responsibilities(&self, school_id: &str) -> Result<JsonList, AppError>;

    async fn add_responsibility(&self, school_id: &str, data: Value) -> Result<Value, AppError>;

    async fn assign_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), AppError>;

    async fn remove_responsibility(
        &self,
        school_id: &str,
        employee_id: &str,
        responsibility_id: &str,
    ) -> Result<(), AppError>;

    async fn delete_responsibility(
        &self,
        school_id: &str,
        responsibility_id: &str,
    ) -> Result<(), AppError>;
    async fn get_employee_responsibilities(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<JsonList, AppError>;
}

#[async_trait]
pub trait TaskRepository: Send + Sync {
    async fn get_tasks(&self, school_id: &str) -> Result<JsonList, AppError>;
}

#[async_trait]
pub trait LeaveRepository: Send + Sync {
    async fn add_leave(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    async fn get_leaves(&self, school_id: &str) -> Result<JsonList, AppError>;
    async fn get_leave(&self, school_id: &str, leave_id: &str) -> Result<Option<Value>, AppError>;
    async fn update_leave_status(
        &self,
        school_id: &str,
        leave_id: &str,
        status: &str,
    ) -> Result<(), AppError>;
    async fn update_leave_duration(
        &self,
        school_id: &str,
        leave_id: &str,
        action: &str,
        days: i32,
    ) -> Result<(), AppError>;
    async fn delete_leave_application(&self, school_id: &str, leave_id: &str) -> Result<(), AppError>;
}

#[async_trait]
pub trait AnalyticsRepository: Send + Sync {
    async fn get_school_stats(&self, school_id: &str) -> Result<Value, AppError>;
    async fn get_attendance_summary(&self, school_id: &str, date: &str) -> Result<Value, AppError>;
    async fn get_pending_fees_by_period(
        &self,
        school_id: &str,
        months_overdue: i32,
    ) -> Result<JsonList, AppError>;
    async fn get_fee_summary(&self, school_id: &str) -> Result<Value, AppError>;
    async fn query_staff_analytics(&self, school_id: &str) -> Result<Value, AppError>;
}

#[async_trait]
pub trait AuditRepository: Send + Sync {
    async fn log_action(
        &self,
        school_id: &str,
        admin_id: &str,
        entity_type: &str,
        entity_id: &str,
        action_type: &str,
        changed_data: Value,
    ) -> Result<(), AppError>;
    async fn get_logs(
        &self,
        school_id: &str,
        entity_type: Option<&str>,
        limit: i64,
    ) -> Result<JsonList, AppError>;

    async fn get_log_by_id(
        &self,
        school_id: &str,
        log_id: i32,
    ) -> Result<Option<Value>, AppError>;
}

#[async_trait]
pub trait GlobalUserRepository: Send + Sync {
    async fn sync_user(&self, data: Value) -> Result<(), AppError>;
    async fn find_by_identifier(&self, ident: &str) -> Result<JsonList, AppError>;
    async fn sync_all_to_global(&self) -> Result<(), AppError>;
    async fn delete_user(&self, school_id: &str, user_id: &str, user_type: &str) -> Result<(), AppError>;
}
