# Notifications API Contract

Covers all notification endpoints under `/api/school/:schoolId/comm/notifications` and `/api/school/:schoolId/comm/school/notification`.

---

## `GET /api/school/:schoolId/comm/notifications`

- Handler: `rust/src/domain/communication/notification.rs::list_notifications`
- Purpose: List notifications for the authenticated user with optional filters.
- Auth/Tenant: Requires `TenantContext` extension. Uses `tenant_ctx.admin_id` as the user ID.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Query params (`NotificationListQuery`):

| Param | Type | Default | Description |
|---|---|---|---|
| `category` | string | `null` | Filter by notification category (e.g. `ANNOUNCEMENT`, `GRADE`, `ATTENDANCE`) |
| `unread_only` | bool | `false` | If `true`, return only unread notifications |
| `limit` | int | `50` | Max results per page |
| `offset` | int | `0` | Pagination offset |

Example: `GET /api/school/SCH-001/comm/notifications?unreadOnly=true&limit=10`

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "schoolId": "SCH-001",
      "userId": "ADM-001",
      "category": "ANNOUNCEMENT",
      "severity": "INFO",
      "title": "Grade Published",
      "message": "Physics Midterm results are out.",
      "unread": true,
      "data": {},
      "createdAt": "2026-06-20T14:30:00Z"
    }
  ]
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR` (via `AppError`)

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### List all notifications

- Type: positive
- Preconditions: Authenticated tenant context for `ADM-001` in `SCH-001`. At least 3 notifications exist.
- Request: `GET /api/school/SCH-001/comm/notifications`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [...] }` with all notifications for `ADM-001`.

#### List only unread

- Type: positive
- Request: `GET /api/school/SCH-001/comm/notifications?unread_only=true`
- Expected HTTP status: `200`
- Expected response: `data` contains only notifications where `unread: true`.

#### Filter by category

- Type: positive
- Request: `GET /api/school/SCH-001/comm/notifications?category=ANNOUNCEMENT`
- Expected HTTP status: `200`
- Expected response: `data` contains only `ANNOUNCEMENT` category notifications.

#### Pagination

- Type: boundary
- Preconditions: 25 notifications exist.
- Request: `GET /api/school/SCH-001/comm/notifications?limit=10&offset=0`
- Expected HTTP status: `200`
- Expected response: `data` array has at most 10 items.

#### Empty list

- Type: positive
- Preconditions: No notifications for the user.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

---

## `POST /api/school/:schoolId/comm/notifications`

- Handler: `rust/src/domain/communication/notification.rs::create_notification`
- Purpose: Create a notification manually. Also logs an audit entry.
- Auth/Tenant: Requires `TenantContext` extension.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Body:

```json
{
  "userId": "STD-99882",
  "category": "GRADE",
  "severity": "INFO",
  "title": "New Grades Available",
  "message": "Your Physics midterm grade has been published.",
  "data": {
    "examId": 42,
    "grade": "A"
  }
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "id": 101,
    "schoolId": "SCH-001",
    "userId": "STD-99882",
    "category": "GRADE",
    "severity": "INFO",
    "title": "New Grades Available",
    "message": "Your Physics midterm grade has been published.",
    "unread": true,
    "data": {
      "examId": 42,
      "grade": "A"
    },
    "createdAt": "2026-06-21T10:00:00Z"
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

### Important rules

- `userId` is optional — if omitted, creates a global notification (`userId: null`).
- `category` defaults to `"general"` if not provided.
- `severity` defaults to `"info"` if not provided.
- `title` and `message` default to empty strings if not provided.
- `data` defaults to `{}` if not provided.
- An audit log entry is created with action `"CREATE"` and type `"NOTIFICATION"`.

### Test cases

#### Create notification for specific user

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-001/comm/notifications`
  - Body:

```json
{
  "userId": "STD-001",
  "category": "GRADE",
  "severity": "HIGH",
  "title": "Result Published",
  "message": "Your exam result is available."
}
```

- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { id, userId: "STD-001", ... } }`
- Database/state assertion: Notification row exists for `STD-001`. Audit log entry exists.

#### Create global notification (no userId)

- Type: positive
- Request body:

```json
{
  "category": "ANNOUNCEMENT",
  "severity": "INFO",
  "title": "Holiday Notice",
  "message": "School will remain closed on Monday."
}
```

- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { id, userId: null, ... } }`

#### Create notification with minimal fields

- Type: boundary
- Request body: `{}` (empty object)
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { id, category: "general", severity: "info", title: "", message: "", ... } }`

---

## `GET /api/school/:schoolId/comm/notifications/unread-count`

- Handler: `rust/src/domain/communication/notification.rs::get_unread_count`
- Purpose: Get count of unread notifications for the authenticated user.
- Auth/Tenant: Requires `TenantContext` extension.

### Request

Path params:

- `schoolId`: school/tenant identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

### Test cases

#### Has unread notifications

- Type: positive
- Preconditions: 3 unread notifications for the user.
- Request: `GET /api/school/SCH-001/comm/notifications/unread-count`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { count: 3 } }`

