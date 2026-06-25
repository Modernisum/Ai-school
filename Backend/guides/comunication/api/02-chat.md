# Chat API Contract

Covers `chat::send_message`, `chat::get_history`, and `chat::get_ai_chat_history`.

---

## `POST /api/school/:schoolId/comm/chat/:schoolId/send`

> **Note:** The `:schoolId` appears twice in the path — once from the parent `/school/:schoolId/comm` nest and once from the chat router's `/:schoolId/send`. The handler uses the inner path value.

- Handler: `rust/src/domain/communication/chat.rs::send_message`
- Purpose: Send a peer-to-peer chat message. Persists to DB and publishes to Redis Pub/Sub for real-time delivery.
- Auth/Tenant: No explicit auth middleware on handler. Relies on parent router middleware.

### Request

Path params:

- `schoolId`: school/tenant identifier (outer).
- `schoolId`: school/tenant identifier (inner, used by handler).

Body (`SendMessageRequest`):

```json
{
  "senderId": "EMP-00109",
  "senderType": "employee",
  "receiverId": "STD-99882",
  "receiverType": "student",
  "content": "Please submit your homework sheet.",
  "attachmentUrl": "http://cdn.school.com/attachments/homework.pdf"
}
```

### Expected success response

`200 OK`

Returns raw `ChatMessage` struct directly — **NOT wrapped** in `{ success: true, data: ... }`.

```json
{
  "messageId": 29881,
  "senderId": "EMP-00109",
  "senderType": "employee",
  "receiverId": "STD-99882",
  "receiverType": "student",
  "content": "Please submit your homework sheet.",
  "attachmentUrl": "http://cdn.school.com/attachments/homework.pdf",
  "createdAt": "2026-06-21T08:35:00Z"
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
"Failed to send message"
```

### Important rules

- `senderId`, `senderType`, `receiverId`, `receiverType`, `content` are required.
- `attachmentUrl` is optional.
- On success, the message is published to Redis channel `school:{schoolId}:user:{receiverId}` for real-time WebSocket delivery.
- Redis failure is silently ignored — message is still persisted and returned.
- Client should not rely on `{ success: true }` wrapper for this endpoint.

### Test cases

#### Send message between employee and student

- Type: positive
- Preconditions: Valid sender and receiver IDs exist.
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-001/comm/chat/SCH-001/send`
  - Body:

```json
{
  "senderId": "EMP-00109",
  "senderType": "employee",
  "receiverId": "STD-99882",
  "receiverType": "student",
  "content": "Hello, please check your homework."
}
```

- Expected HTTP status: `200`
- Expected response: `{ messageId, senderId, senderType, receiverId, receiverType, content, createdAt }`
- Database/state assertion: A row in `chat_messages` exists with matching content.

#### Send message with attachment

- Type: positive
- Request body includes `attachmentUrl: "http://cdn.example.com/file.pdf"`
- Expected HTTP status: `200`
- Expected response: `attachmentUrl` is populated in the returned `ChatMessage`.

#### Missing content

- Type: negative
- Request body omits `content`.
- Expected HTTP status: `400` (Axum deserialization error) or `500` depending on DB constraint.

#### Send message without attachmentUrl

- Type: boundary
- Request body omits `attachmentUrl`.
- Expected HTTP status: `200`
- Expected response: `attachmentUrl` is `null`.

---

## `GET /api/school/:schoolId/comm/chat/:schoolId/history/:user1/:user2`

- Handler: `rust/src/domain/communication/chat.rs::get_history`
- Purpose: Fetch chat history between two users.
- Auth/Tenant: Relies on parent router middleware.

### Request

Path params:

- `schoolId`: school/tenant identifier (outer and inner).
- `user1`: first user ID.
- `user2`: second user ID.

### Expected success response

`200 OK`

Returns raw `Vec<ChatMessage>` directly — **NOT wrapped**.

```json
[
  {
    "messageId": 29881,
    "senderId": "EMP-00109",
    "senderType": "employee",
    "receiverId": "STD-99882",
    "receiverType": "student",
    "content": "Please submit your homework.",
    "attachmentUrl": null,
    "createdAt": "2026-06-21T08:35:00Z"
  },
  {
    "messageId": 29882,
    "senderId": "STD-99882",
    "senderType": "student",
    "receiverId": "EMP-00109",
    "receiverType": "employee",
    "content": "Yes sir, I will submit by tomorrow.",
    "attachmentUrl": null,
    "createdAt": "2026-06-21T08:36:00Z"
  }
]
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
"Failed to fetch history"
```

### Test cases

#### Fetch history between two users

- Type: positive
- Preconditions: At least 2 messages exist between `EMP-001` and `STD-001`.
- Request: `GET /api/school/SCH-001/comm/chat/SCH-001/history/EMP-001/STD-001`
- Expected HTTP status: `200`
- Expected response: JSON array of `ChatMessage` objects.
- Database/state assertion: All messages between the two users for `SCH-001` are returned.

#### Empty history

- Type: positive
- Preconditions: No messages between `EMP-099` and `STD-099`.
- Request: `GET /api/school/SCH-001/comm/chat/SCH-001/history/EMP-099/STD-099`
- Expected HTTP status: `200`
- Expected response: `[]` (empty array).

#### Invalid user format

- Type: boundary
- Request: `GET /api/school/SCH-001/comm/chat/SCH-001/history///`
- Expected HTTP status: `404` (route not matched) or `500` depending on URL parsing.

---

## `GET /api/school/:schoolId/comm/chat/:schoolId/ai-history`

- Handler: `rust/src/domain/communication/chat.rs::get_ai_chat_history`
- Purpose: Fetch AI chat history for a school.
- Auth/Tenant: Relies on parent router middleware.

### Request

Path params:

- `schoolId`: school/tenant identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "role": "user",
      "content": "What is the attendance rate for Class 10?",
      "createdAt": "2026-06-21T08:00:00Z"
    },
    {
      "role": "assistant",
      "content": "The attendance rate for Class 10 is 92% this month.",
      "createdAt": "2026-06-21T08:00:01Z"
    }
  ]
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "Failed to fetch chat history"
}
```

### Test cases

#### Fetch AI history

- Type: positive
- Preconditions: AI chat entries exist for `SCH-001`.
- Request: `GET /api/school/SCH-001/comm/chat/SCH-001/ai-history`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [{ role, content, createdAt }] }`

#### Empty AI history

- Type: positive
- Preconditions: No AI chat entries for `SCH-002`.
- Request: `GET /api/school/SCH-002/comm/chat/SCH-002/ai-history`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`