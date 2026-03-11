# Responsibility Route Documentation

**File:** `src/routes/responsibility.rs`  
**Service:** `src/services/responsibility_service.rs`  
**Tables:** `responsibilities`, `employee_responsibilities`, `responsibility_spaces`

---

## Routes Summary

| # | Method | URL | Handler | Description |
|---|---|---|---|---|
| 1 | `GET` | `/api/responsibilities/:school_id` | `list_responsibilities` | School ki sabhi responsibilities |
| 2 | `POST` | `/api/responsibilities/:school_id` | `create_responsibility` | Nayi responsibility banao |
| 3 | `POST` | `/api/responsibilities/:school_id/:employee_id/assign` | `assign_responsibility` | Employee ko assign karo |
| 4 | `DELETE` | `/api/responsibilities/:school_id/:employee_id/:responsibility_id` | `remove_responsibility` | Assignment hatao |
| 5 | `GET` | `/api/responsibilities/:school_id/:employee_id` | `list_employee_responsibilities` | Employee ki responsibilities + summary |

---

## Route 1: List All Responsibilities

### `GET /api/responsibilities/:school_id`

All responsibilities for the school with their metadata.

```sql
SELECT * FROM responsibilities WHERE school_id = $1
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "responsibilityId": "resp-uuid",
      "name": "Classroom Cleaning",
      "description": "Daily cleaning duty",
      "perDayPrice": 150.0,
      "timePeriod": "morning",
      "spaceCategory": "Classroom",
      "workLevel": "easy",
      "totalPrice": 4500.0
    }
  ]
}
```

---

## Route 2: Create Responsibility

### `POST /api/responsibilities/:school_id`

**Body:**
```json
{
  "name": "Classroom Cleaning",
  "description": "Daily cleaning duty",
  "perDayPrice": 150.0,
  "timePeriod": "morning",
  "spaceCategory": "Classroom",
  "responsibilityField": "sanitation",
  "spaceId": "SPACE-01",
  "workLevel": "easy",
  "workAmount": 1,
  "workPeriod": "daily",
  "customDates": [],
  "totalPrice": 4500.0
}
```

```sql
INSERT INTO responsibilities
  (responsibility_id, school_id, name, description, per_day_price,
   time_period, space_category, responsibility_field, space_id,
   work_level, work_amount, work_period, custom_dates, total_price)
VALUES (uuid, $1, ...)
```

**Response:**
```json
{ "success": true, "data": { "responsibilityId": "uuid", ... } }
```

---

## Route 3: Assign Responsibility to Employee

### `POST /api/responsibilities/:school_id/:employee_id/assign`

**Body:**
```json
{ "responsibilityId": "resp-uuid" }
```

> `responsibilityId` is **required** → returns `400` if missing.

```sql
INSERT INTO employee_responsibilities (school_id, employee_id, responsibility_id)
VALUES ($1, $2, $3)
ON CONFLICT DO NOTHING
```

---

## Route 4: Remove Responsibility from Employee

### `DELETE /api/responsibilities/:school_id/:employee_id/:responsibility_id`

```sql
DELETE FROM employee_responsibilities
WHERE school_id=$1 AND employee_id=$2 AND responsibility_id=$3
```

---

## Route 5: List Employee's Responsibilities (Enriched)

### `GET /api/responsibilities/:school_id/:employee_id`

Returns employee's assigned responsibilities **plus salary/cost summary**.

**Response:**
```json
{
  "success": true,
  "responsibilities": [...],
  "totalMonthlyCost": 4500.0,
  "totalAssigned": 2
}
```

> **Special:** Response is enriched — service adds summary fields. Route inserts `"success": true` directly into the returned object using `as_object_mut()`.

---

## Database Tables

| Table | Purpose |
|---|---|
| `responsibilities` | Responsibility definitions with pricing |
| `employee_responsibilities` | Employee ↔ Responsibility mapping |
| `responsibility_spaces` | Responsibility ↔ Space mapping |
