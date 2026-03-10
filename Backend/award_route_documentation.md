# Award Route Documentation

**File:** `src/routes/award.rs`  
**Service:** `src/services/award_service.rs`  
**Repository:** `src/repository/postgres.rs`  
**Database Table:** `awards`

---

## Routes Summary

| # | Method | URL | Handler | Description |
|---|---|---|---|---|
| 1 | `GET` | `/api/award/:school_id` | `list_awards` | School ke sabhi awards list karo |

---

## Route 1: List Awards

### `GET /api/award/:school_id`

School ke saare student awards return karta hai.

**Parameters:**

| Param | Location | Required | Description |
|---|---|---|---|
| `school_id` | URL Path | ✅ | School identifier |

**Example Request:**
```
GET /api/award/SCHOOL123
```

---

### Internal Workflow

```
Client
  │
  ▼
GET /api/awards/:school_id
  │
  ▼
award_service.list_awards(school_id)
  │
  ▼
Repository: get_awards(school_id)
  │
  ▼
SQL:
  SELECT * FROM awards WHERE school_id = $1
  │
  ▼
Response: [{ id, awardName }, ...]
```

---

### Success Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "awardName": "Best Student Award"
    },
    {
      "id": 2,
      "awardName": "Sports Champion"
    }
  ]
}
```

### Error Response

```json
{
  "success": false,
  "message": "Database error..."
}
```

---

## Database Table: `awards`

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL | Auto primary key |
| `school_id` | VARCHAR | School identifier |
| `student_id` | VARCHAR | Winning student |
| `award_name` | TEXT | Award ka naam |
| `description` | TEXT | Details |
| `date` | DATE | Award date |
| `created_at` | TIMESTAMPTZ | Auto |

---

## Layer Architecture

```
Route (award.rs)
  └─► AwardService (award_service.rs)
         └─► AwardRepository (postgres.rs)
                └─► PostgreSQL: awards table
```

> **Note:** `award.rs` mein sirf `list_awards` route hai. Award **create** karna kisi aur route ya service se hota hoga (e.g., student profile update ke time).