#### Zero unread

- Type: positive
- Preconditions: All notifications are read.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { count: 0 } }`

---

## `POST /api/school/:schoolId/comm/notifications/:notification_id/read`

- Handler: `rust/src/domain/communication/notification.rs::mark_read`
- Purpose: Mark a single notification as read.
- Auth/Tenant: Requires `TenantContext` extension. Uses `tenant_ctx.admin_id`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `notification_id`: notification ID (integer).

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "markedRead": 101
  }
}
```

### Test cases

#### Mark single notification as read

- Type: positive
- Preconditions: Notification ID 101 exists and is unread.
- Request: `POST /api/school/SCH-001/comm/notifications/101/read`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { markedRead: 101 } }`
- Database/state assertion: Notification `101` has `unread = false`.

#### Mark non-existent notification

- Type: negative
- Preconditions: Notification ID 99999 does not exist.
- Request: `POST /api/school/SCH-001/comm/notifications/99999/read`
- Expected HTTP status: `500`

---

## `POST /api/school/:schoolId/comm/notifications/mark-all-read`

- Handler: `rust/src/domain/communication/notification.rs::mark_all_read`
- Purpose: Mark all notifications as read for the authenticated user.
- Auth/Tenant: Requires `TenantContext` extension. Uses `tenant_ctx.admin_id`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "markedAllRead": true
  }
}
```

### Test cases

#### Mark all as read

- Type: positive
- Preconditions: 5 unread notifications for the user.
- Request: `POST /api/school/SCH-001/comm/notifications/mark-all-read`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { markedAllRead: true } }`
- Database/state assertion: All user notifications have `unread = false`.

#### Mark all when already all read

- Type: boundary
- Preconditions: All notifications are already read.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { markedAllRead: true } }`

---

## `DELETE /api/school/:schoolId/comm/notifications/:notification_id`

- Handler: `rust/src/domain/communication/notification.rs::delete_notification`
- Purpose: Delete a single notification by ID.
- Auth/Tenant: No `TenantContext` required. Uses only `schoolId` and `notification_id` from path.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `notification_id`: notification ID (integer).

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "deleted": 101
  }
}
```

### Test cases

#### Delete existing notification

- Type: positive
- Preconditions: Notification ID 101 exists.
- Request: `DELETE /api/school/SCH-001/comm/notifications/101`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { deleted: 101 } }`
- Database/state assertion: Notification 101 no longer exists.

#### Delete non-existent notification

- Type: negative
- Preconditions: Notification ID 99999 does not exist.
- Request: `DELETE /api/school/SCH-001/comm/notifications/99999`
- Expected HTTP status: `500`

---

## `GET /api/school/:schoolId/comm/school/notification`

- Handler: `rust/src/domain/communication/notification.rs::get_school_notification`
- Purpose: Get school-level notification (delegates to admin service).
- Auth/Tenant: No `TenantContext` required.

### Request

Path params:

- `schoolId`: school/tenant identifier.

### Expected success response

`200 OK`

Uses `ok_json!` macro. Shape depends on admin service response.

```json
{
  "success": true,
  "data": {
    "notification": "School notification content here..."
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
- Request: `GET /api/school/SCH-001/comm/school/notification`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { ... } }`

#### School notification not found

- Type: negative
- Preconditions: School `SCH-001` has no notification.
- Expected HTTP status: `404`
- Expected response: `{ success: false, message: "Notification not found" }` or similar.

---

## `DELETE /api/school/:schoolId/comm/school/notification`

- Handler: `rust/src/domain/communication/notification.rs::clear_school_notification`
- Purpose: Clear the school-level notification.
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
- Request: `DELETE /api/school/SCH-001/comm/school/notification`
- Expected HTTP status: `200`
- Expected response: `{ success: true, message: "Notification cleared" }`

---

## `GET /api/school/:schoolId/comm/school/notify/global`

- Handler: `rust/src/domain/communication/notification.rs::get_global_notification`
- Purpose: Get global notification (delegates to admin service).
- Auth/Tenant: No `TenantContext` required. No `schoolId` used by handler — it's a global endpoint nested under school path for route consistency.

### Request

Path params:

- `schoolId`: school/tenant identifier (in path but not used by handler).

### Expected success response

`200 OK`

Uses `ok_json!` macro:

```json
{
  "success": true,
  "data": {
    "notification": "Global notification content..."
  }
}
```

### Test cases

#### Get global notification

- Type: positive
- Request: `GET /api/school/SCH-001/comm/school/notify/global`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { ... } }`