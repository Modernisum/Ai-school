use serde_json::json;
use sqlx::{Pool, Postgres, Row};

pub struct AnalyticsEngine {
    pub pool: Pool<Postgres>,
}

impl AnalyticsEngine {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }

    /// Evaluates all students in a school and updates their risk_profiles
    pub async fn analyze_student_risks(&self, school_id: &str) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        // 1. Fetch Attendance, Academic, and Fee Stats in one go
        let risk_sql = r#"
            WITH attendance_stats AS (
                SELECT user_id as student_id, 
                       COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absences,
                       COUNT(*) as total_days
                FROM attendance
                WHERE school_id = $1 AND role = 'student'
                GROUP BY user_id
            ),
            exam_stats AS (
                SELECT target_id as student_id,
                       COUNT(*) as failing_exams
                FROM audit_logs
                WHERE school_id = $1 
                  AND target_type = 'exam' 
                  AND (data->>'status' = 'failed' OR (data->>'percentage')::float < 40.0)
                GROUP BY target_id
            ),
            fee_stats AS (
                SELECT 
                    s.student_id,
                    COALESCE(sf.total_fees, 0) as legacy_total,
                    COALESCE(sf.pending_amount, 0) as legacy_pending,
                    COALESCE(SUM(cfr.amount), 0) as custom_total,
                    COALESCE(SUM(cfr.paid_amount), 0) as custom_paid,
                    COUNT(CASE WHEN f.due_date < CURRENT_DATE AND cfr.status = 'pending' THEN 1 END) as overdue_custom_count
                FROM students s
                LEFT JOIN student_fees sf ON s.school_id = sf.school_id AND s.student_id = sf.student_id
                LEFT JOIN custom_fee_records cfr ON s.school_id = cfr.school_id AND s.student_id = cfr.student_id
                LEFT JOIN custom_fees f ON cfr.school_id = f.school_id AND cfr.fee_id = f.fee_id
                WHERE s.school_id = $1
                GROUP BY s.student_id, sf.total_fees, sf.pending_amount
            )
            SELECT 
                s.student_id,
                COALESCE(a.absences, 0) as absences,
                COALESCE(a.total_days, 1) as total_days,
                COALESCE(e.failing_exams, 0) as failing_exams,
                COALESCE(fs.legacy_total, 0) as legacy_total,
                COALESCE(fs.legacy_pending, 0) as legacy_pending,
                COALESCE(fs.custom_total, 0) as custom_total,
                COALESCE(fs.custom_paid, 0) as custom_paid,
                COALESCE(fs.overdue_custom_count, 0) as overdue_custom_count
            FROM students s
            LEFT JOIN attendance_stats a ON s.student_id = a.student_id
            LEFT JOIN exam_stats e ON s.student_id = e.student_id
            LEFT JOIN fee_stats fs ON s.student_id = fs.student_id
            WHERE s.school_id = $1
        "#;

        let risk_data = sqlx::query(risk_sql).bind(school_id).fetch_all(&mut *tx).await?;

        for row in risk_data {
            let student_id: String = row.get("student_id");
            let absences: i64 = row.get("absences");
            let total_days: i64 = row.get("total_days");
            let failing_exams: i64 = row.get("failing_exams");
            
            use bigdecimal::{BigDecimal, ToPrimitive};
            let legacy_total: BigDecimal = row.get("legacy_total");
            let legacy_pending: BigDecimal = row.get("legacy_pending");
            let custom_total: BigDecimal = row.get("custom_total");
            let custom_paid: BigDecimal = row.get("custom_paid");
            let overdue_custom_count: i64 = row.get("overdue_custom_count");

            let mut risk_score = 0;
            let mut factors = Vec::new();

            // --- A. Attendance Risk ---
            let attendance_rate = if total_days > 0 {
                1.0 - (absences as f64 / total_days as f64)
            } else {
                1.0
            };
            if attendance_rate < 0.75 {
                risk_score += 30;
                factors.push(format!("Low attendance: {:.1}%", attendance_rate * 100.0));
            }

            // --- B. Academic Risk ---
            if failing_exams > 0 {
                risk_score += (failing_exams * 15).min(45) as i32;
                factors.push(format!("Failing {} subjects", failing_exams));
            }

            // --- C. Financial Risk (Fee Defaulter) ---
            let total_due = legacy_total + custom_total.clone();
            let total_pending = legacy_pending + (&custom_total - &custom_paid);
            
            let pending_percent = if total_due > BigDecimal::from(0) {
                (&total_pending * BigDecimal::from(100) / total_due).to_f64().unwrap_or(0.0)
            } else {
                0.0
            };

            if pending_percent > 50.0 {
                risk_score += 40;
                factors.push(format!("Critical fee arrears: {:.1}% pending", pending_percent));
            } else if pending_percent > 20.0 {
                risk_score += 20;
                factors.push(format!("Significant fee arrears: {:.1}% pending", pending_percent));
            }

            if overdue_custom_count > 0 {
                risk_score += 20;
                factors.push(format!("Overdue custom fees: {} items", overdue_custom_count));
            }

            let factors_json = json!(factors);
            let final_score = risk_score.min(100);

            sqlx::query(
                "INSERT INTO student_risk_profiles (school_id, student_id, risk_score, risk_factors)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (school_id, student_id) 
                 DO UPDATE SET risk_score = $3, risk_factors = $4, last_calculated = CURRENT_TIMESTAMP"
            )
            .bind(school_id)
            .bind(student_id)
            .bind(final_score)
            .bind(factors_json)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(())
    }

    /// Evaluates school health and flags "pre-churn" accounts for the super-admin
    pub async fn analyze_school_churn(&self) -> Result<(), sqlx::Error> {
        let schools = sqlx::query("SELECT school_id FROM schools WHERE status = 'active'")
            .fetch_all(&self.pool)
            .await?;

        for school_row in schools {
            let school_id: String = school_row.get("school_id");
            let mut risk_score = 0;
            let mut factors = Vec::new();

            let logins_row = sqlx::query(
                "SELECT COUNT(*) as count FROM auth_logs WHERE school_id = $1 AND created_at > NOW() - INTERVAL '14 days'"
            )
            .bind(&school_id)
            .fetch_one(&self.pool)
            .await?;

            let login_count: i64 = logins_row.get("count");

            if login_count < 5 {
                risk_score += 50;
                factors.push(format!(
                    "Low platform usage ({} logins in 14 days)",
                    login_count
                ));
            }

            let complaints_row =
                sqlx::query("SELECT COUNT(*) as count FROM complaints WHERE school_id = $1")
                    .bind(&school_id)
                    .fetch_one(&self.pool)
                    .await?;

            let unresolved: i64 = complaints_row.get("count");
            if unresolved > 10 {
                risk_score += 30;
                factors.push(format!("High volume of complaints ({})", unresolved));
            }

            let factors_json = json!(factors);

            sqlx::query(
                "INSERT INTO school_churn_predictions (school_id, churn_probability, risk_factors)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (school_id) 
                 DO UPDATE SET churn_probability = $2, risk_factors = $3, last_calculated = CURRENT_TIMESTAMP"
            )
            .bind(&school_id)
            .bind(risk_score)
            .bind(factors_json)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }
}
