use serde::{Deserialize, Serialize};
use serde_json::json;
use std::env;
use tracing::{info, error, warn};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FcmPayload {
    pub to: String,
    pub notification: FcmNotification,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FcmNotification {
    pub title: String,
    pub body: String,
    pub sound: Option<String>,
}

pub struct FcmService {
    api_key: String,
    project_id: String,
    is_mock: bool,
}

impl FcmService {
    pub fn new() -> Self {
        let api_key = env::var("FCM_SERVER_KEY").unwrap_or_else(|_| "mock_key".to_string());
        let project_id = env::var("FIREBASE_PROJECT_ID").unwrap_or_else(|_| "mock_project".to_string());
        let is_mock = api_key == "mock_key";

        if is_mock {
            warn!("FCM_SERVER_KEY not found. Push notifications will be LOGGED ONLY.");
        }

        Self {
            api_key,
            project_id,
            is_mock,
        }
    }

    /// Send a notification to a specific device token
    pub async fn send_to_token(&self, token: &str, title: &str, body: &str, data: Option<serde_json::Value>) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if self.is_mock {
            info!("MOCK FCM [Token: {}]: Title: {}, Body: {}, Data: {:?}", token, title, body, data);
            return Ok(());
        }

        let payload = FcmPayload {
            to: token.to_string(),
            notification: FcmNotification {
                title: title.to_string(),
                body: body.to_string(),
                sound: Some("default".to_string()),
            },
            data,
        };

        self.execute_send(payload).await
    }

    /// Send a notification to a specific topic
    pub async fn send_to_topic(&self, topic: &str, title: &str, body: &str, data: Option<serde_json::Value>) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let topic_path = format!("/topics/{}", topic);
        if self.is_mock {
            info!("MOCK FCM [Topic: {}]: Title: {}, Body: {}, Data: {:?}", topic_path, title, body, data);
            return Ok(());
        }

        let payload = FcmPayload {
            to: topic_path,
            notification: FcmNotification {
                title: title.to_string(),
                body: body.to_string(),
                sound: Some("default".to_string()),
            },
            data,
        };

        self.execute_send(payload).await
    }

    async fn execute_send(&self, payload: FcmPayload) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let client = reqwest::Client::new();
        let response = client
            .post("https://fcm.googleapis.com/fcm/send")
            .header("Authorization", format!("key={}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        if response.status().is_success() {
            info!("FCM notification sent successfully");
            Ok(())
        } else {
            let error_text = response.text().await?;
            error!("FCM notification failed: {}", error_text);
            Err(format!("FCM failure: {}", error_text).into())
        }
    }
}
