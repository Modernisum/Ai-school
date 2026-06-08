use crate::db::DbClient;
use crate::repository::traits::{AppError, JsonList, GradingRepository};
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;
use uuid::Uuid;
use bigdecimal::BigDecimal;

pub struct PostgresGradingRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl GradingRepository for PostgresGradingRepository {
    async fn add_rubric(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let res = sqlx::query(
            "INSERT INTO grading_rubrics (school_id, rubric_name, rubric_type, subject_name, class_name, criteria, total_score, passing_score)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING rubric_id"
        )
        .bind(school_id)
        .bind(data["rubric_name"].as_str())
        .bind(data["rubric_type"].as_str())
        .bind(data["subject_name"].as_str())
        .bind(data["class_name"].as_str())
        .bind(&data["criteria"])
        .bind(data["total_score"].as_f64().unwrap_or(100.0))
        .bind(data["passing_score"].as_f64().unwrap_or(40.0))
        .fetch_one(&mut *conn)
        .await?;

        let mut ret = data.clone();
        ret["rubric_id"] = json!(res.get::<Uuid, _>("rubric_id"));
        Ok(ret)
    }

    async fn get_rubrics(&self, school_id: &str, filters: Value) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut query = "SELECT * FROM grading_rubrics WHERE school_id = $1".to_string();
        
        if let Some(r_type) = filters["rubric_type"].as_str() {
            query.push_str(&format!(" AND rubric_type = '{}'", r_type));
        }
        
        let rows = sqlx::query(&query)
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;

