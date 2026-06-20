use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use chrono::Utc;
use futures_util::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::AppState;
use crate::models::communication::{WsAuthPayload, WsEnvelope};

impl WsEnvelope {
    fn new(msg_type: &str, payload: serde_json::Value) -> Self {
        Self {
            version: "1",
            msg_type: msg_type.to_string(),
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now().to_rfc3339(),
            payload,
        }
    }

    fn to_text(&self) -> String {
        serde_json::to_string(self).unwrap_or_default()
    }
}

fn wrap_in_envelope(payload: &str) -> String {
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(payload) {
        if parsed.get("version").is_some() && parsed.get("type").is_some() {
            return payload.to_string();
        }
        let msg_type = parsed
            .get("type")
            .and_then(|v| v.as_str())
            .unwrap_or("event")
            .to_string();
        WsEnvelope::new(&msg_type, parsed).to_text()
    } else {
        WsEnvelope::new(
            "event",
            serde_json::json!({ "raw": payload }),
        )
        .to_text()
    }
}

pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    let (user_id, school_id, vehicle_id) = match authenticate_socket(&mut socket, &state).await {
        Ok(info) => info,
        Err(_) => {
            let err = WsEnvelope::new(
                "error",
                serde_json::json!({ "code": "auth_failed", "message": "Authentication failed" }),
            );
            let _ = socket.send(Message::Text(err.to_text().into())).await;
            let _ = socket.close().await;
            return;
        }
    };

    let auth_msg = WsEnvelope::new("authenticated", serde_json::json!({}));
    let _ = socket.send(Message::Text(auth_msg.to_text().into())).await;

    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL environment variable must be set");
    let redis_client = match redis::Client::open(redis_url) {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Redis client creation failed: {}", e);
            return;
        }
    };

    let mut pubsub_conn: redis::aio::PubSub = match redis_client.get_async_connection().await {
        Ok(conn) => conn.into_pubsub(),
        Err(e) => {
            tracing::error!("Redis connection failed: {}", e);
            return;
        }
    };

    let mut channels = vec![
        format!("school:{}:user:{}", school_id, user_id),
        format!("school:{}:notifications", school_id),
    ];
    if let Some(ref vid) = vehicle_id {
        channels.push(format!("school:{}:transport:{}", school_id, vid));
    }

    for ch in &channels {
        if let Err(e) = pubsub_conn.subscribe(ch).await {
            tracing::error!("Failed to subscribe to channel {}: {}", ch, e);
        }
    }

    let mut pubsub_stream = pubsub_conn.into_on_message();
    let (mut sender, mut receiver) = socket.split();

    let (tx, mut rx) = mpsc::channel::<Message>(32);
    let tx_pubsub = tx.clone();
    let tx_recv = tx.clone();
    drop(tx);

    let mut send_task = tokio::spawn(async move {
        while let Some(msg) = pubsub_stream.next().await {
            if let Ok(payload) = msg.get_payload::<String>() {
                let envelope = wrap_in_envelope(&payload);
                if tx_pubsub.send(Message::Text(envelope.into())).await.is_err() {
                    break;
                }
            }
        }
    });

    let mut receiver_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Close(_) => break,
                Message::Ping(data) => {
                    let _ = tx_recv.send(Message::Pong(data)).await;
                }
                Message::Text(text) => {
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&text) {
                        if parsed.get("type").and_then(|v| v.as_str()) == Some("ping") {
                            let pong = WsEnvelope::new("pong", serde_json::json!({}));
                            let _ = tx_recv.send(Message::Text(pong.to_text().into())).await;
                        }
                    }
                }
                _ => {}
            }
        }
    });

    let mut forward_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    tokio::select! {
        _ = (&mut send_task) => { receiver_task.abort(); forward_task.abort(); },
        _ = (&mut receiver_task) => { send_task.abort(); forward_task.abort(); },
        _ = (&mut forward_task) => { send_task.abort(); receiver_task.abort(); },
    }
}

async fn authenticate_socket(
    socket: &mut WebSocket,
    state: &AppState,
) -> Result<(String, String, Option<String>), ()> {
    if let Some(Ok(msg)) = socket.recv().await {
        if let Message::Text(text) = msg {
            if let Ok(payload) = serde_json::from_str::<WsAuthPayload>(&text) {
                if let Ok(Some(token_data)) = state.repos.auth.get_token(&payload.token).await {
                    let expires_at = token_data
                        .get("expiresAt")
                        .and_then(|v| v.as_str())
                        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok());
                    if let Some(expiry) = expires_at {
                        if Utc::now() > expiry.with_timezone(&Utc) {
                            tracing::warn!("WS auth failed: token expired");
                            return Err(());
                        }
                    }
                    let u_id = token_data["tokenId"]
                        .as_str()
                        .unwrap_or("unknown")
                        .to_string();
                    return Ok((u_id, payload.school_id, payload.vehicle_id));
                }
            }
        }
    }
    Err(())
}

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(ws_handler))
}
