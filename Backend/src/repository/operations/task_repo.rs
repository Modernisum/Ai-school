use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::{Row, Column};
use std::error::Error;
use std::sync::Arc;
use uuid::Uuid;
use chrono::{DateTime, Utc};

pub struct PostgresTaskRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl TaskRepository for PostgresTaskRepository {
    async fn add_task(&self, school_id: &str, data: Value) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let task_id = data["task_id"].as_str().map(|s| s.to_string()).unwrap_or_else(|| Uuid::new_v4().to_string());
        let user_type = data["user_type"].as_str().unwrap_or("employee");
        let parent_id = data["parent_id"].as_str().unwrap_or(""); // Assignee ID
        let task_name = data["task_name"].as_str().unwrap_or("New Task");
        let complete_percentage = data["complete_percentage"].as_f64().unwrap_or(0.0);
        let status = data["status"].as_str().unwrap_or("pending");
        let priority = data["priority"].as_str().unwrap_or("Medium");
        let entity_type = data["entity_type"].as_str().unwrap_or("");
        let entity_id = data["entity_id"].as_str().unwrap_or("");
        let is_ai_generated = data["is_ai_generated"].as_bool().unwrap_or(false);
        let ai_metadata = data.get("ai_metadata").cloned().unwrap_or(json!({}));
        
        let deadline_ts = data["deadline"].as_str().and_then(|s| DateTime::parse_from_rfc3339(s).ok()).map(|dt| dt.with_timezone(&Utc));

        let row = sqlx::query(
            r#"
            INSERT INTO tasks (
                task_id, school_id, user_type, parent_id, task_name, complete_percentage, 
                status, priority, entity_type, entity_id, is_ai_generated, ai_metadata, deadline
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
            "#
        )
        .bind(&task_id)
        .bind(school_id)
        .bind(user_type)
        .bind(parent_id)
        .bind(task_name)
        .bind(complete_percentage)
        .bind(status)
        .bind(priority)
        .bind(entity_type)
        .bind(entity_id)
        .bind(is_ai_generated)
        .bind(&ai_metadata)
        .bind(deadline_ts)
        .fetch_one(&mut *conn)
        .await?;

        let mut res = serde_json::Map::new();
        for col in row.columns() {
            let name = col.name();
            match name {
                "ai_metadata" | "update_logs" => {
                    let v: Option<Value> = row.try_get(name).unwrap_or(None);
                    res.insert(name.to_string(), v.unwrap_or(json!({})));
                }
                "complete_percentage" => {
                    let v: Option<sqlx::types::BigDecimal> = row.try_get(name).unwrap_or(None);
                    // Converting BigDecimal to f64 approximately
                    if let Some(dec) = v {
                        res.insert(name.to_string(), json!(dec.to_string().parse::<f64>().unwrap_or(0.0)));
                    } else {
                        res.insert(name.to_string(), json!(0.0));
                    }
                }
                "deadline" | "created_at" | "updated_at" => {
                    let v: Option<DateTime<Utc>> = row.try_get(name).unwrap_or(None);
                    if let Some(dt) = v {
                        res.insert(name.to_string(), json!(dt.to_rfc3339()));
                    } else {
                        res.insert(name.to_string(), Value::Null);
                    }
                }
                "is_ai_generated" => {
                    let v: bool = row.try_get(name).unwrap_or(false);
                    res.insert(name.to_string(), json!(v));
                }
                _ => {
                    let v: Option<String> = row.try_get(name).unwrap_or(None);
                    res.insert(name.to_string(), json!(v));
                }
            }
        }
        Ok(Value::Object(res))
    }

    async fn get_tasks(&self, school_id: &str, start_date: Option<&str>, end_date: Option<&str>) -> Result<Vec<Value>, Box<dyn Error + Send + Sync>> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let mut query_str = String::from("SELECT * FROM tasks WHERE school_id = $1");
        
        if start_date.is_some() {
            query_str.push_str(" AND deadline >= $2");
        }
        if end_date.is_some() {
            query_str.push_str(" AND deadline <= $3");
        }
        
        query_str.push_str(" ORDER BY deadline ASC");
        
        let mut q = sqlx::query(&query_str).bind(school_id);
        
        // Very basic binding logic, ideally use QueryBuilder
        if let Some(start) = start_date {
            let dt = DateTime::parse_from_rfc3339(start).ok().map(|d| d.with_timezone(&Utc));
            q = q.bind(dt);
        }
        
        if let Some(end) = end_date {
            let dt = DateTime::parse_from_rfc3339(end).ok().map(|d| d.with_timezone(&Utc));
            q = q.bind(dt);
        }

        let rows = q.fetch_all(&mut *conn).await?;
        
        let mut result = Vec::new();
        for row in rows {
            let mut res = serde_json::Map::new();
            for col in row.columns() {
                let name = col.name();
                match name {
                    "ai_metadata" | "update_logs" => {
                        let v: Option<Value> = row.try_get(name).unwrap_or(None);
                        res.insert(name.to_string(), v.unwrap_or(json!({})));
                    }
                    "complete_percentage" => {
                        let v: Option<sqlx::types::BigDecimal> = row.try_get(name).unwrap_or(None);
                        if let Some(dec) = v {
                            res.insert(name.to_string(), json!(dec.to_string().parse::<f64>().unwrap_or(0.0)));
                        } else {
                            res.insert(name.to_string(), json!(0.0));
                        }
                    }
                    "deadline" | "created_at" | "updated_at" => {
                        let v: Option<DateTime<Utc>> = row.try_get(name).unwrap_or(None);
                        if let Some(dt) = v {
                            res.insert(name.to_string(), json!(dt.to_rfc3339()));
                        } else {
                            res.insert(name.to_string(), Value::Null);
                        }
                    }
                    "is_ai_generated" => {
                        let v: bool = row.try_get(name).unwrap_or(false);
                        res.insert(name.to_string(), json!(v));
                    }
                    _ => {
                        let v: Option<String> = row.try_get(name).unwrap_or(None);
                        res.insert(name.to_string(), json!(v));
                    }
                }
            }
            result.push(Value::Object(res));
        }
        Ok(result)
    }

    async fn update_task_status(&self, school_id: &str, task_id: &str, status: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        
        let pct = if status == "completed" { 100.0 } else { 0.0 };
        
        sqlx::query("UPDATE tasks SET status = $1, complete_percentage = $2 WHERE school_id = $3 AND task_id = $4")
            .bind(status)
            .bind(pct)
            .bind(school_id)
            .bind(task_id)
            .execute(&mut *conn)
            .await?;
            
        Ok(())
    }
}