        Ok(rows.into_iter().map(|r| json!({
            "rubric_id": r.get::<Uuid, _>("rubric_id"),
            "rubric_name": r.get::<String, _>("rubric_name"),
            "rubric_type": r.get::<String, _>("rubric_type"),
            "subject_name": r.get::<Option<String>, _>("subject_name"),
            "class_name": r.get::<Option<String>, _>("class_name"),
            "total_score": r.get::<BigDecimal, _>("total_score").to_string()
        })).collect())
    }

    async fn get_rubric(&self, school_id: &str, rubric_id: &str) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let uid = Uuid::parse_str(rubric_id)?;
        let row = sqlx::query("SELECT * FROM grading_rubrics WHERE school_id = $1 AND rubric_id = $2")
            .bind(school_id)
            .bind(uid)
            .fetch_optional(&mut *conn)
            .await?;

        Ok(row.map(|r| json!({
            "rubric_id": r.get::<Uuid, _>("rubric_id"),
            "rubric_name": r.get::<String, _>("rubric_name"),
            "criteria": r.get::<Value, _>("criteria")
        })))
    }

    async fn add_submission(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let res = sqlx::query(
            "INSERT INTO student_submissions (school_id, student_id, exam_id, submission_type, content, file_url, status, image_metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING submission_id"
        )
        .bind(school_id)
        .bind(data["student_id"].as_str())
        .bind(data["exam_id"].as_str())
        .bind(data["submission_type"].as_str().unwrap_or("exam"))
        .bind(data["content"].as_str())
        .bind(data["file_url"].as_str())
        .bind(data["status"].as_str().unwrap_or("submitted"))
        .bind(data["image_metadata"].as_object().map(|_| &data["image_metadata"]).unwrap_or(&json!({})))
        .fetch_one(&mut *conn)
        .await?;

        let mut ret = data.clone();
        ret["submission_id"] = json!(res.get::<Uuid, _>("submission_id"));
        Ok(ret)
    }

    async fn get_submissions(&self, school_id: &str, filters: Value) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut query = "SELECT * FROM student_submissions WHERE school_id = $1".to_string();
        
        if let Some(eid) = filters["exam_id"].as_str() {
            query.push_str(&format!(" AND exam_id = '{}'", eid));
        }
        
        let rows = sqlx::query(&query)
            .bind(school_id)
            .fetch_all(&mut *conn)
            .await?;

        Ok(rows.into_iter().map(|r| json!({
            "submission_id": r.get::<Uuid, _>("submission_id"),
            "student_id": r.get::<String, _>("student_id"),
            "status": r.get::<String, _>("status")
        })).collect())
    }

    async fn update_submission_status(&self, school_id: &str, submission_id: &str, status: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let uid = Uuid::parse_str(submission_id)?;
        sqlx::query("UPDATE student_submissions SET status = $1 WHERE school_id = $2 AND submission_id = $3")
            .bind(status)
            .bind(school_id)
            .bind(uid)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn save_grading_result(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let sid = Uuid::parse_str(data["submission_id"].as_str().unwrap_or_default())?;
        let rid = data["rubric_id"].as_str().map(|id| Uuid::parse_str(id).ok()).flatten();

        let res = sqlx::query(
            "INSERT INTO ai_grading_results (submission_id, school_id, rubric_id, overall_score, feedback, confidence_score, grading_provider)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING grading_id"
        )
        .bind(sid)
        .bind(school_id)
        .bind(rid)
        .bind(data["overall_score"].as_f64())
        .bind(data["feedback"].as_str())
        .bind(data["confidence_score"].as_f64())
        .bind(data["grading_provider"].as_str())
        .fetch_one(&mut *conn)
        .await?;

        let mut ret = data.clone();
        ret["grading_id"] = json!(res.get::<Uuid, _>("grading_id"));
        Ok(ret)
    }

    async fn get_grading_results(&self, school_id: &str, submission_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let sid = Uuid::parse_str(submission_id)?;
        let rows = sqlx::query("SELECT * FROM ai_grading_results WHERE school_id = $1 AND submission_id = $2")
            .bind(school_id)
            .bind(sid)
            .fetch_all(&mut *conn)
            .await?;

        Ok(rows.into_iter().map(|r| json!({
            "grading_id": r.get::<Uuid, _>("grading_id"),
            "overall_score": r.get::<Option<BigDecimal>, _>("overall_score").map(|b| b.to_string()),
            "feedback": r.get::<Option<String>, _>("feedback")
        })).collect())
    }

    async fn add_answer_key(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let res = sqlx::query(
            "INSERT INTO exam_answer_keys (school_id, exam_id, question_number, question_type, correct_answer, model_answer, keywords, max_marks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING key_id"
        )
        .bind(school_id)
        .bind(data["exam_id"].as_str())
        .bind(data["question_number"].as_i64())
        .bind(data["question_type"].as_str())
        .bind(data["correct_answer"].as_str())
        .bind(data["model_answer"].as_str())
        .bind(data["keywords"].as_array().map(|a| a.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>()))
        .bind(data["max_marks"].as_f64())
        .fetch_one(&mut *conn)
        .await?;

        let mut ret = data.clone();
        ret["key_id"] = json!(res.get::<Uuid, _>("key_id"));
        Ok(ret)
    }

    async fn get_answer_keys(&self, school_id: &str, exam_id: &str) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = sqlx::query("SELECT * FROM exam_answer_keys WHERE school_id = $1 AND exam_id = $2 ORDER BY question_number")
            .bind(school_id)
            .bind(exam_id)
            .fetch_all(&mut *conn)
            .await?;

        Ok(rows.into_iter().map(|r| json!({
            "key_id": r.get::<Uuid, _>("key_id"),
            "question_number": r.get::<i32, _>("question_number"),
            "question_type": r.get::<String, _>("question_type"),
            "max_marks": r.get::<BigDecimal, _>("max_marks").to_string()
        })).collect())
    }

    async fn set_grading_config(&self, school_id: &str, data: Value) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "INSERT INTO grading_config (school_id, subject_name, rigor_level, fuzzy_threshold, ai_feedback_enabled)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (school_id, subject_name) DO UPDATE SET
             rigor_level = EXCLUDED.rigor_level, fuzzy_threshold = EXCLUDED.fuzzy_threshold, ai_feedback_enabled = EXCLUDED.ai_feedback_enabled"
        )
        .bind(school_id)
        .bind(data["subject_name"].as_str())
        .bind(data["rigor_level"].as_str())
        .bind(data["fuzzy_threshold"].as_f64().unwrap_or(0.85))
        .bind(data["ai_feedback_enabled"].as_bool().unwrap_or(true))
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    async fn get_grading_config(&self, school_id: &str, subject_name: Option<&str>) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = if let Some(subj) = subject_name {
            sqlx::query("SELECT * FROM grading_config WHERE school_id = $1 AND subject_name = $2")
                .bind(school_id).bind(subj).fetch_optional(&mut *conn).await?
        } else {
            sqlx::query("SELECT * FROM grading_config WHERE school_id = $1 AND subject_name IS NULL")
                .bind(school_id).fetch_optional(&mut *conn).await?
        };

        Ok(row.map(|r| json!({
            "rigor_level": r.get::<String, _>("rigor_level"),
            "fuzzy_threshold": r.get::<BigDecimal, _>("fuzzy_threshold").to_string()
        })))
    }
}
