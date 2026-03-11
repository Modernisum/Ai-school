# Announcement Route Documentation

**File:** `src/routes/announcement.rs`  
**Service:** `src/services/resource_service.rs`  
**Repository:** `src/repository/postgres.rs` → `add_announcement`  
**Database Table:** `announcements`

---

## Routes Summary

| Method | URL | Handler | Description |
|---|---|---|---|
| `POST` | `/api/announcements/:school_id/:type/:user_id` | `create_announcement` | Naya announcement create karo |

---

## Route 1: Create Announcement

### `POST /api/announcements/:school_id/:type/:user_id`

**Description:** School mein koi nayi announcement create karta hai — school-wide, class-specific, ya kisi student/employee ke liye.

---

### Request

| Parameter | Type | Location | Required | Description |
|---|---|---|---|---|
| `school_id` | String | URL Path | ✅ | School identifier |
| `type` | String | URL Path | ✅ | Target type: `school` / `class` / `student` / `employee` |
| `user_id` | String | URL Path | ✅ | Target user ya class ka ID |
| `title` | String | JSON Body | ✅ | Announcement ka title |
| `content` | String | JSON Body | ✅ | Announcement ka content/body |

**Example Request:**
```
POST /api/announcements/SCHOOL123/class/Class-10A

Body:
{
  "title": "Holiday Tomorrow",
  "content": "Kal school band rahega. Ghar mein padhai karein."
}
```

---

### Response

#### ✅ Success — `200 OK`
```json
{
  "success": true,
  "data": {
    "title": "Holiday Tomorrow",
    "content": "Kal school band rahega. Ghar mein padhai karein."
  }
}
```

#### ❌ Error — `500 Internal Server Error`
```json
{
  "success": false,
  "message": "error message here"
}
```

---

## Internal Workflow

```
Client
  │
  ▼
POST /api/announcements/:school_id/:type/:user_id
     + { "title": "...", "content": "..." }
  │
  ▼
[Route Handler: create_announcement]
  │
  │  school_id  ─── URL se
  │  type_str   ─── URL se  (school/class/student/employee)
  │  user_id    ─── URL se
  │  payload    ─── JSON body se (title + content)
  │
  ▼
state.services.resource.create_announcement(school_id, type_str, user_id, payload)
  │
  ▼
[Service: PostgresResourceService]
  │
  └─► repos.resource.add_announcement(school_id, type_str, user_id, data)
          │
          ▼
     [Repository: PostgresResourceRepository]
          │
          ▼
     SQL:
     INSERT INTO announcements
       (school_id, target_type, user_id, title, content)
     VALUES ($1, $2, $3, $4, $5)
          │
          ▼
     DB mein save hota hai ✅
          │
          ▼
     Original payload wapas return hota hai
  │
  ▼
JSON Response: { "success": true, "data": { payload } }
```

---

## Database

**Table:** `announcements`

| Column | Type | Value Set |
|---|---|---|
| `school_id` | VARCHAR | URL se aata hai |
| `target_type` | VARCHAR | URL ka `:type` param (school/class/student/employee) |
| `user_id` | VARCHAR | URL ka `:user_id` param |
| `title` | TEXT | Body ka `title` |
| `content` | TEXT | Body ka `content` |
| `created_at` | TIMESTAMPTZ | Auto — `DEFAULT NOW()` |

---

## `target_type` Values — Use Cases

| `type` Value | `user_id` Example | Meaning |
|---|---|---|
| `school` | `all` ya school_id | Poore school ke liye |
| `class` | `Class-10A` | Ek specific class ke liye |
| `student` | `STU001` | Ek student ke liye |
| `employee` | `EMP012` | Ek employee ke liye |

**Query filter in GET (announcements read ke waqt):**
```sql
SELECT * FROM announcements
WHERE school_id = $1
  AND target_type = $2
  AND (user_id = $3 OR user_id IS NULL)
```
> Matlab: apne khud ke announcements + school-wide `NULL` announcements dono dikhte hain.

---

## Layer Architecture

```
Route (ai.rs)
  └─► ResourceService (resource_service.rs)
          └─► ResourceRepository (postgres.rs)
                  └─► PostgreSQL: announcements table
```

---

## Example Scenarios

### Scenario 1 — School-Wide Holiday Notice
```
POST /api/announcements/SCHOOL123/school/school123
{
  "title": "Republic Day Holiday",
  "content": "26 January ko school band rahega."
}
```

### Scenario 2 — Class Notice
```
POST /api/announcements/SCHOOL123/class/Class-9B
{
  "title": "PTM Tomorrow",
  "content": "Kal parents ko school bulaya gaya hai."
}
```

### Scenario 3 — Individual Student Notice
```
POST /api/announcements/SCHOOL123/student/STU045
{
  "title": "Fee Reminder",
  "content": "Aapki fees abhi bhi pending hai."
}
```
