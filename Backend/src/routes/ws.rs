use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use serde::Deserialize;

use crate::AppState;

#[derive(Deserialize)]
pub struct WsAuthPayload {
    pub token: String,
    pub school_id: String,
    pub vehicle_id: Option<String>,
}

pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    // 1. Authenticate first message
    let (user_id, school_id, vehicle_id) = match authenticate_socket(&mut socket, &state).await {
        Ok(info) => info,
        Err(_) => {
            let _ = socket
                .send(Message::Text("Authentication failed".into()))
                .await;
            let _ = socket.close().await;
            return;
        }
    };

    let _ = socket
        .send(Message::Text("Authenticated successfully".into()))
        .await;

    // 2. Setup Redis Pub/Sub subscription
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1/".to_string());
    let redis_client = match redis::Client::open(redis_url) {
        Ok(c) => c,
        Err(_) => return, 
    };

    let mut pubsub_conn = match redis_client.get_async_pubsub().await {
        Ok(conn) => conn,
        Err(_) => return,
    };

    // Dynamic Channel Selection
    let channel_name = if let Some(vid) = vehicle_id {
        format!("school:{}:transport:{}", school_id, vid)
    } else {
        format!("school:{}:user:{}", school_id, user_id)
    };

    if pubsub_conn.subscribe(&channel_name).await.is_err() {
        return;
    }

    let mut pubsub_stream = pubsub_conn.into_on_message();
    let (mut sender, mut receiver) = socket.split();

    // 3. Task: Forward Redis Pub/Sub messages -> WebSocket Client
    let mut send_task = tokio::spawn(async move {
        while let Some(msg) = pubsub_stream.next().await {
            if let Ok(payload) = msg.get_payload::<String>() {
                if sender.send(Message::Text(payload)).await.is_err() {
                    break;
                }
            }
        }
    });

    // 4. Task: Receive WebSocket messages -> (Handle Ping, or publish to Redis if needed)
    // We expect clients to use HTTP POST to /api/chat to send messages, so this is mostly for keepalives.
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Close(_) => break,
                Message::Ping(_) => {}
                Message::Pong(_) => {}
                // We could handle direct WS messages here, but HTTP is easier for the client to handle errors/attachments.
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

// Simple authentication matching your token validation (simplified for brevity)
async fn authenticate_socket(
    socket: &mut WebSocket,
    state: &AppState,
) -> Result<(String, String, Option<String>), ()> {
    if let Some(Ok(msg)) = socket.recv().await {
        if let Message::Text(text) = msg {
            if let Ok(payload) = serde_json::from_str::<WsAuthPayload>(&text) {
                if let Ok(Some(token_data)) = state.repos.auth.get_token(&payload.token).await {
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
