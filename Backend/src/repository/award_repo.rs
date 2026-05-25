use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::{Acquire, Row};
use std::sync::Arc;

pub struct PostgresAwardRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl AwardRepository for PostgresAwardRepository {
    async fn add_award(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let res = sqlx::query("INSERT INTO awards (school_id, student_id, title, description, date) VALUES ($1, $2, $3, $4, $5) RETURNING id")
            .bind(school_id)
            .bind(data["studentId"].as_str())
            .bind(data["title"].as_str())
            .bind(data["description"].as_str())
            .bind(data["date"].as_str().map(|d| d.parse::<chrono::NaiveDate>().unwrap_or_else(|_| chrono::Utc::now().date_naive())))
            .fetch_one(&mut *conn).await?;

        let mut ret = data.clone();
        ret["id"] = json!(res.get::<i32, _>("id"));
        Ok(ret)
    }

    async fn get_awards(
        &self,
        school_id: &str,
        student_id: Option<&str>,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let rows = if let Some(sid) = student_id {
            sqlx::query("SELECT id, title, description, date FROM awards WHERE school_id = $1 AND student_id = $2")
                .bind(school_id).bind(sid).fetch_all(&mut *conn).await?
        } else {
            sqlx::query("SELECT id, title, description, date FROM awards WHERE school_id = $1")
                .bind(school_id)
                .fetch_all(&mut *conn)
                .await?
        };
        Ok(rows.into_iter().map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title"), "description": r.get::<Option<String>, _>("description"), "date": r.get::<Option<chrono::NaiveDate>, _>("date")})).collect())
    }

    async fn get_award(&self, school_id: &str, award_id: i32) -> Result<Option<Value>, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query("SELECT * FROM awards WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(award_id)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(row.map(|r| json!({"id": r.get::<i32, _>("id"), "title": r.get::<String, _>("title")})))
    }

    async fn delete_award(&self, school_id: &str, award_id: i32) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM awards WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(award_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }
}
