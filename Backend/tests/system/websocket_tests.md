# System API — WebSocket Tests

## Test: WebSocket Connection & Authentication

- **Endpoint**: `WS /api/school/689225/system/ws`
- **Expected**: Envelope `{ "version": "1", "type": "authenticated", "id": "...", "timestamp": "...", "payload": {} }`

```bash
wscat -c ws://localhost:8080/api/school/689225/system/ws
```

Then send auth message:

```json
{ "token": "YOUR_JWT_TOKEN", "school_id": "689225" }
```

Expected response:

```json
{ "version": "1", "type": "authenticated", "id": "uuid-v4", "timestamp": "2026-05-09T06:00:00+00:00", "payload": {} }
```

---

## Test: WebSocket Auth with Vehicle ID

- **Endpoint**: `WS /api/school/689225/system/ws`
- **Expected**: Subscribes to user + notifications + transport channels

```bash
wscat -c ws://localhost:8080/api/school/689225/system/ws
```

Send auth with vehicle:

```json
{ "token": "YOUR_JWT_TOKEN", "school_id": "689225", "vehicle_id": "bus-01" }
```

Expected: `authenticated` envelope, then receives messages from `school:689225:user:{userId}`, `school:689225:notifications`, and `school:689225:transport:bus-01` channels.

---

## Test: WebSocket Auth Failure — Invalid Token

- **Endpoint**: `WS /api/school/689225/system/ws`
- **Expected**: Envelope `{ "type": "error", "payload": { "code": "auth_failed" } }` then connection closed

```bash
wscat -c ws://localhost:8080/api/school/689225/system/ws
```

Send invalid token:

```json
{ "token": "invalid_token", "school_id": "689225" }
```

Expected response:

```json
{ "version": "1", "type": "error", "id": "uuid-v4", "timestamp": "...", "payload": { "code": "auth_failed", "message": "Authentication failed" } }
```

Connection then closes.

---

## Test: WebSocket Auth Failure — Expired Token

- **Endpoint**: `WS /api/school/689225/system/ws`
- **Expected**: Connection closed (token expiry check rejects)

```bash
wscat -c ws://localhost:8080/api/school/689225/system/ws
```

Send expired token:

```json
{ "token": "EXPIRED_JWT_TOKEN", "school_id": "689225" }
```

Expected: Connection closed without `authenticated` message.

---

## Test: WebSocket Ping/Pong Heartbeat

- **Endpoint**: `WS /api/school/689225/system/ws`
- **Expected**: Envelope `{ "type": "pong" }` response

After authenticating, send:

```json
{ "type": "ping" }
```

Expected response:

```json
{ "version": "1", "type": "pong", "id": "uuid-v4", "timestamp": "...", "payload": {} }
```

---

## Test: WebSocket Receives Redis Pub/Sub Messages

- **Endpoint**: `WS /api/school/689225/system/ws`
- **Expected**: Messages wrapped in envelope format

1. Connect and authenticate
2. From another terminal, publish to Redis:

```bash
redis-cli PUBLISH "school:689225:user:USER_ID" '{"type":"notification","title":"Test","message":"Hello"}'
```

Expected on WebSocket:

```json
{ "version": "1", "type": "notification", "id": "uuid-v4", "timestamp": "...", "payload": { "type": "notification", "title": "Test", "message": "Hello" } }
```

---

## Test: WebSocket Receives Pre-Wrapped Envelope

- **Endpoint**: `WS /api/school/689225/system/ws`
- **Expected**: Already-enveloped messages passed through as-is

Publish a pre-wrapped message to Redis:

```bash
redis-cli PUBLISH "school:689225:notifications" '{"version":"1","type":"transport.gps","id":"gps-001","timestamp":"2026-05-09T06:00:00Z","payload":{"lat":28.6,"lng":77.2}}'
```

Expected on WebSocket (passed through unchanged):

```json
{ "version": "1", "type": "transport.gps", "id": "gps-001", "timestamp": "2026-05-09T06:00:00Z", "payload": { "lat": 28.6, "lng": 77.2 } }
```

---

## Test: WebSocket Non-JSON Redis Message

- **Endpoint**: `WS /api/school/689225/system/ws`
- **Expected**: Raw text wrapped in envelope with type `event`

```bash
redis-cli PUBLISH "school:689225:user:USER_ID" 'plain-text-message'
```

Expected on WebSocket:

```json
{ "version": "1", "type": "event", "id": "uuid-v4", "timestamp": "...", "payload": { "raw": "plain-text-message" } }
```

---

## Test: WebSocket Exponential Backoff (Frontend)

- **Expected**: Reconnect delays increase exponentially with jitter

| Retry # | Min Delay | Max Delay (approx) |
|---------|-----------|-------------------|
| 0       | 1.0s      | 2.0s              |
| 1       | 2.0s      | 3.0s              |
| 2       | 4.0s      | 5.0s              |
| 3       | 8.0s      | 9.0s              |
| 4       | 16.0s     | 17.0s             |
| 5+      | 30.0s     | 31.0s (capped)    |

Formula: `min(1000 * 2^retryCount + random(0..1000), 30000)`

To test: stop the backend server and observe console logs showing increasing retry delays in the browser DevTools.

---

## Test: WebSocket Wrong URL (Old Route)

- **Endpoint**: `WS /api/ws` (deprecated)
- **Expected**: Connection refused / 404

```bash
wscat -c ws://localhost:8080/api/ws
```

Expected: Connection fails — this route no longer exists. Frontend must use `/api/school/{schoolId}/system/ws`.

---

## Test: WebSocket Missing schoolId

- **Endpoint**: `WS /api/school//system/ws`
- **Expected**: Connection refused / route not found

```bash
wscat -c ws://localhost:8080/api/school//system/ws
```

Expected: No route match. The `schoolId` path parameter is required.
