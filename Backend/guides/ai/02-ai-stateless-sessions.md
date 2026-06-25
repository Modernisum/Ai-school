# Python v1 AI Stateless Query & Sessions API Contract

Covers general AI query and chat session CRUD endpoints from `python/app/api/v1/ai.py`.

Source:
- Router: `python/app/api/v1/ai.py:11`
- Orchestrator: `python/app/services/ai/orchestrator.py`
- RLS middleware: `python/app/middleware/rls.py`

---

## `POST /api/school/{schoolId}/query`

### Purpose

Send a stateless general AI query and get a response. No session context required.

### Auth

Bearer token via `get_db_with_rls` dependency.

### Handler

`python/app/api/v1/ai.py:38-50`

### Path params

- `schoolId` (string, required): School tenant ID.

### Request body

```json
{
  "query": "What is the student attendance rate for class 10?"
}
```

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": {
    "response": "The attendance rate for class 10 is 92%...",
    "sources": []
  }
}
```

### Expected error responses

Empty query (HTTP 400):

```json
{
  "detail": "Query cannot be empty"
}
```

Internal error (HTTP 500):

```json
{
  "detail": "<error message>"
}
```

### Important rules

- Query is trimmed and checked for non-empty before processing.
- `schoolId` is passed to the orchestrator for tenant-scoped context.
- Error responses use FastAPI's `HTTPException`, so the error shape is `{ "detail": "..." }` not `{ "success": false, "message": "..." }`.

### Test cases

#### TC_PYV1_AI_001 Stateless query happy path

- Type: positive
- Preconditions: Valid bearer token, school exists.
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/query`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "query": "What is the student attendance rate?" }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` is an object.

#### TC_PYV1_AI_002 Empty query

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/query`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "query": "   " }`
- Expected HTTP status: `400`
- Expected response: `detail == "Query cannot be empty"`.

---

## `POST /api/school/{schoolId}/ai/session`

### Purpose

Create a new AI chat session for the school.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:53-76`

### Path params

- `schoolId` (string, required): School tenant ID.

### Request body

```json
{
  "title": "Research on student performance"
}
```

`title` is optional; defaults to `"New Research Session"`.

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Expected error responses

Internal error (HTTP 500):

```json
{
  "detail": "<error message>"
}
```

### Important rules

- `user_id` is hardcoded to `"default"` in the current implementation.
- Session ID is generated via `uuid.uuid4()`.
- Inserts into `ai_chat_sessions` table.

### Test cases

#### TC_PYV1_AI_003 Create session with title

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/session`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "title": "My Research" }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `session_id` is a valid UUID string.
- Database assertion: Row exists in `ai_chat_sessions` with matching `session_id`.

#### TC_PYV1_AI_004 Create session without title

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/session`
  - Header: `Authorization: Bearer <token>`
  - Body: `{}`
- Expected HTTP status: `200`
- Expected response: `success == true`, `session_id` is a valid UUID.
- Database assertion: Title is `"New Research Session"`.

---

## `GET /api/school/{schoolId}/ai/sessions`

### Purpose

List all AI chat sessions for the school, with message counts and last activity.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:78-114`

### Path params

- `schoolId` (string, required): School tenant ID.

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": [
    {
      "session_id": "a1b2c3d4-...",
      "school_id": "SCH-00021",
      "user_id": "default",
      "title": "My Research",
      "is_active": true,
      "created_at": "2026-06-22 12:00:00",
      "updated_at": "2026-06-22 14:30:00",
      "message_count": 5,
      "last_message_at": "2026-06-22 14:30:00"
    }
  ]
}
```

### Important rules

- Results are filtered by `school_id` and `user_id = "default"`.
- Ordered by `updated_at DESC`.
- `message_count` and `last_message_at` come from a LEFT JOIN on `ai_chat_history` subquery.
- `is_active` is a boolean; `created_at` and `updated_at` are returned as strings.

### Test cases

#### TC_PYV1_AI_005 List sessions

- Type: positive
- Preconditions: At least one session exists for the school.
- Request:
  - Method: `GET`
  - Route: `/api/school/SCH-00021/ai/sessions`
  - Header: `Authorization: Bearer <token>`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` is an array, each item has `session_id`, `title`, `message_count`.

#### TC_PYV1_AI_006 List sessions empty

- Type: positive
- Preconditions: No sessions exist for the school.
- Request:
  - Method: `GET`
  - Route: `/api/school/SCH-00021/ai/sessions`
  - Header: `Authorization: Bearer <token>`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` is an empty array.

---

## `GET /api/school/{schoolId}/ai/session/{sessionId}/history`

### Purpose

Fetch chat history messages for a specific session, ordered by creation time.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:116-140`

### Path params

- `schoolId` (string, required): School tenant ID.
- `sessionId` (string, required): Session UUID.

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "role": "user",
      "content": "What is the attendance rate?",
      "created_at": "2026-06-22 12:00:00"
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "The attendance rate is 92%...",
      "created_at": "2026-06-22 12:00:05"
    }
  ]
}
```

### Important rules

- History is ordered by `created_at ASC`.
- No tenant check on `sessionId` - any `sessionId` can be queried from any `schoolId` path. This is a current-code gap.

### Test cases

#### TC_PYV1_AI_007 Get session history

- Type: positive
- Preconditions: Session exists with some messages.
- Request:
  - Method: `GET`
  - Route: `/api/school/SCH-00021/ai/session/<session_id>/history`
  - Header: `Authorization: Bearer <token>`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` is array of messages with `role`, `content`, `created_at`.

#### TC_PYV1_AI_008 Get history for non-existent session

- Type: boundary
- Request:
  - Method: `GET`
  - Route: `/api/school/SCH-00021/ai/session/00000000-0000-0000-0000-000000000000/history`
  - Header: `Authorization: Bearer <token>`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` is an empty array.

