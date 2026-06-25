# Legacy Notifications API Contract

Covers legacy notification routes for backward compatibility with older client builds. These routes are registered in `communication::legacy_routes()`.

---

## `GET /api/school/:schoolId/notification`

- Handler: `rust/src/domain/communication/notification.rs::get_school_notification`
- Purpose: Get school-level notification. Same handler as `GET /api/school/:schoolId/comm/school/notification`.
- Auth/Tenant: No `TenantContext` required.

### Request

Path params:

- `schoolId`: school/tenant identifier.

### Expected success response

`200 OK`

Uses `ok_json!` macro:

```json
{
  "success": true,
  "data": {
    "notification": "<notification content>"
  }
}
```

### Expected error response (not found)

`404 NOT FOUND`

```json
{
  "success": false,
  "message": "Notification not found"
}
```

### Expected error response (other)

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### Get school notification

- Type: positive
- Preconditions: School `SCH-001` has a notification set.
- Request: `GET /api/school/SCH-001/notification`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { ... } }`

#### No notification exists

- Type: negative
- Preconditions: School `SCH-001` has no notification.
- Expected HTTP status: `404`
- Expected response: `{ success: false, message: "Notification not found" }` or similar.

---

## `DELETE /api/school/:schoolId/notification`

- Handler: `rust/src/domain/communication/notification.rs::clear_school_notification`
- Purpose: Clear the school-level notification. Same handler as `DELETE /api/school/:schoolId/comm/school/notification`.
- Auth/Tenant: No `TenantContext` required.

### Request

Path params:

- `schoolId`: school/tenant identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Notification cleared"
}
```

### Test cases

#### Clear school notification

- Type: positive
- Request: `DELETE /api/school/SCH-001/notification`
- Expected HTTP status: `200`
- Expected response: `{ success: true, message: "Notification cleared" }`

---

## `GET /api/global/notification`

- Handler: `rust/src/domain/communication/notification.rs::get_global_notification`
- Purpose: Get global notification. Same handler as `GET /api/school/:schoolId/comm/school/notify/global`.
- Auth/Tenant: No `TenantContext` required. No school path parameter.

### Request

No path or query params required.

### Expected success response

`200 OK`

Uses `ok_json!` macro:

```json
{
  "success": true,
  "data": {
    "notification": "<global notification content>"
  }
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

#### Get global notification

- Type: positive
- Request: `GET /api/global/notification`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { ... } }`

#### Global notification not set

- Type: boundary
- Preconditions: No global notification exists.
- Expected HTTP status: `200` or `404` depending on admin service behavior.