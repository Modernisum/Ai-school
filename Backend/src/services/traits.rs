use async_trait::async_trait;
use serde_json::Value;

pub type AppError = Box<dyn std::error::Error + Send + Sync>;

#[async_trait]
pub trait StudentService: Send + Sync {
    async fn create_student(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn bulk_create_students(
        &self,
        school_id: &str,
        data: Vec<Value>,
    ) -> Result<Value, AppError>;
    async fn list_students(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;
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
    async fn delete_student(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<(), AppError>;
    async fn resequence_roll_numbers(
        &self,
        school_id: &str,
        class_name: &str,
    ) -> Result<(), AppError>;
    async fn list_student_ids(
        &self,
        school_id: &str,
    ) -> Result<Vec<String>, AppError>;
}

#[async_trait]
pub trait EmployeeService: Send + Sync {
    async fn create_employee(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn bulk_create_employees(
        &self,
        school_id: &str,
        data: Vec<Value>,
    ) -> Result<Value, AppError>;
    async fn list_employees(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;
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
    async fn delete_employee(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<(), AppError>;
}

#[async_trait]
pub trait AuthService: Send + Sync {
    async fn login(&self, data: Value) -> Result<Value, AppError>;
    async fn verify_token(&self, token: &str) -> Result<Value, AppError>;
    async fn logout(&self, token: &str) -> Result<(), AppError>;
    async fn set_security(
        &self,
        school_id: &str,
        question: &str,
        answer: &str,
    ) -> Result<(), AppError>;
    async fn forgot_password(
        &self,
        school_id: &str,
        answer: &str,
    ) -> Result<String, AppError>;
    async fn change_password(
        &self,
        school_id: &str,
        old_pass: &str,
        new_pass: &str,
    ) -> Result<(), AppError>;
    async fn change_id(
        &self,
        old_id: &str,
        pass: &str,
        new_id: &str,
    ) -> Result<String, AppError>;
}

#[async_trait]
pub trait AcademicService: Send + Sync {
    async fn create_class(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn list_classes(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;
    async fn update_class(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn add_stream(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn add_period(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<(), AppError>;

    async fn create_subject(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;

    async fn list_subjects(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;

    async fn create_exam(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;

    async fn list_exams(&self, school_id: &str)
        -> Result<Vec<Value>, AppError>;

    async fn create_topic(&self, data: Value) -> Result<Value, AppError>;

    async fn list_topics(&self) -> Result<Vec<Value>, AppError>;

    async fn list_class_ids(
        &self,
        school_id: &str,
    ) -> Result<Vec<String>, AppError>;
}

#[async_trait]
pub trait OperationsService: Send + Sync {
    async fn mark_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn mark_holiday(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn update_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn delete_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        date: &str,
    ) -> Result<(), AppError>;
    async fn list_attendance(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
    ) -> Result<Vec<Value>, AppError>;
    async fn create_school_fee(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn get_school_fees(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;
    async fn get_pending_fees(
        &self,
        school_id: &str,
        min_percentage: f64,
        class_name: Option<String>,
    ) -> Result<Vec<Value>, AppError>;
    async fn get_student_fee(
        &self,
        school_id: &str,
        student_id: &str,
    ) -> Result<Value, AppError>;
    async fn add_fee_to_student(
        &self,
        school_id: &str,
        student_id: &str,
        amount: f64,
        fee_id: &str,
    ) -> Result<Value, AppError>;
    async fn pay_fee(
        &self,
        school_id: &str,
        student_id: &str,
        amount: i64,
    ) -> Result<Value, AppError>;
    async fn apply_discount(
        &self,
        school_id: &str,
        student_id: &str,
        discount: f64,
    ) -> Result<Value, AppError>;
    async fn set_employee_salary_params(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn auto_close_month(
        &self,
        school_id: &str,
        employee_id: &str,
    ) -> Result<(), AppError>;
    async fn add_payment(
        &self,
        school_id: &str,
        employee_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
}

#[async_trait]
pub trait ResourceService: Send + Sync {
    async fn create_announcement(
        &self,
        school_id: &str,
        type_str: &str,
        user_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;

    async fn list_materials(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;

    async fn update_material(
        &self,
        school_id: &str,
        material_id: &str,
        data: Value,
    ) -> Result<(), AppError>;

    async fn create_event(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;

    async fn list_spaces(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;

    async fn create_material(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
}

#[async_trait]
pub trait SetupService: Send + Sync {
    async fn setup_school(&self, data: Value) -> Result<Value, AppError>;
    async fn get_setup(&self, school_id: &str) -> Result<Value, AppError>;
}

#[async_trait]
pub trait OCRService: Send + Sync {
    async fn perform_ocr(&self, file_path: &str) -> Result<Value, AppError>;
}

#[async_trait]
pub trait AwardService: Send + Sync {
    async fn create_award(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn list_awards(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;
}

#[async_trait]
pub trait ComplainService: Send + Sync {
    async fn create_complain(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn list_complains(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;
}

#[async_trait]
pub trait ReminderService: Send + Sync {
    async fn create_reminder(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn list_reminders(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;
}

#[async_trait]
pub trait DocumentBoxService: Send + Sync {
    async fn upload_document(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn list_documents(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;
}

#[async_trait]
pub trait SchoolService: Send + Sync {
    async fn get_school_details(
        &self,
        school_id: &str,
    ) -> Result<Value, AppError>;
}

#[async_trait]
pub trait ResponsibilityService: Send + Sync {
    async fn list_responsibilities(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;
}

#[async_trait]
pub trait TaskService: Send + Sync {
    async fn list_tasks(&self, school_id: &str)
        -> Result<Vec<Value>, AppError>;
}

