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
pub mod attendance_analytics;
pub mod leave;
pub mod fee;
pub mod auxiliary;
pub mod responsibility;
pub mod payroll;
pub mod notification;
pub mod recovery;
pub mod feedback;
pub mod plagiarism;
pub mod gradebook;
pub mod admin_automation;
pub mod content_generation;

// Re-export all traits for convenience
pub use setup::SetupService;
pub use student::StudentService;
pub use employee::EmployeeService;
pub use auth::AuthService;
pub use academic::AcademicService;
pub use resource::{AiService, AiConfigService, EmbeddingService, ResourceService};
pub use attendance::AttendanceService;
pub use attendance_analytics::AttendanceAnalyticsService;
pub use leave::LeaveService;
pub use fee::{FeeService, CouponService};
pub use auxiliary::{AwardService, ComplainService, ReminderService, DocumentBoxService, SchoolService};
pub use responsibility::ResponsibilityService;
pub use payroll::PayrollService;
pub use notification::NotificationService;
pub use recovery::RecoveryService;
pub use feedback::FeedbackServiceTrait;
pub use plagiarism::PlagiarismServiceTrait;
pub use gradebook::GradebookServiceTrait;
pub use admin_automation::AdminAutomationServiceTrait;
pub use content_generation::ContentGenerationService;
