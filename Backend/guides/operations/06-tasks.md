# Tasks API Contract

Covers `list_tasks`, `update_task_status`, `ai_generate_tasks`, `ai_reorganize_tasks`.

---

## `GET /api/school/:schoolId/operations/tasks`

- Handler: `rust/src/domain/operations/task.rs::list_tasks`
- Purpose: List tasks for the school with optional date range filtering.
- Auth/Tenant: Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Query params (all optional):

| Param | Type | Description |
|---|---|---|
| `start_date` | string | Filter tasks from this date (YYYY-MM-DD) |
| `end_date` | string | Filter tasks until this date (YYYY-MM-DD) |

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "taskId": "TSK-001",
      "title": "Inspect sports equipment inventories",
      "description": "Check all sports equipment before annual day",
      "status": "todo",
      "assignedTo": "EMP-001",
      "priority": "high",
      "dueDate": "2026-07-15",
      "createdAt": "2026-06-20T10:00:00Z"
    }
  ]
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

#### List all tasks

- Type: positive
- Request: `GET /api/school/SCH-001/operations/tasks`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [...] }`
- Database/state assertion: Only tasks for `SCH-001` are returned.

#### List tasks with date range

- Type: positive
- Request: `GET /api/school/SCH-001/operations/tasks?start_date=2026-06-01&end_date=2026-06-30`
- Expected HTTP status: `200`
- Expected response: `data` contains only tasks within the date range.

#### Empty task list

- Type: positive
- Preconditions: No tasks exist for the school.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

#### Tenant isolation

- Type: tenant-isolation
- Request: `GET /api/school/SCH-002/operations/tasks`
- Expected HTTP status: `200`
- Database/state assertion: Only tasks from `SCH-002` are returned.

---

## `PUT /api/school/:schoolId/operations/tasks/:taskId/status`

- Handler: `rust/src/domain/operations/task.rs::update_task_status`
- Purpose: Update the status of a specific task.
- Auth/Tenant: Scoped to `schoolId` and `taskId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `taskId`: task identifier.

Body:

```json
{
  "status": "in_progress"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string | Yes | New status (e.g., `todo`, `in_progress`, `completed`) |

### Expected success response

`200 OK`

```json
{
  "success": true
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

#### Update task to in_progress

- Type: positive
- Request: `PUT /api/school/SCH-001/operations/tasks/TSK-001/status`
- Body: `{ "status": "in_progress" }`
- Expected HTTP status: `200`
- Expected response: `{ success: true }`
- Database/state assertion: `tasks` table row for `TSK-001` has `status = "in_progress"`.

#### Update to completed

- Type: positive
- Request body: `{ "status": "completed" }`
- Expected HTTP status: `200`
- Database/state assertion: Task status is `completed`.

#### Update non-existent task

- Type: negative
- Request: `PUT /api/school/SCH-001/operations/tasks/TSK-999/status`
- Body: `{ "status": "in_progress" }`
- Expected HTTP status: `500` (based on current handler behavior)
- Expected response: `{ success: false, message: "<error>" }`

#### Wrong school task

- Type: tenant-isolation
- Preconditions: `TSK-001` belongs to `SCH-001`.
- Request: `PUT /api/school/SCH-002/operations/tasks/TSK-001/status`
- Body: `{ "status": "in_progress" }`
- Expected HTTP status: `500` (no rows affected)
- Expected response: `{ success: false, message: "<error>" }`

---

## `POST /api/school/:schoolId/operations/tasks/ai/generate`

- Handler: `rust/src/domain/operations/task.rs::ai_generate_tasks`
- Purpose: Generate tasks using AI based on a natural language prompt.
- Auth/Tenant: Scoped to `schoolId`. Requires `employee_id` in body.
- External dependency: gRPC AI backend (`AiClient::connect`).

### Request

Path params:

- `schoolId`: school/tenant identifier.

Body:

```json
{
  "employee_id": "EMP-001",
  "prompt": "Prepare administrative checklist for school annual sports day."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `employee_id` | string | Yes | Employee requesting AI task generation |
| `prompt` | string | Yes | Natural language prompt describing tasks to generate |

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "taskId": "TSK-001",
        "title": "Inspect sports equipment inventories",
        "status": "todo"
      },
      {
        "taskId": "TSK-002",
        "title": "Arrange seating plan for guests",
        "status": "todo"
      }
    ]
  }
}
```

### Expected error response (missing employee_id)

`400 BAD_REQUEST`

```json
{
  "success": false,
  "message": "employee_id is required"
}
```

### Expected error response (AI backend failure)

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "Failed to connect to AI backend: <error>"
}
```

### Expected error response (AI generation failure)

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<AI error message>"
}
```

