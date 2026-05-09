use crate::error::{AppError, AppResult};
use crate::logic::webhook_engine::WebhookEngine;
use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

pub struct PostgresNotificationService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl NotificationService for PostgresNotificationService {
    async fn create_notification(
        &self,
        school_id: &str,
        user_id: Option<&str>,
        category: &str,
        severity: &str,
        title: &str,
        message: &str,
        data: Value,
    ) -> AppResult<Value> {
        let notif = self.repos.notification.create(
            school_id, user_id, category, severity, title, message, data.clone(),
        ).await.map_err(|e| AppError::Internal(e.to_string()))?;

        if let Err(e) = push_via_websocket(school_id, user_id, &notif).await {
            tracing::warn!("WS push failed: {}", e);
        }

        let event_name = format!("notification.{}", category);
        let webhook_engine = WebhookEngine::new(self.repos.db_client.pool.clone());
        if let Err(e) = webhook_engine.trigger(school_id, &event_name, notif.clone()).await {
            tracing::warn!("Webhook trigger failed for {}: {}", event_name, e);
        }

        Ok(notif)
    }

    async fn list_notifications(
        &self,
        school_id: &str,
        user_id: Option<&str>,
        category: Option<&str>,
        unread_only: bool,
        limit: i64,
        offset: i64,
    ) -> AppResult<Vec<Value>> {
        if let Some(uid) = user_id {
            self.repos.notification.list_for_user(school_id, uid, category, unread_only, limit, offset)
                .await.map_err(|e| AppError::Internal(e.to_string()))
        } else {
            self.repos.notification.list_for_school(school_id, category, limit, offset)
                .await.map_err(|e| AppError::Internal(e.to_string()))
        }
    }

    async fn get_unread_count(&self, school_id: &str, user_id: &str) -> AppResult<i64> {
        self.repos.notification.get_unread_count(school_id, user_id)
            .await.map_err(|e| AppError::Internal(e.to_string()))
    }

    async fn mark_read(&self, school_id: &str, notification_id: i64, user_id: &str) -> AppResult<()> {
        self.repos.notification.mark_read(school_id, notification_id, user_id)
            .await.map_err(|e| AppError::Internal(e.to_string()))
    }

    async fn mark_all_read(&self, school_id: &str, user_id: &str) -> AppResult<()> {
        self.repos.notification.mark_all_read(school_id, user_id)
            .await.map_err(|e| AppError::Internal(e.to_string()))
    }

    async fn delete_notification(&self, school_id: &str, notification_id: i64) -> AppResult<()> {
        self.repos.notification.delete_notification(school_id, notification_id)
            .await.map_err(|e| AppError::Internal(e.to_string()))
    }
}

async fn push_via_websocket(
    school_id: &str,
    user_id: Option<&str>,
    notif: &Value,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let redis_url = std::env::var("REDIS_URL")?;
    let client = redis::Client::open(redis_url)?;
    let mut conn = client.get_async_connection().await?;

    let channel = if let Some(uid) = user_id {
        format!("school:{}:user:{}", school_id, uid)
    } else {
        format!("school:{}:notifications", school_id)
    };

    let envelope = serde_json::json!({
        "version": "1",
        "type": "notification",
        "id": uuid::Uuid::new_v4().to_string(),
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "payload": notif,
    });

    let _: () = redis::cmd("PUBLISH")
        .arg(&channel)
        .arg(envelope.to_string())
        .query_async(&mut conn)
        .await?;

    Ok(())
}
