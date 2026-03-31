use async_trait::async_trait;
use serde_json::Value;
pub use crate::error::{AppError, AppResult};

#[async_trait]
pub trait SetupService: Send + Sync {
    async fn setup_school(&self, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn get_setup(&self, school_id: &str) -> AppResult<Value>;
}

#[async_trait]
pub trait StudentService: Send + Sync {
    async fn create_student(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn bulk_create_students(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Vec<Value>,
    ) -> AppResult<Value>;
    async fn list_students(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn list_students_by_class(
        &self,
        school_id: &str,
        class_name: &str,
        section: Option<&str>,
    ) -> AppResult<Vec<Value>>;
    async fn get_student(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> AppResult<Option<Value>>;
    async fn update_student(
        &self,
        school_id: &str,
        student_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()>;
    async fn delete_student(&self, school_id: &str, student_id: &str, admin_id: &str) -> AppResult<()>;
    async fn resequence_roll_numbers(
        &self,
        school_id: &str,
        class_name: &str,
    ) -> AppResult<()>;
    async fn list_student_ids(&self, school_id: &str) -> AppResult<Vec<String>>;
    async fn validate_student_data(&self, school_id: &str, data: Value) -> AppResult<()>;
}

#[async_trait]
pub trait EmployeeService: Send + Sync {
    async fn create_employee(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn bulk_create_employees(
        &self,
        school_id: &str,
        admin_id: &str,
        data: Vec<Value>,
    ) -> AppResult<Value>;
    async fn list_employees(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn get_employee(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> AppResult<Option<Value>>;
    async fn update_employee(
        &self,
        school_id: &str,
        employee_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()>;
    async fn delete_employee(&self, school_id: &str, employee_id: &str, admin_id: &str) -> AppResult<()>;
    async fn validate_employee_data(&self, school_id: &str, data: Value) -> AppResult<()>;
}

#[async_trait]
pub trait AuthService: Send + Sync {
    async fn login(&self, data: Value) -> AppResult<Value>;
    async fn login_global(&self, ident: &str, app_type: &str) -> AppResult<Value>;
    async fn verify_otp_global(&self, ident: &str, otp: &str) -> AppResult<Value>;
    async fn verify_token(&self, token: &str) -> AppResult<Value>;
    async fn logout(&self, token: &str) -> AppResult<()>;
    async fn set_security(
        &self,
        school_id: &str,
        question: &str,
        answer: &str,
    ) -> AppResult<()>;
    async fn forgot_password(&self, school_id: &str, answer: &str) -> AppResult<String>;
    async fn change_password(
        &self,
        school_id: &str,
        old_pass: &str,
        new_pass: &str,
    ) -> AppResult<()>;
    async fn change_id(&self, old_id: &str, pass: &str, new_id: &str) -> AppResult<String>;
    async fn sync_all(&self) -> AppResult<()>;
}

#[async_trait]
pub trait AcademicService: Send + Sync {
    async fn create_class(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn list_classes(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn update_class(
        &self,
        school_id: &str,
        class_id: &str,
        admin_id: &str,
        data: Value,
    ) -> AppResult<()>;
    async fn delete_class(&self, school_id: &str, class_id: &str, admin_id: &str) -> AppResult<()>;
    async fn generate_timetable(&self, school_id: &str, class_name: &str) -> AppResult<Value>;
    async fn auto_generate_classes(&self, school_id: &str, admin_id: &str) -> AppResult<()>;
    async fn create_exam(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn list_exams(&self, school_id: &str, student_id: String) -> AppResult<Vec<Value>>;
    async fn create_subject(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn list_subjects(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn create_topic(&self, data: Value) -> AppResult<Value>;
}



#[async_trait]
pub trait OCRService: Send + Sync {
    async fn perform_ocr(&self, image_url: &str) -> AppResult<Value>;
}

#[async_trait]
pub trait AiService: Send + Sync {
    async fn post_query(&self, school_id: &str, query: Value) -> AppResult<Value>;
    async fn query_ai(&self, school_id: &str, user_query: &str) -> AppResult<Value>;
    async fn generate_embedding(&self, text: &str) -> AppResult<Vec<f32>>;
}

#[async_trait]
pub trait AwardService: Send + Sync {
    async fn create_award(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn list_awards(&self, school_id: &str, student_id: Option<&str>) -> AppResult<Vec<Value>>;
    async fn delete_award(&self, school_id: &str, admin_id: &str, award_id: i32) -> AppResult<()>;
}

#[async_trait]
pub trait ComplainService: Send + Sync {
    async fn create_complain(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn list_complains(&self, school_id: &str, student_id: Option<&str>) -> AppResult<Vec<Value>>;
    async fn delete_complain(&self, school_id: &str, admin_id: &str, complain_id: i32) -> AppResult<()>;
}

#[async_trait]
pub trait ReminderService: Send + Sync {
    async fn create_reminder(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn list_reminders(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn delete_reminder(&self, school_id: &str, admin_id: &str, reminder_id: i32) -> AppResult<()>;
}

#[async_trait]
pub trait DocumentBoxService: Send + Sync {
    async fn upload_document(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn list_documents(&self, school_id: &str, student_id: Option<&str>) -> AppResult<Vec<Value>>;
    async fn delete_document(&self, school_id: &str, admin_id: &str, document_id: i32) -> AppResult<()>;
}

#[async_trait]
pub trait SchoolService: Send + Sync {
    async fn get_school_details(&self, school_id: &str) -> AppResult<Value>;
    async fn update_school(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<()>;
}

#[async_trait]
pub trait ResponsibilityService: Send + Sync {
    async fn list_responsibilities(&self, school_id: &str, employee_type: Option<String>) -> AppResult<Vec<Value>>;
    async fn create_responsibility(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn assign_responsibility(&self, school_id: &str, employee_id: &str, responsibility_id: &str, admin_id: &str) -> AppResult<()>;
    async fn bulk_assign_responsibilities(&self, school_id: &str, employee_ids: Vec<String>, responsibility_ids: Vec<String>, space_ids: Vec<String>, admin_id: &str) -> AppResult<()>;
    async fn remove_responsibility(&self, school_id: &str, employee_id: &str, responsibility_id: &str, admin_id: &str) -> AppResult<()>;
    async fn list_employee_responsibilities(&self, school_id: &str, employee_id: &str) -> AppResult<Value>;
    async fn sync_subject_roles(&self, school_id: &str, admin_id: &str) -> AppResult<()>;
}

#[async_trait]
pub trait TaskService: Send + Sync {
    async fn list_tasks(&self, school_id: &str) -> AppResult<Vec<Value>>;
}

#[async_trait]
pub trait LeaveService: Send + Sync {
    async fn create_leave(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn get_leaves(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn list_leaves(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn approve_leave(&self, school_id: &str, admin_id: &str, leave_id: i32) -> AppResult<()>;
    async fn reject_leave(&self, school_id: &str, admin_id: &str, leave_id: i32) -> AppResult<()>;
    async fn update_leave_status(&self, school_id: &str, admin_id: &str, leave_id: &str, status: &str) -> AppResult<()>;
    async fn update_leave_duration(&self, school_id: &str, admin_id: &str, leave_id: &str, action: &str, days: i32) -> AppResult<()>;
    async fn extend_leave(&self, school_id: &str, admin_id: &str, leave_id: i32, days: i32) -> AppResult<()>;
    async fn reduce_leave(&self, school_id: &str, admin_id: &str, leave_id: i32, days: i32) -> AppResult<()>;
    async fn download_leave_pdf(&self, school_id: &str, leave_id: i32) -> AppResult<Vec<u8>>;
    async fn get_proxy_suggestions(&self, school_id: &str, date: &str, period: &str, subject: Option<&str>) -> AppResult<Value>;
}

#[async_trait]
pub trait AttendanceService: Send + Sync {
    async fn mark_attendance(&self, school_id: &str, role: &str, user_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn mark_holiday(&self, school_id: &str, role: &str, user_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn update_attendance(&self, school_id: &str, role: &str, user_id: &str, date: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn delete_attendance(&self, school_id: &str, role: &str, user_id: &str, date: &str, admin_id: &str) -> AppResult<()>;
    async fn list_attendance(&self, school_id: &str, role: &str, user_id: &str) -> AppResult<Vec<Value>>;
    async fn list_attendance_by_date(&self, school_id: &str, date: &str) -> AppResult<Vec<String>>;
    
    // School-level Holidays
    async fn list_school_holidays(&self, school_id: &str, month: Option<i32>, year: Option<i32>) -> AppResult<Vec<Value>>;
    async fn get_holiday_detail(&self, school_id: &str, holiday_id: &str) -> AppResult<Value>;
    async fn create_school_holiday(&self, school_id: &str, data: Value) -> AppResult<Value>;
    async fn delete_school_holiday(&self, school_id: &str, holiday_id: &str) -> AppResult<()>;
    async fn check_school_holiday(&self, school_id: &str, date: &str) -> AppResult<Value>;
}

#[async_trait]
pub trait FeeService: Send + Sync {
    async fn create_school_fee(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn get_school_fees(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn get_pending_fees(&self, school_id: &str, min_percentage: f64, class_name: Option<String>) -> AppResult<Vec<Value>>;
    async fn get_student_fee(&self, school_id: &str, student_id: &str) -> AppResult<Value>;
    async fn add_fee_to_student(&self, school_id: &str, student_id: &str, amount: f64, fee_id: &str, admin_id: &str) -> AppResult<Value>;
    async fn apply_discount(&self, school_id: &str, student_id: &str, discount: f64, admin_id: &str) -> AppResult<Value>;
    async fn pay_fee(&self, school_id: &str, student_id: &str, admin_id: &str, payload: Value) -> AppResult<Value>;
    async fn create_custom_fee(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn list_custom_fees(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn remove_custom_fee(&self, school_id: &str, fee_id: &str, admin_id: &str) -> AppResult<()>;
    async fn apply_custom_fee(&self, school_id: &str, fee_id: &str, admin_id: &str) -> AppResult<Value>;
    async fn generate_fee_reminder(&self, school_id: &str, student_id: &str) -> AppResult<Value>;
}

#[async_trait]
pub trait PayrollService: Send + Sync {
    async fn get_salary_breakdown(&self, school_id: &str, employee_id: &str) -> AppResult<Value>;
    async fn add_bonus(&self, school_id: &str, employee_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn add_aid(&self, school_id: &str, employee_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn auto_close_month(&self, school_id: &str, employee_id: &str, admin_id: &str) -> AppResult<()>;
    async fn add_payment(&self, school_id: &str, employee_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn set_employee_salary_params(&self, school_id: &str, employee_id: &str, admin_id: &str, data: Value) -> AppResult<()>;
}

#[async_trait]
pub trait CouponService: Send + Sync {
    async fn create_coupon(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn list_coupons(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn remove_coupon(&self, school_id: &str, coupon_id: &str, admin_id: &str) -> AppResult<()>;
    async fn toggle_block_coupon(&self, school_id: &str, coupon_id: &str, admin_id: &str, blocked: bool) -> AppResult<()>;
    async fn validate_coupon(&self, school_id: &str, coupon_name: &str) -> AppResult<Option<Value>>;
    async fn use_coupon(&self, school_id: &str, coupon_id: &str, student_id: &str, admin_id: &str, discount: f64) -> AppResult<Value>;
}

#[async_trait]
pub trait OperationsService: Send + Sync {
    async fn get_student_profile(&self, school_id: &str, student_id: &str) -> AppResult<Option<Value>>;
}

#[async_trait]
pub trait RecoveryService: Send + Sync {
    async fn list_student_history(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn undo_student_change(&self, school_id: &str, id: i32) -> AppResult<()>;
    async fn list_audit_logs(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn undo_audit_log(&self, school_id: &str, log_id: i32) -> AppResult<()>;
}

#[async_trait]
pub trait ResourceService: Send + Sync {
    // Announcements
    async fn create_announcement(&self, school_id: &str, admin_id: &str, type_str: &str, user_id: &str, data: Value) -> AppResult<Value>;
    async fn delete_announcement(&self, school_id: &str, admin_id: &str, announcement_id: i32) -> AppResult<()>;
    
    // Materials
    async fn create_material(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn list_materials(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn get_material(&self, school_id: &str, material_id: &str) -> AppResult<Option<Value>>;
    async fn update_material(&self, school_id: &str, admin_id: &str, material_id: &str, data: Value) -> AppResult<()>;
    async fn delete_material(&self, school_id: &str, admin_id: &str, material_id: &str) -> AppResult<()>;
    
    // Events
    async fn create_event(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn delete_event(&self, school_id: &str, admin_id: &str, event_id: i32) -> AppResult<()>;
    
    // Spaces
    async fn create_space(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn list_spaces(&self, school_id: &str, category_id: Option<i32>) -> AppResult<Vec<Value>>;
    async fn update_space(&self, school_id: &str, admin_id: &str, space_id: &str, data: Value) -> AppResult<()>;
    async fn delete_space(&self, school_id: &str, admin_id: &str, space_id: &str) -> AppResult<()>;
    async fn get_space_details(&self, school_id: &str, space_id: &str) -> AppResult<Option<Value>>;
    
    // Space Categories
    async fn get_space_categories(&self, school_id: &str) -> AppResult<Vec<Value>>;
    async fn create_space_category(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    async fn delete_space_category(&self, school_id: &str, admin_id: &str, category_id: i32) -> AppResult<()>;
    
    // Assignments
    async fn assign_space_materials(&self, school_id: &str, admin_id: &str, space_id: &str, materials: Vec<Value>) -> AppResult<()>;
    async fn assign_space_employees(&self, school_id: &str, admin_id: &str, space_id: &str, employee_ids: Vec<String>) -> AppResult<()>;
    async fn remove_space_employee(&self, school_id: &str, admin_id: &str, space_id: &str, employee_id: &str) -> AppResult<()>;

    async fn get_materials_dashboard(&self, school_id: &str) -> AppResult<Value>;
    async fn get_material_history(&self, school_id: &str, material_id: &str) -> AppResult<Vec<Value>>;
}
