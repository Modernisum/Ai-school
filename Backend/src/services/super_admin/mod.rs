pub struct AdminService {
    pub db: std::sync::Arc<crate::db::DbClient>,
}

pub mod auth;
pub mod school;
pub mod promo;
pub mod billing;
pub mod support;
pub mod system;
pub mod billing_job;

pub use billing_job::start_daily_billing_job;
