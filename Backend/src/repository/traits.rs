use async_trait::async_trait;
use serde_json::Value;

pub type AppError = Box<dyn std::error::Error + Send + Sync>;

#[async_trait]
pub trait AuthRepository: Send + Sync {
    async fn create_school(&self, data: Value) -> Result<(), AppError>;
    async fn get_auth_by_id(&self, id: &str)
        -> Result<Option<Value>, AppError>;
    async fn update_auth(&self, id: &str, data: Value) -> Result<(), AppError>;
    async fn save_token(
        &self,
        token_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn get_token(
        &self,
        token_id: &str,
    ) -> Result<Option<Value>, AppError>;
    async fn delete_token(&self, token_id: &str) -> Result<(), AppError>;
    async fn revoke_token(&self, token_id: &str) -> Result<(), AppError>;
    async fn cleanup_expired_tokens(&self) -> Result<usize, AppError>;
    async fn add_auth_log(
        &self,
        id: &str,
        action: &str,
        details: Value,
    ) -> Result<(), AppError>;
    async fn change_school_id(
        &self,
        old_id: &str,
        new_id: &str,
    ) -> Result<(), AppError>;
    async fn generate_school_code(&self) -> Result<String, AppError>;
}

#[async_trait]
pub trait StudentRepository: Send + Sync {
    async fn add_student(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn get_students(
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
    async fn get_next_roll_number(
        &self,
        school_id: &str,
        class_name: &str,
    ) -> Result<i32, AppError>;
    async fn generate_student_id(&self) -> Result<String, AppError>;
}

#[async_trait]
pub trait EmployeeRepository: Send + Sync {
    async fn add_employee(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn get_employees(
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
    async fn generate_employee_id(&self) -> Result<String, AppError>;
}

#[async_trait]
pub trait AcademicRepository: Send + Sync {
    // Classes
    async fn add_class(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn get_classes(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;
    async fn get_class(
        &self,
        school_id: &str,
        class_id: &str,
    ) -> Result<Option<Value>, AppError>;
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
    async fn add_subject(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn get_subjects(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;

    // Exams
    async fn add_exam(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn get_exams(&self, school_id: &str) -> Result<Vec<Value>, AppError>;
    async fn add_student_exam(
        &self,
        school_id: &str,
        student_id: &str,
        data: Value,
    ) -> Result<(), AppError>;

    // Topics
    async fn add_topic(&self, data: Value) -> Result<Value, AppError>;
    async fn get_topics(&self) -> Result<Vec<Value>, AppError>;

    // Periods
    async fn add_period(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn get_periods_count(
        &self,
        school_id: &str,
        class_id: &str,
    ) -> Result<i64, AppError>;

    // Streams
    async fn add_stream(
        &self,
        school_id: &str,
        class_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
}

#[async_trait]
pub trait OperationsRepository: Send + Sync {
    // Attendance
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
    ) -> Result<Vec<Value>, AppError>;
    async fn add_attendance_history(
        &self,
        school_id: &str,
        role: &str,
        user_id: &str,
        action: &str,
        data: Value,
    ) -> Result<(), AppError>;

    // Fees (Global Fee Types)
    async fn add_school_fee(
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

    // Employee Payroll
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
pub trait ResourceRepository: Send + Sync {
    // Infrastructure
    async fn add_space(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn add_item(
        &self,
        school_id: &str,
        space_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
    async fn add_material(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<(), AppError>;
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
    ) -> Result<Vec<Value>, AppError>;

    // Events
    async fn add_event_summary(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn get_materials(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;
    async fn get_spaces(&self, school_id: &str)
        -> Result<Vec<Value>, AppError>;
}

#[async_trait]
pub trait OCRRepository: Send + Sync {
    async fn process_ocr(
        &self,
        file_path: &str,
        engine: &str,
    ) -> Result<Value, AppError>;

    async fn save_ocr_result(
        &self,
        school_id: &str,
        result_data: Value,
    ) -> Result<(), AppError>;
}

#[async_trait]
pub trait AwardRepository: Send + Sync {
    async fn add_award(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn get_awards(&self, school_id: &str)
        -> Result<Vec<Value>, AppError>;
}

#[async_trait]
pub trait ComplainRepository: Send + Sync {
    async fn add_complain(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn get_complains(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;
}

#[async_trait]
pub trait ReminderRepository: Send + Sync {
    async fn add_reminder(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn get_reminders(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;
}

#[async_trait]
pub trait DocumentBoxRepository: Send + Sync {
    async fn add_document(
        &self,
        school_id: &str,
        data: Value,
    ) -> Result<Value, AppError>;
    async fn get_documents(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;
}

#[async_trait]
pub trait SchoolRepository: Send + Sync {
    async fn get_school(
        &self,
        school_id: &str,
    ) -> Result<Option<Value>, AppError>;
}

#[async_trait]
pub trait ResponsibilityRepository: Send + Sync {
    async fn get_responsibilities(
        &self,
        school_id: &str,
    ) -> Result<Vec<Value>, AppError>;
}

#[async_trait]
pub trait TaskRepository: Send + Sync {
    async fn get_tasks(&self, school_id: &str) -> Result<Vec<Value>, AppError>;
}