### Important rules

- `employee_id` is required and validated before calling the AI backend.
- gRPC `AiClient::connect()` is called per request.
- AI response data is parsed from JSON string in `data_json` field.
- If AI returns `success: false`, the error message from the AI response is returned.

### Test cases

#### Generate tasks from prompt

- Type: positive
- Preconditions: AI backend is running and reachable.
- Request: `POST /api/school/SCH-001/operations/tasks/ai/generate`
- Body: `{ "employee_id": "EMP-001", "prompt": "Create checklist for PTM preparation" }`
- Expected HTTP status: `200`
- Expected response: `success: true`, `data.tasks` is a non-empty array.

#### Missing employee_id

- Type: negative
- Request body: `{ "prompt": "Generate tasks" }`
- Expected HTTP status: `400`
- Expected response: `{ success: false, message: "employee_id is required" }`

#### Empty employee_id

- Type: boundary
- Request body: `{ "employee_id": "", "prompt": "Generate tasks" }`
- Expected HTTP status: `400`
- Expected response: `{ success: false, message: "employee_id is required" }`

#### AI backend unreachable

- Type: negative
- Preconditions: AI backend is down.
- Expected HTTP status: `500`
- Expected response: `message` contains `"Failed to connect to AI backend"`.

---

## `POST /api/school/:schoolId/operations/tasks/ai/reorganize`

- Handler: `rust/src/domain/operations/task.rs::ai_reorganize_tasks`
- Purpose: Reorganize existing tasks using AI based on priority, dependencies, or context.
- Auth/Tenant: Scoped to `schoolId`. Requires `employee_id` in body.
- External dependency: gRPC AI backend.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Body:

```json
{
  "employee_id": "EMP-001",
  "prompt": "Reorganize tasks by priority for PTM week.",
  "taskIds": ["TSK-001", "TSK-002", "TSK-003"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `employee_id` | string | Yes | Employee requesting reorganization |
| `prompt` | string | Yes | Natural language instruction for reorganization |
| `taskIds` | string[] | No | Specific task IDs to reorganize |

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "reorganizedTasks": [
      {
        "taskId": "TSK-002",
        "title": "Arrange seating plan",
        "newPriority": "high",
        "suggestedOrder": 1
      },
      {
        "taskId": "TSK-001",
        "title": "Inspect equipment",
        "newPriority": "medium",
        "suggestedOrder": 2
      }
    ]
  }
}
```

### Expected error response (missing employee_id)

`400 BAD_REQUEST`

```json
{
  "success": false,
  "message": "employee_id is required"
}
```

### Expected error response (server error)

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Important rules

- Same `employee_id` validation as `ai_generate_tasks`.
- Calls `ai_client.reorganize_tasks()` gRPC method.
- Response shape depends on AI backend output.

### Test cases

#### Reorganize tasks

- Type: positive
- Preconditions: AI backend is running.
- Request: `POST /api/school/SCH-001/operations/tasks/ai/reorganize`
- Body: `{ "employee_id": "EMP-001", "prompt": "Reorder by urgency", "taskIds": ["TSK-001", "TSK-002"] }`
- Expected HTTP status: `200`
- Expected response: `success: true`, `data` contains reorganized task list.

#### Missing employee_id

- Type: negative
- Request body: `{ "prompt": "Reorganize tasks" }`
- Expected HTTP status: `400`
- Expected response: `{ success: false, message: "employee_id is required" }`