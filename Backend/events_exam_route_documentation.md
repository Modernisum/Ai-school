# Events & Exam Route Documentation

---

## Events — `src/routes/events.rs`

**Service:** `src/services/resource_service.rs`  
**Table:** `events`

| Method | URL | Description |
|---|---|---|
| `POST` | `/api/events/:school_id` | Naya school event create karo |

### `POST /api/events/:school_id`

**Body:**
```json
{
  "title": "Annual Day",
  "description": "Annual function of the school",
  "date": "2026-04-15",
  "location": "School Auditorium"
}
```

**Workflow:**
```
Route → resource_service.create_event(school_id, payload)
      → repos.resource.add_event_summary(school_id, data)
      → INSERT INTO events (school_id, ...) VALUES (...)
```

**Success Response:**
```json
{ "success": true, "data": { "title": "Annual Day", ... } }
```

---

## Exam — `src/routes/exam.rs`

**Service:** `src/services/academic_service.rs`  
**Tables:** `exams`, `audit_logs`

| Method | URL | Description |
|---|---|---|
| `POST` | `/api/exams/:school_id` | Naya exam create/update karo aur marks submit karo |

### `POST /api/exams/:school_id`

**Body:**
```json
{
  "name": "Half Yearly - 2026",
  "startDate": "2026-04-01",
  "endDate": "2026-04-10"
}
```

**Workflow:**
```
Route → academic_service.create_exam(school_id, payload)
      → INSERT INTO exams (school_id, name, start_date, end_date)
        ON CONFLICT (school_id, name) DO UPDATE SET dates
      → INSERT INTO audit_logs (..., action='submit_marks')
```

**Success Response:**
Returns whatever the service returns directly (no wrapper — `Json(data)`).
