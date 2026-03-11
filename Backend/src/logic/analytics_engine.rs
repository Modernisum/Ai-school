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

        let sql = r#"
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
            )
            SELECT a.student_id,
                   COALESCE(a.absences, 0) as absences,
                   COALESCE(a.total_days, 1) as total_days,
                   COALESCE(e.failing_exams, 0) as failing_exams
            FROM attendance_stats a
            LEFT JOIN exam_stats e ON a.student_id = e.student_id
        "#;

        let risk_data = sqlx::query(sql)
            .bind(school_id)
            .fetch_all(&mut *tx)
            .await?;

        for row in risk_data {
            let student_id: String = row.get("student_id");
            let absences: i64 = row.get("absences");
            let total_days: i64 = row.get("total_days");
            let failing_exams: i64 = row.get("failing_exams");

            let mut risk_score = 0;
            let mut factors = Vec::new();

            let attendance_rate = if total_days > 0 {
                1.0 - (absences as f64 / total_days as f64)
            } else {
                1.0
            };

            if attendance_rate < 0.75 {
                risk_score += 40;
                factors.push(format!("Poor attendance ({:.1}%)", attendance_rate * 100.0));
            }

            if failing_exams > 0 {
                risk_score += (failing_exams * 20).min(60) as i32;
                factors.push(format!("Failing {} exam subjects", failing_exams));
            }

            let factors_json = json!(factors);

            sqlx::query(
                "INSERT INTO student_risk_profiles (school_id, student_id, risk_score, risk_factors)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (school_id, student_id) 
                 DO UPDATE SET risk_score = $3, risk_factors = $4, last_calculated = CURRENT_TIMESTAMP"
            )
            .bind(school_id)
            .bind(student_id)
            .bind(risk_score)
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
                factors.push(format!("Low platform usage ({} logins in 14 days)", login_count));
            }

            let complaints_row = sqlx::query(
                "SELECT COUNT(*) as count FROM complaints WHERE school_id = $1"
            )
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
