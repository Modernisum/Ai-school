# Students & Subjects Route Documentation

---

## Students — `src/routes/students.rs`

**Service:** `src/services/student_service.rs`  
**Table:** `students`  
**Validation:** Both create and update have server-side field validators

---

### Routes Summary

| # | Method | URL | Handler | Description |
|---|---|---|---|---|
| 1 | `POST` | `/api/students/:school_id/students` | `create_student` | Student add karo (with validation) |
| 2 | `GET` | `/api/students/:school_id/students` | `list_students` | Sabhi students list karo |
| 3 | `GET` | `/api/students/:school_id/students/:student_id` | `get_student` | Single student profile |
| 4 | `PUT` | `/api/students/:school_id/students/:student_id` | `update_student` | Student data update karo |
| 5 | `DELETE` | `/api/students/:school_id/students/:student_id` | `delete_student` | Student remove karo |
| 6 | `GET` | `/api/students/:school_id/studentIds` | `list_student_ids` | Sirf student IDs ki list |
| 7 | `POST` | `/api/students/:school_id/students/bulk` | `bulk_import_students` | JSON/Excel se bulk import |
| 8 | `GET` | `/api/students/:school_id/students/:student_id/profile` | `get_student_profile` | Student ka full fee profile (fees module) |

---

### Server-Side Validation Rules

**Create Student:**
| Field | Rule |
|---|---|
| `className` | Required, max 50 chars |
| `name` | Optional, max 100 chars |
| `contact` | Optional, max 20 chars |
| `parentContact` | Optional, max 20 chars |

**Update Student:**
| Field | Rule |
|---|---|
| `className` | If present: not empty, max 50 chars |
| `name` | If present: max 100 chars |
| `contact` | If present: max 20 chars |

---

### Route 1: Create Student

```
POST /api/students/:school_id
Body:
{
  "className": "Class-10",
  "name": "Rahul Sharma",
  "gender": "Male",
  "dob": "2010-05-15",
  "contact": "9876543210",
  "address": "New Delhi",
  "parentName": "Suresh Sharma",
  "parentContact": "9123456789",
  "totalFee": 15000,
  "selectedSubjects": ["Math", "Science"]
}
```

**Workflow:**
```
1. Validate payload (className required, length limits)
2. student_service.create_student(school_id, data)
   → Auto-generate student_id (UUID)
   → INSERT INTO students (student_id, school_id, data, created_at, updated_at)
   → classes.total_students += 1 (if applicable)
3. Return { success, studentId }
```

---

### Route 2: List Students
```
GET /api/students/:school_id
→ SELECT * FROM students WHERE school_id = $1 ORDER BY created_at DESC
```

---

### Route 3: Get Single Student
```
GET /api/students/:school_id/:student_id

Validation: student_id cannot be empty → 400

→ SELECT * FROM students WHERE school_id=$1 AND student_id=$2
→ 404 if not found
```

---

### Route 4: Update Student
```
PUT /api/students/:school_id/:student_id
Body: { "name": "New Name", "className": "Class-11" }

Validation: student_id not empty + field validations

→ UPDATE students SET data = data || $1, updated_at = NOW()
  WHERE student_id=$2 AND school_id=$3
```

---

### Route 5: Delete Student
```
DELETE /api/students/:school_id/:student_id

Validation: student_id cannot be empty → 400

→ DELETE FROM students WHERE student_id=$1 AND school_id=$2
```

---

### Route 6: List Student IDs Only
```
GET /api/students/:school_id/ids
→ SELECT student_id FROM students WHERE school_id = $1

Response: { "success": true, "studentIds": ["STU001", "STU002"] }
```

---

### Route 7: Bulk Import Students
```
POST /api/students/:school_id/bulk
Body: {
  "students": [
    { "Class Name": "Class-10", "Name": "Rahul", "Contact": "9876" },
    { "className": "Class-9", "name": "Priya" }
  ]
}

Supports both Excel-style key names ("Class Name") and camelCase ("className").

→ Loops per student → create_student() for each
→ Returns:
{
  "success": true,
  "message": "15 students imported, 2 failed",
  "successCount": 15,
  "failCount": 2,
  "results": [
    { "row": 1, "status": "success", "studentId": "STU001" },
    { "row": 2, "status": "error", "message": "className required" }
  ]
}
```

---

## Subjects — `src/routes/subjects.rs`

**Service:** `src/services/academic_service.rs`  
**Table:** `subjects`

| Method | URL | Description |
|---|---|---|
| `POST` | `/api/subjects/:school_id` | Naya subject create karo |
| `GET` | `/api/subjects/:school_id` | School ke sabhi subjects list karo |

### Route 1: Create Subject
```
POST /api/subjects/:school_id
Body:
{
  "name": "Mathematics",
  "classId": "Class-10",
  "className": "Class 10",
  "fees": 500,
  "isCompulsory": true,
  "category": "Science",
  "feeType": "monthly",
  "feeInterval": 1,
  "scheduleType": "weekly",
  "scheduleData": {}
}

→ INSERT INTO subjects
    (id, school_id, name, class_id, class_name, fees, is_compulsory,
     category, fee_type, fee_interval, schedule_type, schedule_data)
  VALUES (uuid, $1, ...)
```

### Route 2: List Subjects
```
GET /api/subjects/:school_id
→ SELECT * FROM subjects WHERE school_id = $1 ORDER BY name ASC
```
