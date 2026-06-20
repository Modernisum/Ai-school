use chrono::Utc;
use hex;
use hmac::{Hmac, Mac};
use reqwest::Client;
use serde_json::{json, Value};
use sha2::Sha256;
use sqlx::{Pool, Postgres, Row};
use std::time::Duration;

#[allow(dead_code)]
type HmacSha256 = Hmac<Sha256>;

#[allow(dead_code)]
pub struct WebhookEngine {
    pool: Pool<Postgres>,
    client: Client,
}

#[allow(dead_code)]
impl WebhookEngine {
    pub fn new(pool: Pool<Postgres>) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .unwrap_or_default();

        Self { pool, client }
    }

    /// Triggers a webhook event for a specific school.
    /// This finds all relevant active endpoints and creates delivery logs for them.
    pub async fn trigger(
        &self,
        school_id: &str,
        event: &str,
        data: Value,
    ) -> Result<(), sqlx::Error> {
        let endpoints = sqlx::query(
            "SELECT id, url, secret, event_types FROM webhook_endpoints 
             WHERE school_id = $1 AND status = 'active' AND $2 = ANY(event_types)",
        )
        .bind(school_id)
        .bind(event)
        .fetch_all(&self.pool)
        .await?;

        let payload = json!({
            "event": event,
            "school_id": school_id,
            "timestamp": Utc::now().timestamp(),
            "data": data
        });

        for row in endpoints {
            let endpoint_id: i32 = row.get("id");

            sqlx::query(
                "INSERT INTO webhook_delivery_logs (school_id, endpoint_id, event_type, payload, status)
                 VALUES ($1, $2, $3, $4, 'pending')"
            )
            .bind(school_id)
            .bind(endpoint_id)
            .bind(event)
            .bind(&payload)
            .execute(&self.pool)
            .await?;

            // Proactive delivery attempt can be spawned here
            // but usually we let the background job pick up 'pending' logs to ensure retry logic consistency
        }

        Ok(())
    }

    /// Attempts to deliver a pending webhook log.
    pub async fn process_pending(&self) -> Result<(), sqlx::Error> {
        let pending_logs = sqlx::query(
            "SELECT l.id, l.school_id, l.payload, l.attempt_count, e.url, e.secret 
             FROM webhook_delivery_logs l
             JOIN webhook_endpoints e ON l.endpoint_id = e.id
             WHERE l.status = 'pending' AND (l.next_retry_at IS NULL OR l.next_retry_at <= NOW())
             LIMIT 50",
        )
        .fetch_all(&self.pool)
        .await?;

        for row in pending_logs {
            let log_id: i32 = row.get("id");
            let payload: Value = row.get("payload");
            let attempt: i32 = row.get("attempt_count");
            let url: String = row.get("url");
            let secret: String = row.get("secret");

            let result = self.send_webhook(&url, &secret, &payload).await;

            self.handle_delivery_result(log_id, attempt, result).await?;
        }

        Ok(())
    }

    async fn send_webhook(&self, url: &str, secret: &str, payload: &Value) -> Result<u16, String> {
        let payload_str = serde_json::to_string(payload).map_err(|e| e.to_string())?;

        let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).map_err(|e| e.to_string())?;
        mac.update(payload_str.as_bytes());
        let signature = hex::encode(mac.finalize().into_bytes());

        let response = self
            .client
            .post(url)
            .header("Content-Type", "application/json")
            .header("X-Vidhyam-Signature", format!("sha256={}", signature))
            .body(payload_str)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        Ok(response.status().as_u16())
    }

    async fn handle_delivery_result(
        &self,
        log_id: i32,
        current_attempt: i32,
        result: Result<u16, String>,
    ) -> Result<(), sqlx::Error> {
        match result {
            Ok(status) if status >= 200 && status < 300 => {
                sqlx::query(
                    "UPDATE webhook_delivery_logs 
                     SET status = 'sent', status_code = $1, last_attempt_at = NOW()
                     WHERE id = $2",
                )
                .bind(status as i32)
                .bind(log_id)
                .execute(&self.pool)
                .await?;
            }
            res => {
                let status_code = match res {
                    Ok(s) => Some(s as i32),
                    Err(_) => None,
                };
                let error_msg = match res {
                    Ok(_) => None,
                    Err(e) => Some(e),
                };

                let next_attempt = current_attempt + 1;
                if next_attempt > 5 {
                    // Final failure
                    sqlx::query(
                        "UPDATE webhook_delivery_logs 
                         SET status = 'failed', status_code = $1, response_body = $2, last_attempt_at = NOW()
                         WHERE id = $3"
                    )
                    .bind(status_code)
                    .bind(error_msg)
                    .bind(log_id)
                    .execute(&self.pool)
                    .await?;
                } else {
                    // Exponential backoff: 1m, 5m, 15m, 1h, 4h
                    let backoff_minutes = match next_attempt {
                        2 => 1,
                        3 => 5,
                        4 => 15,
                        5 => 60,
                        _ => 240,
                    };

                    sqlx::query(
                        "UPDATE webhook_delivery_logs 
                         SET attempt_count = $1, status_code = $2, response_body = $3, 
                             last_attempt_at = NOW(), next_retry_at = NOW() + INTERVAL '1 minute' * $4
                         WHERE id = $5"
                    )
                    .bind(next_attempt)
                    .bind(status_code)
                    .bind(error_msg)
                    .bind(backoff_minutes)
                    .bind(log_id)
                    .execute(&self.pool)
                    .await?;
                }
            }
        }
        Ok(())
    }
}
