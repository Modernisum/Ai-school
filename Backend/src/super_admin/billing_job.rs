use crate::AppState;
use chrono::{Utc, Duration};
use serde_json::json;
use sqlx::{PgPool, Row};
use std::time::Duration as StdDuration;

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
    // 1. Fetch all schools that are not suspended
    let schools = sqlx::query(
        "SELECT school_id, per_student_rate, wallet_balance, trial_ends_at, billing_status 
         FROM schools 
         WHERE billing_status != 'suspended' AND status = 'active'"
    )
    .fetch_all(pool)
    .await?;

    let now = Utc::now();

    for row in schools {
        let school_id: String = row.get("school_id");
        let per_student_rate: bigdecimal::BigDecimal = row.get("per_student_rate");
        let mut current_balance: bigdecimal::BigDecimal = row.get("wallet_balance");
        let trial_ends_at: Option<chrono::DateTime<Utc>> = row.try_get("trial_ends_at").ok().flatten();
        let billing_status: String = row.get("billing_status");

        // 2. Check Trial Status
        if let Some(end_date) = trial_ends_at {
            if now < end_date {
                println!("[Nightly Cashier] School {} is still on trial until {}", school_id, end_date);
                continue;
            }
        }

        // 3. Count exact number of active students
        let count_row = sqlx::query(
            "SELECT COUNT(*) as count FROM students WHERE school_id = $1 AND status = 'active'"
        )
        .bind(&school_id)
        .fetch_one(pool)
        .await?;
        
        let active_students: i64 = count_row.get("count");
        
        // 4. Calculate exact daily charge ((Rate * Students) / 30)
        use bigdecimal::{BigDecimal, FromPrimitive};
        use std::str::FromStr;
        
        let students_bd = BigDecimal::from_i64(active_students).unwrap_or(BigDecimal::from_str("0").unwrap());
        let days_in_month = BigDecimal::from_str("30.0").unwrap();
        
        let daily_charge = (per_student_rate * students_bd) / days_in_month;
        let mut final_charge = daily_charge.round(2);
        
        // Skip if 0 students
        if final_charge == BigDecimal::from_str("0.00").unwrap() {
            continue;
        }

        println!("[Nightly Cashier] Metering School {}: {} students. Deduction: ₹{}", school_id, active_students, final_charge);

        // 5. Deduct from wallet & record transaction
        let new_balance = &current_balance - &final_charge;
        
        // Ledger entry expects negative number for deduction
        let deduction_amount = -(&final_charge);
        
        let mut tx = pool.begin().await?;

        // Update Wallet
        sqlx::query(
            "UPDATE schools SET wallet_balance = $1 WHERE school_id = $2"
        )
        .bind(&new_balance)
        .bind(&school_id)
        .execute(&mut *tx)
        .await?;

        // Write Immutable Ledger Record
        sqlx::query(
            "INSERT INTO billing_ledger (school_id, amount, transaction_type, description, balance_after)
             VALUES ($1, $2, 'nightly_usage', $3, $4)"
        )
        .bind(&school_id)
        .bind(&deduction_amount)
        .bind(format!("Daily usage: {} active students", active_students))
        .bind(&new_balance)
        .execute(&mut *tx)
        .await?;

        // 6. Threshold Checks (Warnings & Suspension)
        // If balance falls below 0, suspend them immediately.
        if new_balance <= BigDecimal::from_str("0.00").unwrap() {
            println!("[Nightly Cashier] School {} balance reached zero. Suspending account.", school_id);
            sqlx::query(
                "UPDATE schools SET billing_status = 'suspended', is_blocked = true WHERE school_id = $1"
            )
            .bind(&school_id)
            .execute(&mut *tx)
            .await?;
            
            // Set alert notification for the school
            let notif = json!({
                "title": "Payment Required",
                "message": "Your wallet balance is depleted. Your account has been suspended. Please contact the Super Admin to add funds.",
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
        // If balance is < 3 times the daily charge (meaning ~3 days of runway left)
        else {
            let threshold = &final_charge * BigDecimal::from_str("3.0").unwrap();
            if new_balance < threshold && billing_status != "warning" {
                println!("[Nightly Cashier] School {} has low balance warning (< 3 days).", school_id);
                sqlx::query("UPDATE schools SET billing_status = 'warning' WHERE school_id = $1")
                    .bind(&school_id)
                    .execute(&mut *tx)
                    .await?;
                
                let warning_notif = json!({
                    "title": "Low Balance Warning",
                    "message": format!("Your prepaid wallet is running low. Your current runway is less than 3 days based on {} active students. Please recharge soon.", active_students),
                    "type": "warning",
                    "sentAt": now.to_rfc3339(),
                    "dismissible": true
                });
                
                sqlx::query("UPDATE schools SET notification = $1 WHERE school_id = $2")
                    .bind(warning_notif)
                    .bind(&school_id)
                    .execute(&mut *tx)
                    .await?;
            }
        }

        tx.commit().await?;
    }

    Ok(())
}
