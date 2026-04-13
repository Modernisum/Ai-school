# WebSocket APIs - Expected Responses

## Authentication Requirements
- **WebSocket Upgrade:** Requires `Upgrade: websocket` and `Connection: Upgrade` headers
- **Authentication:** First WebSocket message must contain authentication token
- **RLS:** School ID required for channel subscription

## 1. GET /api/ws - General WebSocket Connection

### Request Headers
```
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
X-School-ID: {{schoolId}}
```

### Expected Behavior
1. **Connection Upgrade:** Server should respond with `101 Switching Protocols`
2. **Authentication:** Client must send authentication message as first WebSocket message
3. **Subscription:** After authentication, client subscribes to Redis channels based on user/vehicle

### Authentication Message Format
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "school_id": "SCH001",
  "vehicle_id": null
}
```

### Success Response
- **HTTP 101 Switching Protocols** with WebSocket upgrade
- After authentication: `"Authenticated successfully"` message

### Error Responses
#### 426 Upgrade Required
- If WebSocket headers are missing or invalid

#### Authentication Failure
- WebSocket message: `"Authentication failed"`
- Connection closed

## 2. GET /api/responsibility-ws - Responsibility WebSocket Connection

### Request Headers
```
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
X-School-ID: {{schoolId}}
X-Admin-ID: {{adminId}}
```

### Expected Behavior
1. **Connection Upgrade:** Server should respond with `101 Switching Protocols`
2. **Authentication:** Similar to general WebSocket but for responsibility events
3. **Subscription:** Subscribes to responsibility-related Redis channels

### Success Response
- **HTTP 101 Switching Protocols** with WebSocket upgrade
- After authentication: Success message

## Validation Criteria
1. **Protocol Upgrade:** Proper WebSocket handshake with 101 status code
2. **Authentication:** Token validation through auth service
3. **Redis Subscription:** Client subscribes to appropriate channels based on user/vehicle
4. **Message Forwarding:** Redis Pub/Sub messages forwarded to WebSocket client
5. **Error Handling:** Proper closure on authentication failure

## Testing Notes
- Bruno cannot test WebSocket connections directly (HTTP-only)
- These tests verify the WebSocket upgrade handshake
- Actual WebSocket testing requires specialized tools (Postman, custom scripts)
- Test authentication failure scenarios
- Verify Redis channel subscription logic
- Test with vehicle_id for transport tracking
- Test without vehicle_id for user-specific messages