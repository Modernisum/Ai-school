use async_trait::async_trait;
use serde_json::Value;

pub type AppError = Box<dyn std::error::Error + Send + Sync>;
pub type JsonList = Vec<serde_json::Value>;

// Re-export all trait modules
pub mod auth;
pub mod student;
pub mod employee;
pub mod academic;
pub mod attendance;
pub mod fee;
pub mod coupon;
pub mod payroll;
pub mod transaction;
pub mod resource;
pub mod ocr;
pub mod auxiliary;
pub mod responsibility;
pub mod task;
pub mod leave;
pub mod analytics;
pub mod audit;
pub mod global_user;
pub mod storage;
pub mod grading;

// Re-export all traits for convenience
pub use auth::AuthRepository;
pub use student::StudentRepository;
pub use employee::EmployeeRepository;
pub use academic::AcademicRepository;
pub use attendance::AttendanceRepository;
pub use fee::FeeRepository;
pub use coupon::CouponRepository;
pub use payroll::PayrollRepository;
pub use transaction::TransactionRepository;
pub use resource::ResourceRepository;
pub use ocr::OCRRepository;
pub use auxiliary::{AwardRepository, ComplainRepository, ReminderRepository, DocumentBoxRepository, SchoolRepository};
pub use responsibility::ResponsibilityRepository;
pub use task::TaskRepository;
pub use leave::LeaveRepository;
pub use analytics::AnalyticsRepository;
pub use audit::AuditRepository;
pub use global_user::GlobalUserRepository;
pub use storage::StorageRepository;
pub use grading::GradingRepository;
