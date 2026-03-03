use crate::AppState;
use chrono::{Utc, Duration};
use serde_json::json;
use sqlx::{PgPool, Row};
use std::time::Duration as StdDuration;
use bigdecimal::{BigDecimal, FromPrimitive};
use std::str::FromStr;

/// The Nightly Cashier Background Task
/// Runs automatically once every 24 hours to process SaaS billing.
pub async fn start_daily_billing_job(state: AppState) {
    let pool = state.db.pool.clone();
    
    // In production, you'd align this purely to 00:00:00 UTC. 
    // Here we just loop on a 24-hour interval from server start.
    let mut interval = tokio::time::interval(StdDuration::from_secs(24 * 60 * 60));

    tokio::spawn(async move {
        loop {
            interval.tick().await;
            println!("[Nightly Cashier] Waking up to process daily SaaS billing...");
            
            if let Err(e) = run_daily_metering(&pool).await {
                eprintln!("[Nightly Cashier] Failed to run daily metering: {}", e);
            }
        }
    });
}

async fn run_daily_metering(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    let now = Utc::now();
    
    // 0. Revert expired promos
    let expired_result = sqlx::query(
        "UPDATE schools 
         SET active_promo_id = NULL, promo_expires_at = NULL, per_student_rate = base_rate
         WHERE active_promo_id IS NOT NULL AND promo_expires_at < $1"
    )
    .bind(now)
    .execute(pool)
    .await?;
    
    if expired_result.rows_affected() > 0 {
        println!("[Nightly Cashier] Reverted {} schools to base rate due to expired promos.", expired_result.rows_affected());
    }

    // 1. Fetch all schools that are active (including those with warnings or suspensions to check if they recharged)
    let schools = sqlx::query(
        "SELECT school_id, per_student_rate, wallet_balance, trial_ends_at, billing_status, last_billing_date 
         FROM schools 
         WHERE status = 'active'"
    )
    .fetch_all(pool)
    .await?;

    for row in schools {
        let school_id: String = row.get("school_id");
        let per_student_rate: BigDecimal = row.get("per_student_rate");
        let current_balance: BigDecimal = row.get("wallet_balance");
        let trial_ends_at: Option<chrono::DateTime<Utc>> = row.try_get("trial_ends_at").ok().flatten();
        let billing_status: String = row.get("billing_status");
        let last_billing_date: Option<chrono::DateTime<Utc>> = row.try_get("last_billing_date").ok().flatten();

        // Count exact number of active students right away, as we need this to check block condition
        let count_row = sqlx::query(
            "SELECT COUNT(*) as count FROM students WHERE school_id = $1 AND status = 'active'"
        )
        .bind(&school_id)
        .fetch_one(pool)
        .await?;
        
        let active_students: i64 = count_row.get("count");
        let students_bd = BigDecimal::from_i64(active_students).unwrap_or(BigDecimal::from_str("0").unwrap());
        
        // This is what 30 days of service costs
        let required_balance = &per_student_rate * &students_bd;

        // Immediate unblock check: if they were suspended but now have enough balance
        if billing_status == "suspended" && current_balance >= required_balance {
            println!("[Nightly Cashier] School {} recharged and has enough balance. Unsuspending account.", school_id);
            sqlx::query(
                "UPDATE schools SET billing_status = 'active', is_blocked = false WHERE school_id = $1"
            )
            .bind(&school_id)
            .execute(pool)
            .await?;
            
            // Send unblock notification
            let notif = json!({
                "title": "Account Restored",
                "message": "Your wallet has sufficient credits. Your account has been restored.",
                "type": "success",
                "sentAt": now.to_rfc3339(),
                "dismissible": true
            });
            sqlx::query("UPDATE schools SET notification = $1 WHERE school_id = $2")
                .bind(notif)
                .bind(&school_id)
                .execute(pool)
                .await?;
        }

        // If suspended and still not enough balance, do not bill or do anything
        if billing_status == "suspended" && current_balance < required_balance {
            continue;
        }

        // Check Trial Status
        if let Some(end_date) = trial_ends_at {
            if now < end_date {
                println!("[Nightly Cashier] School {} is still on trial until {}", school_id, end_date);
                continue;
            }
        }

        let lbd = last_billing_date.unwrap_or(now);
        let days_since_last_billing = (now - lbd).num_days();

        // Perform Monthly Billing Processing if 30 days have passed
        if days_since_last_billing >= 30 {
            // Bill if active students > 0
            if required_balance > BigDecimal::from_str("0.00").unwrap() {
                println!("[Nightly Cashier] Monthly billing for School {}: {} students. Deduction: ₹{}", school_id, active_students, required_balance);

                let new_balance = &current_balance - &required_balance;
                let deduction_amount = -(&required_balance);
                
                let mut tx = pool.begin().await?;

                // Update Wallet and reset last_billing_date to NOW
                sqlx::query(
                    "UPDATE schools SET wallet_balance = $1, last_billing_date = CURRENT_TIMESTAMP WHERE school_id = $2"
                )
                .bind(&new_balance)
                .bind(&school_id)
                .execute(&mut *tx)
                .await?;

                // Write Ledger Record
                sqlx::query(
                    "INSERT INTO billing_ledger (school_id, amount, transaction_type, description, balance_after)
                     VALUES ($1, $2, 'monthly_usage', $3, $4)"
                )
                .bind(&school_id)
                .bind(&deduction_amount)
                .bind(format!("30-Day billing: {} active students", active_students))
                .bind(&new_balance)
                .execute(&mut *tx)
                .await?;

                // Suspend if they don't have enough for the NEXT 30 days
                // User said: "uske wallet mai 100 cradit hone jaruri ha nahi to vo login nahi kar sakta hai"
                if new_balance < required_balance {
                    println!("[Nightly Cashier] School {} balance dropped below required threshold. Suspending account.", school_id);
                    sqlx::query(
                        "UPDATE schools SET billing_status = 'suspended', is_blocked = true WHERE school_id = $1"
                    )
                    .bind(&school_id)
                    .execute(&mut *tx)
                    .await?;
                    
                    let notif = json!({
                        "title": "Payment Required",
                        "message": "Your wallet balance is insufficient for the current student count. Your account has been suspended.",
                        "type": "error",
                        "sentAt": now.to_rfc3339(),
                        "dismissible": false
                    });
                    sqlx::query("UPDATE schools SET notification = $1 WHERE school_id = $2")
                        .bind(notif)
                        .bind(&school_id)
                        .execute(&mut *tx)
                        .await?;
                }

                tx.commit().await?;
            } else {
                // Just reset billing date even if 0 charge so cycle continues
                sqlx::query("UPDATE schools SET last_billing_date = CURRENT_TIMESTAMP WHERE school_id = $1")
                    .bind(&school_id)
                    .execute(pool)
                    .await?;
            }
        }
    }

    Ok(())
}

