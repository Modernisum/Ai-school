# Complains Route Documentation

**File:** `src/routes/complains.rs`  
**Service:** `src/services/complain_service.rs` (Logic handles through `ComplainService`)  
**Repository:** `src/repository/postgres.rs` → `add_complain`, `get_complains`  
**Database Table:** `complains`

---

## Routes Summary

| Method | URL | Handler | Description |
|---|---|---|---|
| `GET` | `/api/complains/:school_id` | `list_complains` | School ki sabhi complaints (by school) |
| `GET` | `/api/complains/:school_id/:summary_id/complainlist` | `list_complains` | Summary-linked complaints |
| `GET` | `/api/complains/:school_id/student/:student_id` | `list_complains` | Student-specific complaints |
| `POST` | `/api/complains/:school_id` | `create_complain` | Nayi complain register karo |

---

## Route 1: List Complains

### `GET /api/complains/:school_id`

**Description:** School mein jitni bhi complains registered hain, unki list fetch karta hai.

**Parameters:**
- `school_id` (Path): School identifier.

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "school_id": "SCH001",
      "student_id": "STU123",
      "title": "Water Issue",
      "description": "Drinking water is not available on 2nd floor",
      "created_at": "2024-03-11T10:00:00Z"
    }
  ]
}
```

---

## Route 2: Create Complain

### `POST /api/complains/:school_id`

**Description:** Nayi complain register karta hai.

**Parameters:**
- `school_id` (Path): School identifier.
- Body (JSON):
    - `studentId` (String, Optional): Student unique ID.
    - `title` (String): Complain ka title.
    - `description` (String, Optional): Detail description.

**Request Example:**
```json
{
  "studentId": "STU123",
  "title": "Water Issue",
  "description": "Drinking water is not available on 2nd floor"
}
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "studentId": "STU123",
    "title": "Water Issue",
    "description": "Drinking water is not available on 2nd floor"
  }
}
```

---

## Database Schema Highlights

**Table:** `complains`
- `id`: SERIAL (Primary Key)
- `school_id`: VARCHAR
- `student_id`: VARCHAR (Linked to `students` table)
- `title`: TEXT
- `description`: TEXT
- `created_at`: TIMESTAMPTZ (Default: NOW())
