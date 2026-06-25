# Student Forms API Contract

Covers `student_forms::get_form_status`, `student_forms::auto_fill_form`, `student_forms::mark_form_complete`.

All routes are nested under:
- **New:** `/api/school/:schoolId/people/students/...`
- **Legacy:** `/api/students/:schoolId/...`

---

## `GET /api/school/:schoolId/people/students/form-status`

- Handler: `rust/src/domain/people/student_forms.rs::get_form_status`
- Purpose: Get the form completion status for all students in a school. Shows which students have completed their registration forms.
- Auth/Tenant: Uses `schoolId` path value.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "studentId": "STD-99812",
      "name": "Arjun Sharma",
      "className": "10-A",
      "formCompleted": true
    },
    {
      "studentId": "STD-99813",
      "name": "Amit Sen",
      "className": "10-A",
      "formCompleted": false
    }
  ],
  "total": 2,
  "completed": 1,
  "pending": 1
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<DB error>"
}
```

### Test cases

#### Get form status for school with students

- Type: positive
- Request: `GET /api/school/SCH-001/people/students/form-status`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": [...], "total": ..., "completed": ..., "pending": ... }`

#### School with no students

- Type: positive
- Preconditions: School has no students.
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": [], "total": 0, "completed": 0, "pending": 0 }`

---

## `GET /api/school/:schoolId/people/students/:studentId/auto-fill`

- Handler: `rust/src/domain/people/student_forms.rs::auto_fill_form`
- Purpose: Pre-populate a student's registration form using stored data and optional OCR extraction from uploaded documents (Aadhaar card).
- Auth/Tenant: Uses `schoolId` and `studentId` path values.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "studentId": "STD-99812",
    "name": "Arjun Sharma",
    "className": "10-A",
    "aadhaarNumber": "123456789012",
    "dateOfBirth": "2010-05-15",
    "fatherName": "Dev Sharma",
    "motherName": "Sita Sharma",
    "address": "12, MG Road, New Delhi",
    "gender": "male",
    "ocrAvailable": true,
    "formCompleted": false
  }
}
```

### Important rules

- If the student has uploaded documents, the handler attempts OCR extraction via the AI gRPC client.
- Field priority: OCR extracted value > direct DB field > stored form data.
- `ocrAvailable` is `true` when the student has at least one document stored.
- `formCompleted` reflects whether the form was previously marked complete.

### Expected error response

`404 NOT_FOUND`

```json
{
  "success": false,
  "message": "Student not found"
}
```

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<DB error>"
}
```

### Test cases

#### Auto-fill for student with documents

- Type: positive
- Preconditions: Student `STD-99812` has uploaded Aadhaar document.
- Request: `GET /api/school/SCH-001/people/students/STD-99812/auto-fill`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": { "ocrAvailable": true, "aadhaarNumber": "123456789012", ... } }`

#### Auto-fill for student without documents

- Type: positive
- Preconditions: Student has no uploaded documents.
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": { "ocrAvailable": false, ... } }`
- OCR fields fall back to DB-stored values.

#### Auto-fill for non-existent student

- Type: negative
- Request: `GET /api/school/SCH-001/people/students/NONEXIST/auto-fill`
- Expected HTTP status: `404`
- Expected response: `{ "success": false, "message": "Student not found" }`

#### Auto-fill with OCR failure

- Type: resilience
- Preconditions: Student has documents but AI OCR service is unreachable.
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": { "ocrAvailable": true, ... } }` — OCR fields fall back to DB values; no 500 error.
- Database/state assertion: Handler catches OCR failure gracefully.

---

## `POST /api/school/:schoolId/people/students/:studentId/form-complete`

- Handler: `rust/src/domain/people/student_forms.rs::mark_form_complete`
- Purpose: Mark a student's registration form as complete with a timestamp.
- Auth/Tenant: Requires `TenantContext`.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "studentId": "STD-99812",
  "formCompletedAt": "2026-06-21T17:00:00+00:00"
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<DB error>"
}
```

### Test cases

#### Mark form as complete

- Type: positive
- Preconditions: Student `STD-99812` exists.
- Request: `POST /api/school/SCH-001/people/students/STD-99812/form-complete`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "studentId": "STD-99812", "formCompletedAt": "<ISO 8601 timestamp>" }`
- Database/state assertion: `formCompletedAt` is set in the database.

#### Mark form complete for non-existent student

- Type: negative
- Request: `POST /api/school/SCH-001/people/students/NONEXIST/form-complete`
- Expected HTTP status: `500`
- Expected response: `{ "success": false, "message": "<error>" }`

#### Idempotency: re-mark form complete

- Type: idempotency
- Preconditions: Student form already marked complete.
- Request: Same `POST` again.
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "formCompletedAt": "<newer timestamp>" }` — timestamp updates.