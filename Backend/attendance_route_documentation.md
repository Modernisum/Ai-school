# Attendance Route Documentation

**File:** `src/routes/attendance.rs`  
**Service:** `src/services/operations_service.rs`  
**Repository:** `src/repository/postgres.rs`  
**Database Tables:** `attendance`, `school_holidays`, `audit_logs`

---

## Routes Summary

| # | Method | URL | Handler | Description |
|---|---|---|---|---|
| 1 | `POST` | `/api/operations/attendance/:schoolId/:role/:userId/present` | `mark_present` | Attendance present mark karo |
| 2 | `POST` | `/api/operations/attendance/:schoolId/:role/:userId/holiday` | `mark_holiday` | Individual holiday mark karo |
| 3 | `PUT` | `/api/operations/attendance/:schoolId/:role/:userId/:date` | `update_attendance` | Attendance update karo |
| 4 | `GET` | `/api/operations/attendance/:schoolId/:role/:userId` | `list_attendance` | User ki poori attendance list lo |
| 5 | `DELETE` | `/api/operations/attendance/:schoolId/:role/:userId/:date` | `delete_attendance` | Ek din ki attendance delete karo |
| 6 | `GET` | `/api/operations/attendance/:schoolId/student/date/:date` | `list_attendance_by_date` | Ek date par sabhi present students |
| 7 | `GET` | `/api/operations/attendance/:schoolId/holidays` | `list_school_holidays` | School holidays ki list |
| 8 | `POST` | `/api/operations/attendance/:schoolId/holidays` | `create_school_holiday` | Naya school holiday banao |
| 9 | `DELETE` | `/api/operations/attendance/:schoolId/holidays/:holidayId` | `delete_school_holiday` | School holiday delete karo |
| 10 | `GET` | `/api/operations/attendance/:schoolId/holidays/check?date=` | `check_school_holiday` | Check karo koi date holiday hai ya nahi |

> **Note:** `:role` sirf `student` ya `employee` ho sakta hai. Koi aur value → `400 Bad Request`.

---

## 🔒 Holiday Guard — Har Route Mein

`mark_present`, `update_attendance`, aur `mark_holiday` routes mein ek **automatic holiday check** lagta hai:

```
1. Kya date Sunday hai?   → Yes → Block karo (holiday reason: "Sunday")
2. Kya school_holidays table mein date hai? → Yes → Block karo (holiday name return)
3. Kya user exempt list mein hai?           → Yes → Allow karo (bypass)
```

Agar holiday par attendance mark ho → `400 Bad Request` milta hai.

---

## Route 1: Mark Present

### `POST /api/operations/attendance/:schoolId/:role/:userId/present`

**Parameters:**

| Param | Location | Required | Description |
|---|---|---|---|
| `school_id` | URL | ✅ | School ID |
| `role` | URL | ✅ | `student` ya `employee` |
| `user_id` | URL | ✅ | Student/Employee ID |
| `date` | JSON Body | ❌ | `YYYY-MM-DD` (default: aaj) |
| `status` | JSON Body | ✅ | `present` |
| `inTime` | JSON Body | ❌ | RFC3339 time |
| `outTime` | JSON Body | ❌ | RFC3339 time |
| `totalTime` | JSON Body | ❌ | e.g., `"08:00"` |

**Example:**
```json
{
  "date": "2026-03-11",
  "status": "present",
  "inTime": "2026-03-11T08:30:00Z",
  "outTime": "2026-03-11T14:30:00Z",
  "totalTime": "06:00"
}
```

**Success Response:**
```json
{ "success": true, "message": "Attendance marked present", "data": { ... } }
```

**DB Query (INSERT with ON CONFLICT UPDATE):**
```sql
INSERT INTO attendance (school_id, role, user_id, date, status, in_time, out_time, total_time)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (school_id, user_id, date)
DO UPDATE SET status = EXCLUDED.status, in_time = EXCLUDED.in_time,
              out_time = EXCLUDED.out_time, total_time = EXCLUDED.total_time
```

---

## Route 2: Mark Holiday (Individual)

### `POST /api/operations/attendance/:schoolId/:role/:userId/holiday`

Ek specific user ke liye ek din ko holiday mark karta hai (school-wide nahi, sirf us user ke liye).

**Example Body:**
```json
{
  "date": "2026-03-11",
  "status": "holiday"
}
```

**Success Response:**
```json
{ "success": true, "message": "Holiday posted", "data": { ... } }
```

---

## Route 3: Update Attendance

### `PUT /api/operations/attendance/:schoolId/:role/:userId/:date`

Pehle se save ki gayi attendance ko update karta hai.

**Example:**
```
PUT /api/operations/attendance/SCHOOL123/student/STU001/2026-03-11

Body: { "status": "absent" }
```

**Success Response:**
```json
{ "success": true, "message": "Attendance updated", "data": { ... } }
```

---

## Route 4: List Attendance

### `GET /api/operations/attendance/:schoolId/:role/:userId`

Ek student ya employee ki **poori attendance history** return karta hai.

