# Webhooks API Contract

Covers `webhook::register_webhook`, `webhook::list_webhooks`, `webhook::delete_webhook`, and `webhook::get_webhook_logs`.

---

## `POST /api/school/:schoolId/comm/webhooks`

- Handler: `rust/src/domain/communication/webhook.rs::register_webhook`
- Purpose: Register a new webhook endpoint for event callbacks. Third-party systems can subscribe to specific event types.
- Auth/Tenant: No explicit auth middleware. Relies on parent router middleware.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Body (`CreateWebhookRequest`):

```json
{
  "url": "https://client-endpoint.com/webhook",
  "secret": "myWebhookSecretKey",
  "eventTypes": ["attendance.present", "fees.paid"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | HTTPS endpoint URL that will receive POST callbacks |
| `secret` | string | Yes | Secret key for HMAC signature verification |
| `eventTypes` | string[] | Yes | List of event types to subscribe to |

### Expected success response

`200 OK`

```json
{
  "success": true,
  "id": 42
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Important rules

- `url`, `secret`, and `eventTypes` are all required.
- The `id` in the response is the database-generated webhook ID.
- The response does NOT wrap the ID inside a `data` object — it is directly at the top level.

### Test cases

#### Register webhook with multiple event types

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-001/comm/webhooks`
  - Body:

```json
{
  "url": "https://example.com/callback",
  "secret": "supersecret",
  "eventTypes": ["attendance.present", "fees.paid", "grade.published"]
}
```

- Expected HTTP status: `200`
- Expected response: `{ success: true, id: <integer> }`
- Database/state assertion: A row in `webhooks_registry` exists with matching `url`, `secret`, and `event_types`.

#### Register webhook with single event type

- Type: boundary
- Request body:

```json
{
  "url": "https://example.com/single-callback",
  "secret": "secret123",
  "eventTypes": ["attendance.present"]
}
```

- Expected HTTP status: `200`
- Expected response: `{ success: true, id: <integer> }`

#### Duplicate URL

- Type: boundary
- Preconditions: A webhook already exists for `https://example.com/callback`.
- Request: Same URL with different secret/events.
- Expected HTTP status: `200` or `500` depending on DB constraint (ON CONFLICT behavior).

#### Missing required fields

- Type: negative
- Request body omits `url`.
- Expected HTTP status: `400` (Axum deserialization error) or `500`.

---

## `GET /api/school/:schoolId/comm/webhooks`

- Handler: `rust/src/domain/communication/webhook.rs::list_webhooks`
- Purpose: List all registered webhooks for a school.
- Auth/Tenant: Relies on parent router middleware.

### Request

Path params:

- `schoolId`: school/tenant identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "webhooks": [
    {
      "id": 42,
      "url": "https://client-endpoint.com/webhook",
      "secret": "myWebhookSecretKey",
      "eventTypes": ["attendance.present", "fees.paid"],
      "createdAt": "2026-06-21T08:00:00Z"
    }
  ]
}
```

> **Note:** The response key is `"webhooks"` (not `"data"`).

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### List webhooks

- Type: positive
- Preconditions: 2 webhooks registered for `SCH-001`.
- Request: `GET /api/school/SCH-001/comm/webhooks`
- Expected HTTP status: `200`
- Expected response: `{ success: true, webhooks: [ ... ] }` with 2 items.

#### Empty webhook list

- Type: positive
- Preconditions: No webhooks for `SCH-002`.
- Request: `GET /api/school/SCH-002/comm/webhooks`
- Expected HTTP status: `200`
- Expected response: `{ success: true, webhooks: [] }`

---

## `DELETE /api/school/:schoolId/comm/webhooks/:webhookId`

- Handler: `rust/src/domain/communication/webhook.rs::delete_webhook`
- Purpose: Delete a registered webhook by ID.
- Auth/Tenant: Relies on parent router middleware.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `webhookId`: webhook ID (integer).

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Webhook deleted"
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### Delete existing webhook

- Type: positive
- Preconditions: Webhook ID 42 exists for `SCH-001`.
- Request: `DELETE /api/school/SCH-001/comm/webhooks/42`
- Expected HTTP status: `200`
- Expected response: `{ success: true, message: "Webhook deleted" }`
- Database/state assertion: Webhook 42 no longer exists in `webhooks_registry`.

#### Delete non-existent webhook

- Type: negative
- Preconditions: Webhook ID 99999 does not exist.
- Request: `DELETE /api/school/SCH-001/comm/webhooks/99999`
- Expected HTTP status: `500`

#### Delete webhook from another school

- Type: tenant-isolation
- Preconditions: Webhook ID 42 belongs to `SCH-001`.
- Request: `DELETE /api/school/SCH-002/comm/webhooks/42`
- Expected HTTP status: `200` with no rows affected, or `500` if the implementation treats zero affected rows as an error.

---

## `GET /api/school/:schoolId/comm/webhooks/:webhookId/logs`

- Handler: `rust/src/domain/communication/webhook.rs::get_webhook_logs`
- Purpose: Retrieve delivery logs for a specific webhook. Useful for debugging integration issues.
- Auth/Tenant: Relies on parent router middleware.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `webhookId`: webhook ID (integer).

### Expected success response

`200 OK`

```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "webhookId": 42,
      "eventType": "fees.paid",
      "httpStatus": 200,
      "payloadSent": "{\"event\":\"fees.paid\",\"data\":{...}}",
      "responseBody": "OK",
      "sentAt": "2026-06-21T08:00:00Z"
    },
    {
      "id": 2,
      "webhookId": 42,
      "eventType": "attendance.present",
      "httpStatus": 500,
      "payloadSent": "{\"event\":\"attendance.present\",\"data\":{...}}",
      "responseBody": "Internal Server Error",
      "sentAt": "2026-06-21T08:05:00Z"
    }
  ]
}
```

> **Note:** The response key is `"logs"` (not `"data"`).

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### Fetch delivery logs

- Type: positive
- Preconditions: Webhook ID 42 has 3 delivery log entries.
- Request: `GET /api/school/SCH-001/comm/webhooks/42/logs`
- Expected HTTP status: `200`
- Expected response: `{ success: true, logs: [ ... ] }` with 3 items.

#### Empty delivery logs

- Type: positive
- Preconditions: Webhook ID 42 exists but has no delivery logs yet.
- Request: `GET /api/school/SCH-001/comm/webhooks/42/logs`
- Expected HTTP status: `200`
- Expected response: `{ success: true, logs: [] }`

#### Logs for non-existent webhook

- Type: boundary
- Preconditions: Webhook ID 99999 does not exist.
- Request: `GET /api/school/SCH-001/comm/webhooks/99999/logs`
- Expected HTTP status: `200` with empty logs array, or `500` depending on repository behavior.

#### Logs with failed deliveries

- Type: positive
- Preconditions: Webhook ID 42 has some log entries with `httpStatus: 500`.
- Expected HTTP status: `200`
- Expected response: Logs include entries with `httpStatus: 500` and corresponding error `responseBody`.