---

## `POST /api/school/{schoolId}/ai/session/{sessionId}/query`

### Purpose

Send a query within an existing chat session context.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:142-155`

### Path params

- `schoolId` (string, required): School tenant ID.
- `sessionId` (string, required): Session UUID.

### Request body

```json
{
  "query": "Tell me more about class 10 performance"
}
```

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": {
    "response": "Class 10 has shown improvement...",
    "sources": []
  }
}
```

### Expected error responses

Empty query (HTTP 400):

```json
{
  "detail": "Query cannot be empty"
}
```

### Test cases

#### TC_PYV1_AI_009 Session query happy path

- Type: positive
- Preconditions: Session exists.
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/session/<session_id>/query`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "query": "Tell me about class performance" }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` is an object.

---

## `POST /api/school/{schoolId}/ai/session/{sessionId}/query/stream`

### Purpose

Send a query and receive a Server-Sent Events (SSE) streaming response.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:157-171`

### Path params

- `schoolId` (string, required): School tenant ID.
- `sessionId` (string, required): Session UUID.

### Request body

```json
{
  "query": "Explain the attendance trends"
}
```

### Expected success response

**Status:** `200`
**Content-Type:** `text/event-stream`

Stream of SSE events with AI response chunks.

### Expected error responses

Empty query (HTTP 400):

```json
{
  "detail": "Query cannot be empty"
}
```

### Test cases

#### TC_PYV1_AI_010 Stream query

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/session/<session_id>/query/stream`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "query": "Explain trends" }`
- Expected HTTP status: `200`
- Expected response: Content-Type is `text/event-stream`, response body contains SSE formatted data.

---

## `DELETE /api/school/{schoolId}/ai/session/{sessionId}`

### Purpose

Delete an AI chat session and its history.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:173-189`

### Path params

- `schoolId` (string, required): School tenant ID.
- `sessionId` (string, required): Session UUID.

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "deleted": true
}
```

If session doesn't exist or doesn't belong to the school:

```json
{
  "success": false,
  "deleted": false
}
```

### Important rules

- Delete is scoped to `school_id` - only sessions belonging to the path `schoolId` are deleted.
- Returns `success: false, deleted: false` (HTTP 200) when no matching row found, not a 404.

### Test cases

#### TC_PYV1_AI_011 Delete session

- Type: positive
- Preconditions: Session exists for the school.
- Request:
  - Method: `DELETE`
  - Route: `/api/school/SCH-00021/ai/session/<session_id>`
  - Header: `Authorization: Bearer <token>`
- Expected HTTP status: `200`
- Expected response: `success == true`, `deleted == true`.
- Database assertion: Session no longer exists in `ai_chat_sessions`.

#### TC_PYV1_AI_012 Delete non-existent session

- Type: boundary
- Request:
  - Method: `DELETE`
  - Route: `/api/school/SCH-00021/ai/session/00000000-0000-0000-0000-000000000000`
  - Header: `Authorization: Bearer <token>`
- Expected HTTP status: `200`
- Expected response: `success == false`, `deleted == false`.

---

## `PUT /api/school/{schoolId}/ai/session/{sessionId}`

### Purpose

Rename an AI chat session.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:191-209`

### Path params

- `schoolId` (string, required): School tenant ID.
- `sessionId` (string, required): Session UUID.

### Request body

```json
{
  "title": "Updated Research Title"
}
```

### Expected success response

**Status:** `200`

```json
{
  "success": true
}
```

If session doesn't exist:

```json
{
  "success": false
}
```

### Expected error responses

Empty title (HTTP 400):

```json
{
  "detail": "Title cannot be empty"
}
```

### Test cases

#### TC_PYV1_AI_013 Rename session

- Type: positive
- Preconditions: Session exists.
- Request:
  - Method: `PUT`
  - Route: `/api/school/SCH-00021/ai/session/<session_id>`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "title": "New Title" }`
- Expected HTTP status: `200`
- Expected response: `success == true`.
- Database assertion: `ai_chat_sessions.title` updated.

#### TC_PYV1_AI_014 Rename with empty title

- Type: negative
- Request:
  - Method: `PUT`
  - Route: `/api/school/SCH-00021/ai/session/<session_id>`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "title": "   " }`
- Expected HTTP status: `400`
- Expected response: `detail == "Title cannot be empty"`.

---

## `PATCH /api/school/{schoolId}/ai/session/{sessionId}/archive`

### Purpose

Archive or unarchive a chat session by toggling `is_active`.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:211-227`

### Path params

- `schoolId` (string, required): School tenant ID.
- `sessionId` (string, required): Session UUID.

### Request body

```json
{
  "is_active": false
}
```

### Expected success response

**Status:** `200`

```json
{
  "success": true
}
```

### Test cases

#### TC_PYV1_AI_015 Archive session

- Type: positive
- Request:
  - Method: `PATCH`
  - Route: `/api/school/SCH-00021/ai/session/<session_id>/archive`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "is_active": false }`
- Expected HTTP status: `200`
- Expected response: `success == true`.
- Database assertion: `ai_chat_sessions.is_active = false`, `updated_at` updated.

#### TC_PYV1_AI_016 Unarchive session

- Type: positive
- Request:
  - Method: `PATCH`
  - Route: `/api/school/SCH-00021/ai/session/<session_id>/archive`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "is_active": true }`
- Expected HTTP status: `200`
- Expected response: `success == true`.