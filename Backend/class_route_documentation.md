# Class Route Documentation

**File:** `src/routes/class.rs`  
**Service:** `src/services/academic_service.rs`  
**Repository:** `src/repository/postgres.rs`  
**Database Table:** `classes`

---

## Routes Summary

| # | Method | URL | Handler | Description |
|---|---|---|---|---|
| 1 | `POST` | `/api/class/:school_id/classes` | `create_class` | Naya class banao |
| 2 | `GET` | `/api/class/:school_id/classes` | `list_classes` | Sabhi classes ki detail list |
| 3 | `GET` | `/api/class/:school_id/classIds` | `list_class_ids` | Sirf class IDs ki list |

---

## Route 1: Create Class

### `POST /api/class/:school_id/classes`

School mein naya class create karta hai.

**Parameters:**

| Param | Location | Required | Description |
|---|---|---|---|
| `school_id` | URL Path | ✅ | School identifier |
| `id` | JSON Body | ✅ | Class ka unique ID (e.g., `Class-10`) |
| `name` | JSON Body | ✅ | Display name |
| `room_number` | JSON Body | ❌ | Class room number |
| `class_fees` | JSON Body | ❌ | Default class fees (FLOAT) |
| `sections` | JSON Body | ❌ | Sections array, e.g., `["A","B"]` |
| `streams` | JSON Body | ❌ | Streams array, e.g., `["Science","Commerce"]` |

**Example Request:**
```
POST /api/classes/SCHOOL123

Body:
{
  "id": "Class-10",
  "name": "Class 10",
  "roomNumber": "101",
  "classFees": 5000.0,
  "sections": ["A", "B", "C"],
  "streams": ["Science", "Commerce"]
}
```

**Internal Workflow:**
```
Client
  │
  ▼
POST /api/classes/:school_id
  │
  ▼
academic_service.create_class(school_id, payload)
  │
  ▼
Repository: add_class(school_id, data)
  │
  ▼
SQL:
  INSERT INTO classes
    (id, school_id, name, total_students, total_teachers,
     total_periods, room_number, class_fees, sections, streams)
  VALUES ($1, $2, $3, 0, 0, 0, $4, $5, $6, $7)
  ON CONFLICT (school_id, id) DO UPDATE SET name = EXCLUDED.name, ...
  │
  ▼
Response: created class data
```

**Success Response:**
```json
{
  "success": true,
  "message": "Class created successfully",
  "data": {
    "id": "Class-10",
    "name": "Class 10",
    "sections": ["A", "B", "C"]
  }
}
```

**Error Response:**
```json
{ "success": false, "message": "Database error..." }
```

---

## Route 2: List Classes (Full Details)

### `GET /api/class/:school_id/classes`

School ki saari classes poori detail ke saath return karta hai.

**Example:**
```
GET /api/classes/SCHOOL123
```

**Success Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "Class-10",
      "name": "Class 10",
      "totalStudents": 45,
      "totalTeachers": 8,
      "totalPeriods": 6,
      "roomNumber": "101",
      "classFees": 5000.0,
      "sections": ["A", "B", "C"],
      "streams": ["Science", "Commerce"]
    }
  ]
}
```

**SQL:**
```sql
SELECT * FROM classes WHERE school_id = $1 ORDER BY name ASC
```

---

## Route 3: List Class IDs Only

### `GET /api/class/:school_id/classIds`

Sirf class IDs ki list — lightweight response jab full details ki zaroorat nahi.

**Example:**
```
GET /api/classes/SCHOOL123/ids
```

**Success Response:**
```json
{
  "success": true,
  "classIds": ["Class-8", "Class-9", "Class-10", "Class-11", "Class-12"]
}
```

**SQL:**
```sql
SELECT id FROM classes WHERE school_id = $1 ORDER BY id ASC
```

---

## Database Table: `classes`

| Column | Type | Set By |
|---|---|---|
| `id` | VARCHAR | Body: class identifier |
| `school_id` | VARCHAR | URL param |
| `name` | VARCHAR | Body: display name |
| `total_students` | INT | Auto-updated (DEFAULT 0) |
| `total_teachers` | INT | Auto-updated (DEFAULT 0) |
| `total_periods` | INT | Auto-updated (DEFAULT 0) |
| `room_number` | VARCHAR | Body (optional) |
| `class_fees` | FLOAT | Body (optional) |
| `sections` | JSONB | Body (optional) |
| `streams` | JSONB | Body (optional) |
| | | PRIMARY KEY(school_id, id) |

---

## Layer Architecture

```
Route (class.rs)
  └─► AcademicService (academic_service.rs)
         └─► Repository (postgres.rs)
                └─► PostgreSQL: classes table
```

---

## Use Cases

| Route | Frontend Use |
|---|---|
| `create_class` | Admin panel → "Add New Class" form |
| `list_classes` | Dashboard → Class list with student counts |
| `list_class_ids` | Dropdowns → Attendance, Fee filter, Subject assignment |
