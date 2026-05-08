// Responsibility WebSocket Handler
// Real-time updates for responsibility changes

use axum::{
    extract::{State, WebSocketUpgrade},
    response::IntoResponse,
    routing::get,
    Router,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::result::Result;

use crate::AppState;

#[derive(Deserialize)]
pub struct ResponsibilityWsAuthPayload {
    pub token: String,
    pub school_id: String,
    pub user_id: String,
}

#[derive(Serialize, Clone)]
#[serde(tag = "type", content = "data")]
pub enum ResponsibilityEvent {
    #[serde(rename = "responsibility_assigned")]
    Assigned {
        responsibility_id: String,
        employee_id: String,
        employee_name: String,
        responsibility_name: String,
        timestamp: String,
    },
    #[serde(rename = "responsibility_removed")]
    Removed {
        responsibility_id: String,
        employee_id: String,
        employee_name: String,
        responsibility_name: String,
        timestamp: String,
    },
    #[serde(rename = "responsibility_updated")]
    Updated {
        responsibility_id: String,
        field: String,
        old_value: serde_json::Value,
        new_value: serde_json::Value,
        updated_by: String,
        timestamp: String,
    },
    #[serde(rename = "space_assigned")]
    SpaceAssigned {
        responsibility_id: String,
        space_id: String,
        space_name: String,
        assigned_by: String,
        timestamp: String,
    },
    #[serde(rename = "space_removed")]
    SpaceRemoved {
        responsibility_id: String,
        space_id: String,
        space_name: String,
        removed_by: String,
        timestamp: String,
    },
    #[serde(rename = "bulk_update")]
    BulkUpdate {
        responsibility_id: String,
        update_type: String,
        affected_count: i32,
        performed_by: String,
        timestamp: String,
    },
}

pub async fn responsibility_ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_responsibility_socket(socket, state))
}

async fn handle_responsibility_socket(mut socket: axum::extract::ws::WebSocket, state: AppState) {
    // 1. Authenticate first message
    let (user_id, school_id) = match authenticate_responsibility_socket(&mut socket, &state).await {
        Ok(info) => info,
        Err(_) => {
            let _ = socket
                .send(axum::extract::ws::Message::Text("Authentication failed".into()))
                .await;
            let _ = socket.close().await;
            return;
        }
    };

    let _ = socket
        .send(axum::extract::ws::Message::Text("Authenticated successfully".into()))
        .await;

    // 2. Setup Redis Pub/Sub subscription for responsibility events
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL environment variable must be set");
    let redis_client = match redis::Client::open(redis_url) {
        Ok(c) => c,
        Err(_) => return,
    };

    let mut pubsub_conn = match redis_client.get_async_connection().await {
        Ok(conn) => conn.into_pubsub(),
        Err(_) => return,
    };

    // Subscribe to responsibility-specific channels
    let channel_name = format!("school:{}:responsibilities", school_id);
    if pubsub_conn.subscribe(&channel_name).await.is_err() {
        return;
    }

    let mut pubsub_stream = pubsub_conn.into_on_message();
    let (mut sender, mut receiver) = socket.split();

    // 3. Task: Forward Redis Pub/Sub messages -> WebSocket Client
    let mut send_task = tokio::spawn(async move {
        while let Some(msg) = pubsub_stream.next().await {
            if let Ok(payload) = msg.get_payload::<String>() {
                if sender.send(axum::extract::ws::Message::Text(payload)).await.is_err() {
                    break;
                }
            }
        }
    });

    // 4. Task: Receive WebSocket messages (keepalive, ping)
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                axum::extract::ws::Message::Close(_) => break,
                axum::extract::ws::Message::Ping(_) => {}
                axum::extract::ws::Message::Pong(_) => {}
                _ => {}
            }
        }
    });

    // 5. If either task stops, kill the other
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };
}

async fn authenticate_responsibility_socket(
    socket: &mut axum::extract::ws::WebSocket,
    state: &AppState,
) -> Result<(String, String), ()> {
    if let Some(Ok(msg)) = socket.recv().await {
        if let axum::extract::ws::Message::Text(text) = msg {
            if let Ok(payload) = serde_json::from_str::<ResponsibilityWsAuthPayload>(&text) {
                if let Ok(Some(token_data)) = state.repos.auth.get_token(&payload.token).await {
                    let u_id = token_data["tokenId"]
                        .as_str()
                        .unwrap_or("unknown")
                        .to_string();
                    return Ok((u_id, payload.school_id));
                }
            }
        }
    }
    Err(())
}

/// Publish responsibility event to Redis for real-time updates
pub async fn publish_responsibility_event(
    school_id: &str,
    event: ResponsibilityEvent,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL environment variable must be set");
    let redis_client = redis::Client::open(redis_url)
        .map_err(|e| format!("Failed to connect to Redis: {}", e))?;
    
    let mut conn = redis_client
        .get_multiplexed_async_connection()
        .await
        .map_err(|e| format!("Failed to get Redis connection: {}", e))?;
    
    let channel_name = format!("school:{}:responsibilities", school_id);
    let payload = serde_json::to_string(&event)
        .map_err(|e| format!("Failed to serialize event: {}", e))?;
    
    redis::cmd("PUBLISH")
        .arg(&channel_name)
        .arg(&payload)
        .query_async::<_, ()>(&mut conn)
        .await
        .map_err(|e| format!("Failed to publish event: {}", e))?;
    
    Ok(())
}

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(responsibility_ws_handler))
}