**Example:**
```
GET /api/operations/attendance/SCHOOL123/student/STU001
```

**Success Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-03-11",
      "status": "present",
      "month": 3,
      "year": 2026,
      "inTime": "2026-03-11T08:30:00Z",
      "outTime": "2026-03-11T14:30:00Z",
      "totalTime": "06:00"
    }
  ]
}
```

---

## Route 5: Delete Attendance

### `DELETE /api/operations/attendance/:schoolId/:role/:userId/:date`

Ek specific din ki attendance record delete karta hai.

**Example:**
```
DELETE /api/operations/attendance/SCHOOL123/student/STU001/2026-03-11
```

**Success Response:**
```json
{ "success": true, "message": "Attendance deleted successfully" }
```

---

## Route 6: List by Date (All Students)

### `GET /api/operations/attendance/:schoolId/student/date/:date`

Ek specific date par **saare present students** ke IDs return karta hai.

**Example:**
```
GET /api/operations/attendance/SCHOOL123/student/date/2026-03-11
```

**Success Response:**
```json
{
  "success": true,
  "date": "2026-03-11",
  "presentIds": ["STU001", "STU003", "STU007"]
}
```

**SQL:**
```sql
SELECT user_id FROM attendance
WHERE school_id = $1 AND role = 'student' AND date = $2
```

---

## Route 7: List School Holidays

### `GET /api/operations/attendance/:schoolId/holidays`

School ke sabhi declared holidays return karta hai.

**Success Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-123",
      "title": "Republic Day",
      "description": "National holiday",
      "fromDate": "2026-01-26",
      "toDate": "2026-01-26",
      "classes": [],
      "exemptEmployees": [],
      "exemptStudents": [],
      "createdAt": "2026-01-01"
    }
  ]
}
```

---

## Route 8: Create School Holiday

### `POST /api/operations/attendance/:schoolId/holidays`

School-wide holiday declare karta hai. Yeh future attendance marking ko block kar deta hai.

| Field | Required | Description |
|---|---|---|
| `fromDate` | ✅ | Holiday start date (`YYYY-MM-DD`) |
| `toDate` | ❌ | Holiday end date (default: same as fromDate) |
| `title` | ❌ | Holiday name (default: "Holiday") |
| `description` | ❌ | Details |
| `classes` | ❌ | JSON array — applicable classes |
| `exemptEmployees` | ❌ | JSON array — employee IDs jo exempt hain |
| `exemptStudents` | ❌ | JSON array — student IDs jo exempt hain |

**Example:**
```json
{
  "fromDate": "2026-08-15",
  "toDate": "2026-08-15",
  "title": "Independence Day",
  "description": "National holiday",
  "classes": [],
  "exemptEmployees": ["EMP001"],
  "exemptStudents": []
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "generated-uuid",
    "title": "Independence Day",
    "fromDate": "2026-08-15",
    "toDate": "2026-08-15"
  }
}
```

---

## Route 9: Delete School Holiday

### `DELETE /api/operations/attendance/:schoolId/holidays/:holidayId`

**Example:**
```
DELETE /api/operations/attendance/SCHOOL123/holidays/uuid-123
```

**Success Response:**
```json
{ "success": true }
```

---

## Route 10: Check Holiday

### `GET /api/operations/attendance/:schoolId/holidays/check?date=YYYY-MM-DD`

Kisi bhi date ko check karo — holiday hai ya nahi.

**Priority:**
1. Sunday → Always holiday
2. `school_holidays` table check
3. Koi entry nahi → Not a holiday

**Example:**
```
GET /api/operations/attendance/SCHOOL123/holidays/check?date=2026-03-15
```

**Response — Holiday:**
```json
{ "success": true, "isHoliday": true, "isSunday": false, "holidayId": "uuid", "reason": "Holi" }
```

**Response — Sunday:**
```json
{ "success": true, "isHoliday": true, "isSunday": true, "reason": "Sunday" }
```

**Response — Not a Holiday:**
```json
{ "success": true, "isHoliday": false }
```

---

## Database Tables Used

### `attendance`
| Column | Set By |
|---|---|
| `school_id` | URL param |
| `role` | URL param (`student`/`employee`) |
| `user_id` | URL param |
| `date` | Body or today |
| `status` | Body (`present`/`absent`/`holiday`) |
| `in_time` | Body (optional) |
| `out_time` | Body (optional) |
| `total_time` | Body (optional) |

### `school_holidays`
| Column | Set By |
|---|---|
| `id` | Auto UUID |
| `school_id` | URL param |
| `title` | Body |
| `from_date` / `to_date` | Body |
| `classes` | Body |
| `exempt_employees` | Body |
| `exempt_students` | Body |

---

## Layer Architecture

```
Route (attendance.rs)
  ├─► OperationsService (operations_service.rs)
  │      └─► OperationsRepository (postgres.rs)
  │             └─► PostgreSQL: attendance table
  │
  └─► Direct DB Query (school_holidays CRUD)
         └─► PostgreSQL: school_holidays table
```
