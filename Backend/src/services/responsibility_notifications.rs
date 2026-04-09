// Responsibility Notifications Module - Re-exports for backward compatibility
pub mod notifications {
    pub use crate::services::responsibility::notifications::*;
}

pub use notifications::ResponsibilityNotificationService;
pub use notifications::ResponsibilityNotificationType;
