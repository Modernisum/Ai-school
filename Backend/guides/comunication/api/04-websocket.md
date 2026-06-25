# WebSocket API Contract

Covers `ws::ws_handler`.

---

## `GET /api/school/:schoolId/comm/ws`

- Handler: `rust/src/domain/communication/ws.rs::ws_handler`
- Purpose: Upgrade HTTP connection to WebSocket for real-time bidirectional communication. Subscribes the client to user-specific and school-wide Redis Pub/Sub channels.
- Auth: Token-based authentication via the **first WebSocket text frame** after upgrade.

### Handshake

The WebSocket upgrade is a standard HTTP `GET` with `Upgrade: websocket` headers. The `schoolId` path parameter is NOT used for auth — authentication is done post-upgrade.

```
ws://localhost:8080/api/school/SCH-00021/comm/ws
```

### Authentication Protocol

After the WebSocket connection is established, the client MUST send a JSON `WsAuthPayload` as the **first text frame**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "schoolId": "SCH-00021",
  "vehicleId": "VEH-001"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `token` | string | Yes | Authentication token (validated against `auth` repo) |
| `schoolId` | string | Yes | School/tenant identifier |
| `vehicleId` | string | No | Optional vehicle ID for transport tracking |

If authentication fails, the server sends an error envelope and closes the connection:

```json
{
  "version": "1",
  "type": "error",
  "id": "uuid-here",
  "timestamp": "2026-06-21T10:00:00+00:00",
  "payload": {
    "code": "auth_failed",
    "message": "Authentication failed"
  }
}
```

If authentication succeeds, the server sends:

```json
{
  "version": "1",
  "type": "authenticated",
  "id": "uuid-here",
  "timestamp": "2026-06-21T10:00:00+00:00",
  "payload": {}
}
```

### Redis Pub/Sub Channels

After auth, the server subscribes to these Redis channels:

| Channel | Pattern | Purpose |
|---|---|---|
| User messages | `school:{schoolId}:user:{userId}` | Personal chat messages |
| Notifications | `school:{schoolId}:notifications` | School-wide notification broadcasts |
| Transport | `school:{schoolId}:transport:{vehicleId}` | Vehicle tracking (only if `vehicleId` provided) |

### Client-to-Server Messages

The client can send ping messages to keep the connection alive:

```json
{
  "type": "ping"
}
```

The server responds with:

```json
{
  "version": "1",
  "type": "pong",
  "id": "uuid-here",
  "timestamp": "2026-06-21T10:00:00+00:00",
  "payload": {}
}
```

The server also handles WebSocket protocol-level `Ping` frames by responding with `Pong`.

### Server-to-Client Messages (Envelope Format)

All outgoing messages are wrapped in `WsEnvelope`:

```json
{
  "version": "1",
  "type": "chat_message",
  "id": "uuid-here",
  "timestamp": "2026-06-21T10:00:00+00:00",
  "payload": {
    "messageId": 29881,
    "senderId": "EMP-00109",
    "senderType": "employee",
    "receiverId": "STD-99882",
    "receiverType": "student",
    "content": "Hello!",
    "attachmentUrl": null,
    "createdAt": "2026-06-21T10:00:00+00:00"
  }
}
```

If a message from Redis already has `version` and `type` fields, it is passed through without re-wrapping.

### Important rules

- Token expiry is checked. If the token's `expiresAt` is in the past, authentication fails.
- If `REDIS_URL` environment variable is not set, the handler panics. Ensure `REDIS_URL` is always configured.
- The WebSocket connection stays open until either side closes it.
- Three concurrent tokio tasks run: `send_task` (Redis Pub/Sub listener), `receiver_task` (client message handler), `forward_task` (message forwarder). If any task exits, the others are aborted.

### Test cases

#### Successful WebSocket handshake and auth

- Type: positive
- Preconditions: Valid token in `auth` repo. `REDIS_URL` configured.
- Steps:
  1. Open WebSocket connection to `ws://localhost:8080/api/school/SCH-001/comm/ws`
  2. Send auth frame: `{"token": "<valid_token>", "schoolId": "SCH-001"}`
- Expected: Receive `{ type: "authenticated", ... }` envelope.
- Expected: Connection stays open.

#### Authentication failure — invalid token

- Type: negative
- Preconditions: Token does not exist in `auth` repo.
- Steps:
  1. Open WebSocket connection.
  2. Send auth frame: `{"token": "invalid_token", "schoolId": "SCH-001"}`
- Expected: Receive `{ type: "error", payload: { code: "auth_failed", ... } }`.
- Expected: Connection is closed by server.

#### Authentication failure — expired token

- Type: negative
- Preconditions: Token exists but `expiresAt` is in the past.
- Steps:
  1. Open WebSocket connection.
  2. Send auth frame with expired token.
- Expected: `{ type: "error", payload: { code: "auth_failed", ... } }`.
- Expected: Connection closed.

#### Ping/Pong

- Type: positive
- Preconditions: Authenticated WebSocket connection.
- Steps:
  1. Send: `{"type": "ping"}`
- Expected: Receive `{ type: "pong", ... }`.

#### Receive chat message via Pub/Sub

- Type: positive
- Preconditions: Authenticated WebSocket connection for user `STD-001` in `SCH-001`.
- Steps:
  1. Publish a message to Redis channel `school:SCH-001:user:STD-001` from another source.
- Expected: The WebSocket client receives the message wrapped in `WsEnvelope`.

#### Receive notification via Pub/Sub

- Type: positive
- Preconditions: Authenticated WebSocket connection.
- Steps:
  1. Publish to Redis channel `school:SCH-001:notifications`.
- Expected: The WebSocket client receives the notification wrapped in `WsEnvelope`.

#### Connection with vehicleId

- Type: positive
- Preconditions: Valid token.
- Steps:
  1. Send auth: `{"token": "<valid>", "schoolId": "SCH-001", "vehicleId": "VEH-001"}`
- Expected: `{ type: "authenticated", ... }`.
- Expected: Also subscribed to `school:SCH-001:transport:VEH-001`.

#### No auth frame sent

- Type: negative
- Steps:
  1. Open WebSocket connection.
  2. Close connection without sending any frame.
- Expected: Server eventually times out or drops the connection.

#### Client closes connection

- Type: boundary
- Steps:
  1. Authenticate successfully.
  2. Send WebSocket `Close` frame.
- Expected: Server closes cleanly. All tasks abort.