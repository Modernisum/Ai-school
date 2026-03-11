# Spaces Route Documentation

**File:** `src/routes/spaces.rs`  
**Service:** `src/services/resource_service.rs`  
**Tables:** `spaces`, `space_categories`, `space_materials`, `space_employees`

---

## Routes Summary

| # | Method | URL | Handler | Description |
|---|---|---|---|---|
| 1 | `GET` | `/api/spaces/:school_id` | `list_spaces` | Sabhi spaces list karo |
| 2 | `POST` | `/api/spaces/:school_id/bulk` | `bulk_import_spaces` | Bulk spaces import karo |
| 3 | `GET` | `/api/spaces/:school_id/categories` | `get_space_categories` | Space categories list |
| 4 | `POST` | `/api/spaces/:school_id/categories` | `create_space_category` | Nayi category banao |
| 5 | `DELETE` | `/api/spaces/:school_id/categories/:category_id` | `delete_category` | Category delete karo |
| 6 | `POST` | `/api/spaces/:school_id` | `create_space` | Naya space banao |
| 7 | `PUT` | `/api/spaces/:school_id/:space_id` | `update_space` | Space update karo |
| 8 | `DELETE` | `/api/spaces/:school_id/:space_id` | `delete_space` | Space delete karo |
| 9 | `GET` | `/api/spaces/:school_id/:space_id` | `get_space_details` | Space ki details lo |
| 10 | `POST` | `/api/spaces/:school_id/:space_id/materials` | `assign_space_materials` | Materials assign karo |
| 11 | `POST` | `/api/spaces/:school_id/:space_id/employees` | `assign_space_employees` | Employees assign karo |
| 12 | `DELETE` | `/api/spaces/:school_id/:space_id/employees/:employee_id` | `remove_space_employee` | Employee hatao |

---

## Route 1: List All Spaces
```
GET /api/spaces/:school_id
→ SELECT * FROM spaces WHERE school_id = $1
```
**Response:**
```json
{ "success": true, "data": [{ "spaceId": "sp-01", "spaceName": "Library", ... }] }
```

---

## Route 2: Bulk Import Spaces
```
POST /api/spaces/:school_id/bulk
Body: { "spaces": [{ "Space Name": "Library" }, { "Space Name": "Lab" }] }

→ For each row: create_space()
→ Returns successCount + failCount
```

---

## Route 3 & 4: Space Categories

```
GET /api/spaces/:school_id/categories
→ SELECT * FROM space_categories WHERE school_id = $1

POST /api/spaces/:school_id/categories
Body: { "name": "Labs" }
→ INSERT INTO space_categories (school_id, name, is_default) VALUES ($1, $2, FALSE)
  ON CONFLICT DO NOTHING
```

---

## Route 5: Delete Category
```
DELETE /api/spaces/:school_id/categories/:category_id
(category_id is an integer)
→ DELETE FROM space_categories WHERE school_id=$1 AND id=$2
```

---

## Route 6: Create Space
```
POST /api/spaces/:school_id
Body:
{
  "spaceName": "Computer Lab 1",
  "spaceCategory": "Labs",
  "spaceNumber": "101",
  "capacity": 30,
  "data": {}
}

→ INSERT INTO spaces
    (space_id, school_id, space_name, space_category, space_number, capacity, data)
  VALUES (uuid, $1, ...)
  ON CONFLICT (space_id) DO NOTHING
```
**Response:** `{ "success": true, "space": { ... } }`

---

## Route 7: Update Space
```
PUT /api/spaces/:school_id/:space_id
Body: { "capacity": 40, "spaceName": "Updated Lab" }
→ UPDATE spaces SET ... WHERE school_id=$1 AND space_id=$2
```

---

## Route 8: Delete Space
```
DELETE /api/spaces/:school_id/:space_id
→ DELETE FROM spaces WHERE school_id=$1 AND space_id=$2
```

---

## Route 9: Get Space Details (with materials + employees)
```
GET /api/spaces/:school_id/:space_id
→ SELECT spaces.* FROM spaces WHERE school_id=$1 AND space_id=$2
  + JOIN space_materials
  + JOIN space_employees
→ Returns full space object with assigned staff and materials

404 if not found
```
**Response:** `{ "success": true, "space": { ..., "materials": [...], "employees": [...] } }`

---

## Route 10: Assign Materials to Space
```
POST /api/spaces/:school_id/:space_id/materials
Body: [
  { "materialName": "Chair", "quantity": 30, "unit": "pieces" },
  { "materialName": "Table", "quantity": 10, "unit": "pieces" }
]

→ For each material:
  INSERT INTO space_materials (school_id, space_id, material_name, quantity, unit)
  VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT DO UPDATE SET quantity = EXCLUDED.quantity
```

---

## Route 11: Assign Employees to Space
```
POST /api/spaces/:school_id/:space_id/employees
Body: ["EMP001", "EMP002", "EMP003"]  // Array of employee IDs

→ For each employee_id:
  INSERT INTO space_employees (school_id, space_id, employee_id)
  VALUES ($1, $2, $3) ON CONFLICT DO NOTHING
```

---

## Route 12: Remove Employee from Space
```
DELETE /api/spaces/:school_id/:space_id/employees/:employee_id
→ DELETE FROM space_employees
  WHERE school_id=$1 AND space_id=$2 AND employee_id=$3
```

---

## Entity Relationship

```
space_categories ──► spaces ──┬──► space_materials (materials assigned)
                               └──► space_employees (employees assigned)
```
