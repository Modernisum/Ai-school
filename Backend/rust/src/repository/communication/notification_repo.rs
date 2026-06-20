use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct PostgresNotificationRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl NotificationRepository for PostgresNotificationRepository {
    async fn create(
        &self,
        school_id: &str,
        user_id: Option<&str>,
        category: &str,
        severity: &str,
        title: &str,
        message: &str,
        data: Value,
    ) -> Result<Value, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query(
            "INSERT INTO notifications (school_id, user_id, category, severity, title, message, data)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, created_at"
        )
        .bind(school_id)
        .bind(user_id)
        .bind(category)
        .bind(severity)
        .bind(title)
        .bind(message)
        .bind(&data)
        .fetch_one(&mut *conn)
        .await?;

        Ok(json!({
            "id": row.get::<i64, _>("id"),
            "schoolId": school_id,
            "userId": user_id,
            "category": category,
            "severity": severity,
            "title": title,
            "message": message,
            "data": data,
            "isRead": false,
            "createdAt": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
        }))
    }

    async fn list_for_user(
        &self,
        school_id: &str,
        user_id: &str,
        category: Option<&str>,
        unread_only: bool,
        limit: i64,
        offset: i64,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut query_str = String::from(
            "SELECT id, user_id, category, severity, title, message, data, is_read, created_at, read_at
             FROM notifications WHERE school_id = $1 AND (user_id = $2 OR user_id IS NULL)"
        );
        if category.is_some() {
            query_str.push_str(" AND category = $3");
        }
        if unread_only {
            query_str.push_str(" AND is_read = FALSE");
        }
        query_str.push_str(" ORDER BY created_at DESC LIMIT ");
        query_str.push_str(&limit.to_string());
        query_str.push_str(" OFFSET ");
        query_str.push_str(&offset.to_string());

        let mut q = sqlx::query(&query_str).bind(school_id).bind(user_id);
        if let Some(cat) = category {
            q = q.bind(cat);
        }
        let rows = q.fetch_all(&mut *conn).await?;

        Ok(rows.into_iter().map(|r| row_to_json(&r)).collect())
    }

    async fn list_for_school(
        &self,
        school_id: &str,
        category: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<JsonList, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let mut query_str = String::from(
            "SELECT id, user_id, category, severity, title, message, data, is_read, created_at, read_at
             FROM notifications WHERE school_id = $1"
        );
        if category.is_some() {
            query_str.push_str(" AND category = $2");
        }
        query_str.push_str(" ORDER BY created_at DESC LIMIT ");
        query_str.push_str(&limit.to_string());
        query_str.push_str(" OFFSET ");
        query_str.push_str(&offset.to_string());

        let mut q = sqlx::query(&query_str).bind(school_id);
        if let Some(cat) = category {
            q = q.bind(cat);
        }
        let rows = q.fetch_all(&mut *conn).await?;

        Ok(rows.into_iter().map(|r| row_to_json(&r)).collect())
    }

    async fn get_unread_count(&self, school_id: &str, user_id: &str) -> Result<i64, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query(
            "SELECT COUNT(*) as count FROM notifications
             WHERE school_id = $1 AND (user_id = $2 OR user_id IS NULL) AND is_read = FALSE"
        )
        .bind(school_id)
        .bind(user_id)
        .fetch_one(&mut *conn)
        .await?;

        Ok(row.get::<i64, _>("count"))
    }

    async fn get_pending_notifications_count(
        &self,
        school_id: &str,
        since: chrono::DateTime<chrono::Utc>,
    ) -> Result<i64, AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        let row = sqlx::query(
            "SELECT COUNT(*) as count FROM notifications
             WHERE school_id = $1 AND status = 'pending' AND created_at >= $2"
        )
        .bind(school_id)
        .bind(since)
        .fetch_one(&mut *conn)
        .await?;

        Ok(row.get::<i64, _>("count"))
    }

    async fn mark_read(&self, school_id: &str, notification_id: i64, _user_id: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE school_id = $1 AND id = $2"
        )
        .bind(school_id)
        .bind(notification_id)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    async fn mark_all_read(&self, school_id: &str, user_id: &str) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query(
            "UPDATE notifications SET is_read = TRUE, read_at = NOW()
             WHERE school_id = $1 AND (user_id = $2 OR user_id IS NULL) AND is_read = FALSE"
        )
        .bind(school_id)
        .bind(user_id)
        .execute(&mut *conn)
        .await?;
        Ok(())
    }

    async fn delete_notification(&self, school_id: &str, notification_id: i64) -> Result<(), AppError> {
        let mut conn = self.client.acquire_tenant_connection(school_id).await?;
        sqlx::query("DELETE FROM notifications WHERE school_id = $1 AND id = $2")
            .bind(school_id)
            .bind(notification_id)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }
}

fn row_to_json(r: &sqlx::postgres::PgRow) -> Value {
    json!({
        "id": r.get::<i64, _>("id"),
        "userId": r.get::<Option<String>, _>("user_id"),
        "category": r.get::<String, _>("category"),
        "severity": r.get::<String, _>("severity"),
        "title": r.get::<String, _>("title"),
        "message": r.get::<String, _>("message"),
        "data": r.get::<Value, _>("data"),
        "isRead": r.get::<bool, _>("is_read"),
        "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
        "readAt": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("read_at").map(|t| t.to_rfc3339()),
    })
}
