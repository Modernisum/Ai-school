# Reminder, Task & Topic Route Documentation

---

## Reminder — `src/routes/reminder.rs`

**Service:** `src/services/reminder_service.rs`  
**Table:** `reminders`

| Method | URL | Description |
|---|---|---|
| `GET` | `/api/reminders/:school_id` | School ke sabhi reminders list karo |

### `GET /api/reminders/:school_id`
```
→ SELECT * FROM reminders WHERE school_id = $1 ORDER BY remind_at ASC
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "school_id": "SCH001",
      "title": "Fee collection deadline",
      "description": "Collect fees for March",
      "remind_at": "2026-03-31T09:00:00Z",
      "created_at": "2026-03-01T10:00:00Z"
    }
  ]
}
```
> **DB Table:** `reminders` — columns: `id`, `school_id`, `title`, `description`, `remind_at`, `created_at`

---

## Task — `src/routes/task.rs`

**Service:** `src/services/task_service.rs`  
**Table:** `tasks`

| Method | URL | Description |
|---|---|---|
| `GET` | `/api/tasks/:school_id` | School ke sabhi tasks list karo |

### `GET /api/tasks/:school_id`
```
→ SELECT * FROM tasks WHERE school_id = $1
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "task_name": "Prepare report cards",
      "user_type": "employee",
      "status": "pending",
      "complete_percentage": 40.0,
      "created_at": "..."
    }
  ]
}
```
> **DB Table:** `tasks` — columns: `school_id`, `user_type`, `parent_id`, `task_name`, `time_duration`, `complete_percentage`, `status`, `update_logs`, `created_at`, `updated_at`

---

## Topic — `src/routes/topic.rs`

**Service:** `src/services/academic_service.rs`  
**Table:** `topics`

| Method | URL | Description |
|---|---|---|
| `POST` | `/api/topics` | Naya topic create karo (no school_id in URL) |

### `POST /api/topics`
```json
// Body:
{
  "subjectId": "SUBJ001",
  "name": "Newton's Laws",
  "description": "Introduction to motion"
}
```
```sql
-- DB:
INSERT INTO topics (subject_id, name, description) VALUES ($1, $2, $3)
```
**Response:** Raw service return (no `success` wrapper — `Json(data)` directly)

> **Note:** Topic route does NOT include `school_id` in URL path — it relies on `subject_id` to scope the data.
