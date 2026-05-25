# Resources API — Event Tests

> Base URL: `/api/school/{schoolId}/resources/events`
> Auth: `X-School-ID` + `X-Admin-ID` headers (RLS middleware)
> Test school: `689225`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  routes/events.rs              HTTP Handlers        │
│  (src/routes/events.rs)       Parse request         │
├─────────────────────────────────────────────────────┤
│  services/traits/resource.rs  ResourceService Trait │
│  (delegated to equipment service)                   │
├─────────────────────────────────────────────────────┤
│  services/resource/mod.rs     PostgresResourceService│
│  (delegates to self.equipment)                      │
├─────────────────────────────────────────────────────┤
│  repository/resource_repo.rs  SQL queries            │
└─────────────────────────────────────────────────────┘
```

---

## Event: List

- **Endpoint**: `GET /api/school/689225/resources/events`
- **Method**: GET
- **Handler**: `events::list_events` (`src/routes/events.rs:21`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/events.rs` | 25 | `service.list_events(&school_id)` |
| 2. Service trait | `services/traits/resource.rs` | 110 | `async fn list_events()` |
| 3. Service impl | `services/resource/mod.rs` | 144-147 | `self.equipment.list_events(school_id)` |
| 4. Repo impl | `repository/resource_repo.rs` | (search `list_events`) | SQL: `SELECT * FROM events WHERE school_id = $1` |

### Action Check ⚠️
- **Worth it?** ✅ Yes — resource events listing
- **Bug?** ⚠️ No pagination or filtering

### Usage
```bash
curl -s "http://localhost:8080/api/school/689225/resources/events" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## Event: Create

- **Endpoint**: `POST /api/school/689225/resources/events`
- **Method**: POST
- **Handler**: `events::create_event` (`src/routes/events.rs:11`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/events.rs` | 17 | `service.create_event(&school_id, &admin_id, payload)` |
| 2. Service trait | `services/traits/resource.rs` | 109 | `async fn create_event()` |
| 3. Service impl | `services/resource/mod.rs` | 130-133 | `self.equipment.create_event(school_id, admin_id, data)` |
| 4. Repo impl | `repository/resource_repo.rs` | (search `create_event`) | SQL: `INSERT INTO events` |

### Action Check ✅
- **Worth it?** ✅ Yes — scheduling inspections, maintenance

### Usage
```bash
curl -s -X POST "http://localhost:8080/api/school/689225/resources/events" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Annual Lab Inspection",
    "description": "Safety and equipment check",
    "eventDate": "2026-06-15T10:00:00Z",
    "spaceName": "PhysicsLab-A"
  }' | jq .
```

---

## Event: Update

- **Endpoint**: `PATCH /api/school/689225/resources/events/{eventId}`
- **Method**: PATCH
- **Handler**: `events::update_event` (`src/routes/events.rs:29`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/events.rs` | 35 | `service.update_event(&school_id, &admin_id, event_id, payload)` |
| 2. Service trait | `services/traits/resource.rs` | 111 | `async fn update_event()` |
| 3. Service impl | `services/resource/mod.rs` | 149-157 | `self.equipment.update_event(school_id, admin_id, event_id, data)` |

### Action Check ✅
- **Worth it?** ✅ Yes — rescheduling events

### Usage
```bash
curl -s -X PATCH "http://localhost:8080/api/school/689225/resources/events/1" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated — Lab Safety Inspection",
    "eventDate": "2026-07-01T10:00:00Z"
  }' | jq .
```

---

## Event: Delete

- **Endpoint**: `DELETE /api/school/689225/resources/events/{eventId}`
- **Method**: DELETE
- **Handler**: `events::delete_event` (`src/routes/events.rs:39`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/events.rs` | 44 | `service.delete_event(&school_id, &admin_id, event_id)` |
| 2. Service trait | `services/traits/resource.rs` | 112 | `async fn delete_event()` |
| 3. Service impl | `services/resource/mod.rs` | 155-157 | `self.equipment.delete_event(school_id, admin_id, event_id)` |

### Action Check ✅
- **Worth it?** ✅ Yes — removing events

### Usage
```bash
curl -s -X DELETE "http://localhost:8080/api/school/689225/resources/events/1" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## ⚠️ All Issues Found

| # | Issue | Severity | Suggestion |
|---|-------|----------|------------|
| 1 | Events are generic — no `eventType` field | Low | Add enum (maintenance, inspection, repair) |
| 2 | No recurrence support | Low | Add `repeat` field |
| 3 | No pagination | Low | Events may grow over time |
| 4 | No space name validation | Medium | Events reference `spaceName` but no FK validation |
