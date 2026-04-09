pub use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

// Re-export all trait modules
pub mod setup;
pub mod student;
pub mod employee;
pub mod auth;
pub mod academic;
pub mod resource;
pub mod attendance;
pub mod leave;
pub mod fee;
pub mod auxiliary;
pub mod responsibility;
pub mod task;
pub mod payroll;
pub mod operations;
pub mod recovery;

// Re-export all traits for convenience
pub use setup::SetupService;
pub use student::StudentService;
pub use employee::EmployeeService;
pub use auth::AuthService;
pub use academic::AcademicService;
pub use resource::{OCRService, AiService, ResourceService};
pub use attendance::AttendanceService;
pub use leave::LeaveService;
pub use fee::{FeeService, CouponService};
pub use auxiliary::{AwardService, ComplainService, ReminderService, DocumentBoxService, SchoolService};
pub use responsibility::ResponsibilityService;
pub use task::TaskService;
pub use payroll::PayrollService;
pub use operations::OperationsService;
pub use recovery::RecoveryService;
