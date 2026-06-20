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

pub mod auxiliary;
pub mod responsibility;
pub mod task;
pub mod leave;
pub mod analytics;
pub mod audit;
pub mod global_user;
pub mod notification;
pub mod storage;
pub mod grading;
pub mod config;
pub mod geo;
pub mod api_key;
pub mod cms;
pub mod communication;
pub mod system_log;
pub mod super_admin;
pub mod admin_automation;
pub mod developer_access;
pub mod ai;

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

pub use auxiliary::{AwardRepository, ComplainRepository, ReminderRepository, DocumentBoxRepository, SchoolRepository, NotificationPreferenceRepository, SchoolSetupPayload};
pub use responsibility::ResponsibilityRepository;
pub use task::TaskRepository;
pub use leave::LeaveRepository;
pub use analytics::AnalyticsRepository;
pub use audit::AuditRepository;
pub use global_user::GlobalUserRepository;
pub use notification::NotificationRepository;
pub use storage::StorageRepository;
pub use grading::GradingRepository;
pub use config::ConfigRepository;
pub use geo::GeoRepository;
pub use api_key::ApiKeyRepository;
pub use cms::CmsRepository;
pub use communication::CommunicationRepository;
pub use system_log::SystemLogRepository;
pub use super_admin::SuperAdminRepository;
pub use admin_automation::AdminAutomationRepository;
pub use developer_access::DeveloperAccessRepository;
pub use ai::{AiRepository, SchoolAiConfig};

