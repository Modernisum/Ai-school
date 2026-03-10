# Employees Route Documentation

**File:** `src/routes/employees.rs`  
**Service:** `src/services/employee_service.rs`  
**Repository:** `src/repository/postgres.rs` → `create_employee`, `get_employees`, etc.  
**Database Tables:** `employees`, `employee_experience`, `employee_education`

---

## Routes Summary

| Method | URL | Handler | Description |
|---|---|---|---|
| `POST` | `/api/employees/:school_id/employees` | `create_employee` | Single employee create karo |
| `GET` | `/api/employees/:school_id/employees` | `list_employees` | Sabhi employees ki list lo |
| `GET` | `/api/employees/:school_id/employees/:employee_id` | `get_employee` | Particular employee ka profile lo |
| `PUT` | `/api/employees/:school_id/employees/:employee_id` | `update_employee` | Profile update karo |
| `DELETE` | `/api/employees/:school_id/employees/:employee_id` | `delete_employee` | Employee remove karo |
| `POST` | `/api/employees/:school_id/employees/bulk` | `bulk_import_employees` | Excel/JSON array se bulk import |

---

## Key Route: Create Employee

### `POST /api/employees/:school_id`

**Body Structure:**
```json
{
  "employeeId": "EMP101",
  "name": "John Doe",
  "employeeType": "Teacher",
  "baseSalary": 25000.00,
  "experience": [
    { "company": "Prev School", "years": 2 }
  ],
  "education": [
    { "degree": "B.Ed", "year": 2020 }
  ]
  // ... more fields like phone, email, address
}
```

---

## Key Route: Bulk Import

### `POST /api/employees/:school_id/bulk`

**Description:** Yeh route ek array accept karta hai aur har row ko create karne ka attempt karta hai.

**Response Format:**
```json
{
  "success": true,
  "message": "10 employees imported, 2 failed",
  "results": [
    { "row": 1, "status": "success", "employeeId": "EMP001" },
    { "row": 2, "status": "error", "message": "Duplicate ID" }
  ],
  "successCount": 10,
  "failCount": 2
}
```

---

## Database Schema Highlights

**Table:** `employees`
- Stores core bio data + `data` JSONB field for flexible data.
- Handles standard fields like `phone`, `email`, `subject`, `department`.

**Table:** `employee_experience`
- Linked via `employee_id`.
- Stores past work history.

**Table:** `employee_education`
- Linked via `employee_id`.
- Stores academic qualifications.
