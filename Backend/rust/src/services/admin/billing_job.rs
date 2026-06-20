use crate::AppState;
use std::time::Duration as StdDuration;

/// The Nightly Cashier Background Task
/// Runs automatically once every 24 hours to process SaaS billing.
pub async fn start_daily_billing_job(state: AppState) {
    // In production, you'd align this purely to 00:00:00 UTC.
    // Here we just loop on a 24-hour interval from server start.
    let mut interval = tokio::time::interval(StdDuration::from_secs(24 * 60 * 60));

    tokio::spawn(async move {
        loop {
            interval.tick().await;
            println!("[Nightly Cashier] Waking up to process daily SaaS billing...");

            if let Err(e) = state.repos.school.run_daily_billing_metering().await {
                eprintln!("[Nightly Cashier] Failed to run daily metering: {}", e);
            }
        }
    });
}

