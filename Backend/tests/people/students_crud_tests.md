# People API — Students CRUD Tests

This document contains verification details, curl commands, data flows, database details, and expected/actual response payloads for all **13 Student CRUD and Form Status APIs**.

---

## Actual Route Table

| # | Endpoint | Method | Rust Handler |
|---|----------|--------|---------|
| 1 | `/api/school/:schoolId/people/students` | GET | `list_students` |
| 2 | `/api/school/:schoolId/people/students` | POST | `create_student` |
| 3 | `/api/school/:schoolId/people/students/validate` | POST | `validate_student` |
| 4 | `/api/school/:schoolId/people/students/bulk` | POST | `bulk_import_students` |
| 5 | `/api/school/:schoolId/people/students/paginated` | GET | `list_students_paginated` |
| 6 | `/api/school/:schoolId/people/students/space/:space_id` | GET | `list_students_by_space` |
| 7 | `/api/school/:schoolId/people/students/studentIds` | GET | `list_student_ids` |
| 8 | `/api/school/:schoolId/people/students/:studentId` | GET | `get_student` |
| 9 | `/api/school/:schoolId/people/students/:studentId` | PUT | `update_student` |
| 10 | `/api/school/:schoolId/people/students/:studentId` | DELETE | `delete_student` |
| 11 | `/api/school/:schoolId/people/students/form-status` | GET | `get_form_status` |
| 12 | `/api/school/:schoolId/people/students/:studentId/auto-fill` | GET | `auto_fill_form` |
| 13 | `/api/school/:schoolId/people/students/:studentId/form-complete` | POST | `mark_form_complete` |

---

## 1. List Students
* **Endpoint**: `GET /api/school/:schoolId/people/students`
* **Rust Handler**: `students::list_students`
* **Kya kaam aati hai**: School ke sabhi students ki simple list retrieve karne ke liye use hoti hai.
* **Data Flow / Working**: 
  - Token aur school_id validation middleware se pass hote hain.
  - SQL check `SELECT ... FROM students WHERE school_id = $1` database run karta hai.
  - List return ki jaati hai.
* **Test Command**:
  ```bash
  curl -s "http://localhost:8080/api/school/689225/people/students" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json"
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": []
  }
  ```
* **Actual Response (200)**:
  ```json
  {
    "data": [
      {
        "className": "10-A",
        "createdAt": "2026-05-24T17:12:22.348012+00:00",
        "name": "Siddharth Roy",
        "profileImageUrl": "",
        "rollNumber": 9,
        "section": "A",
        "status": "active",
        "studentId": "S000011",
        "studentType": ""
      }
    ],
    "success": true
  }
  ```

---

## 2. Create Student
* **Endpoint**: `POST /api/school/:schoolId/people/students`
* **Rust Handler**: `students::create_student`
* **Kya kaam aati hai**: Ek new student profile register karne ke liye use hoti hai.
* **Data Flow / Working**:
  - Validation check hoti hai contact number, aadhaar number, section space validation and duplicates ke liye.
  - Generates roll_number automatically class_name ke database records count ke base par.
  - Student record ko structured columns ke format mein `students` table mein insert kiya jata hai.
  - Ek FCM/SaaS event "student.enrolled" trigger kiya jata hai webhook system ke through.
* **Test Command**:
  ```bash
  curl -s -X POST "http://localhost:8080/api/school/689225/people/students" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"className":"10-A","name":"Siddharth Roy","contact":"+919888888888","parentContact":"+919876543211","gender":"Male","dob":"2010-04-12","transportEnabled":false}'
  ```
* **Expected Response (201)**:
  ```json
  {
    "success": true,
    "message": "Student added successfully",
    "data": { "studentId": "S000012" }
  }
  ```
* **Actual Response (201)**:
  ```json
  {
    "data": {
      "aadhaarNumber": "",
      "additionalSubjects": null,
      "addressCity": "",
      "addressLine1": "",
      "addressPincode": "",
      "addressState": "",
      "admissionDate": "",
      "alternativeContact": null,
      "className": "10-A",
      "contact": "+918131341777",
      "dob": "2010-04-12",
      "email": "",
      "enrolledSubjects": null,
      "fatherName": "",
      "gender": "Male",
      "motherName": "",
      "name": "Siddharth Roy",
      "profileImageUrl": "",
      "responsibilities": [],
      "roomNumber": "10",
      "section": "A",
      "status": "active",
      "studentId": "S000012",
      "studentType": "",
      "tcNumber": null,
      "totalFees": "0",
      "transportEnabled": false,
      "transportRadius": null
    },
    "message": "Student added successfully",
    "success": true
  }
  ```

---

## 3. Validate Student
* **Endpoint**: `POST /api/school/:schoolId/people/students/validate`
* **Rust Handler**: `students::validate_student`
* **Kya kaam aati hai**: Request payload format, character limit, values correctness validation ke liye.
* **Data Flow / Working**:
  - Request body ko deserialize karke basic structure validation parameters trigger kiya jata hai without DB writes.
* **Test Command**:
  ```bash
  curl -s -X POST "http://localhost:8080/api/school/689225/people/students/validate" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"className":"10-A","name":"Jane Doe","contact":"+919877777777","parentContact":"+919876543211","transportEnabled":false}'
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Data is valid"
  }
  ```
* **Actual Response (200)**:
  ```json
  {
    "message": "Data is valid",
    "success": true
  }
  ```

---

## 4. Bulk Import Students
* **Endpoint**: `POST /api/school/:schoolId/people/students/bulk`
* **Rust Handler**: `students::bulk_import_students`
* **Kya kaam aati hai**: Ek single upload array list se bulk mein students create karne ke liye use hoti hai.
* **Data Flow / Working**:
  - `students` ya raw JSON array request read kiya jata hai.
  - Loop run hota hai aur loop ke har item par individual structured `create_student` transactions trigger hoti hain.
  - Loop completion par status counters (success / failure breakdown) return hoti hai.
* **Test Command**:
  ```bash
  curl -s -X POST "http://localhost:8080/api/school/689225/people/students/bulk" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"students":[{"className":"10-A","name":"Rahul Sharma","contact":"+919988776655"},{"className":"10-A","name":"Priya Patel","contact":"+919988776644"}]}'
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "2 students imported, 0 failed",
    "successCount": 2,
    "failCount": 0
  }
  ```
* **Actual Response (200)**:
  ```json
  {
    "failCount": 0,
    "message": "2 students imported, 0 failed",
    "results": [
      { "row": 1, "status": "success", "studentId": "S000013" },
      { "row": 2, "status": "success", "studentId": "S000014" }
    ],
    "success": true,
    "successCount": 2
  }
  ```

---

## 5. List Students Paginated
* **Endpoint**: `GET /api/school/:schoolId/people/students/paginated`
* **Rust Handler**: `students::list_students_paginated`
* **Kya kaam aati hai**: Multi-tenant client apps ke dashboard par scroll list and filters pagination ke liye.
* **Data Flow / Working**:
  - `page`, `limit`, `search`, `status` dynamically parse hote hain request query context se.
  - Database dynamic `SELECT` query generate karta hai `LIMIT` aur `OFFSET` query rules ke sath.
* **Test Command**:
  ```bash
  curl -s "http://localhost:8080/api/school/689225/people/students/paginated?page=1&limit=5" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json"
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": [],
    "pagination": { "page": 1, "limit": 5, "total": 0, "totalPages": 0 }
  }
  ```
* **Actual Response (200)**:
  ```json
  {
    "data": [
      {
        "className": "10-A",
        "createdAt": "2026-05-24T17:14:05.878450+00:00",
        "name": "Priya Patel",
        "profileImageUrl": null,
        "rollNumber": 12,
        "section": "A",
        "status": "active",
        "studentId": "S000014",
        "studentType": null
      }
    ],
    "pagination": {
      "hasNext": false,
      "hasPrev": false,
      "limit": 5,
      "page": 1,
      "total": 3,
      "totalPages": 1
    },
    "success": true
  }
  ```

---

## 6. List Students By Space
* **Endpoint**: `GET /api/school/:schoolId/people/students/space/:space_id`
* **Rust Handler**: `students::list_students_by_space`
* **Kya kaam aati hai**: Particular section space (e.g. Class "10-A") ke registered students ki simple name and studentId return karne ke liye.
* **Data Flow / Working**:
  - `space_id` path filter validate hota hai.
  - SQL query `SELECT name, student_id FROM students WHERE school_id = $1 AND class_name = $2` runs on DB.
* **Test Command**:
  ```bash
  curl -s "http://localhost:8080/api/school/689225/people/students/space/10-A" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json"
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": []
  }
  ```
* **Actual Response (200)**:
  ```json
  {
    "data": [
      { "name": "Siddharth Roy", "studentId": "S000012" },
      { "name": "Rahul Sharma", "studentId": "S000013" },
      { "name": "Priya Patel", "studentId": "S000014" }
    ],
    "success": true
  }
  ```

---

## 7. List Student IDs
* **Endpoint**: `GET /api/school/:schoolId/people/students/studentIds`
* **Rust Handler**: `students::list_student_ids`
* **Kya kaam aati hai**: Bulk checking operations ya sync logic verify karne ke liye studentIds list collect karna.
* **Data Flow / Working**:
  - Reads `SELECT student_id FROM students WHERE school_id = $1` from database.
* **Test Command**:
  ```bash
  curl -s "http://localhost:8080/api/school/689225/people/students/studentIds" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json"
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "studentIds": []
  }
  ```
* **Actual Response (200)**:
  ```json
  {
    "studentIds": [ "S000012", "S000013", "S000014" ],
    "success": true
  }
  ```

---

## 8. Get Single Student
* **Endpoint**: `GET /api/school/:schoolId/people/students/:studentId`
* **Rust Handler**: `students::get_student`
* **Kya kaam aati hai**: Kisi specific student account ki details fetch karne ke liye.
* **Data Flow / Working**:
  - `studentId` code path extract hota hai.
  - Queries `SELECT * FROM students WHERE school_id = $1 AND student_id = $2` from DB database.
* **Test Command**:
  ```bash
  curl -s "http://localhost:8080/api/school/689225/people/students/S000012" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json"
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": { "studentId": "S000012", "name": "Siddharth Roy" }
  }
  ```
* **Actual Response (200)**:
  ```json
  {
    "data": {
      "aadhaarNumber": "",
      "additionalSubjects": null,
      "addressCity": "",
      "addressLine1": "",
      "addressPincode": "",
      "addressState": "",
      "admissionDate": "",
      "alternativeContact": null,
      "className": "10-A",
      "contact": "+914611436820",
      "dob": "2010-04-12",
      "email": "",
      "enrolledSubjects": null,
      "fatherName": "",
      "gender": "Male",
      "motherName": "",
      "name": "Siddharth Roy",
      "profileImageUrl": "",
      "rollNumber": 10,
      "roomNumber": "10",
      "section": "A",
      "status": "active",
      "studentId": "S000012",
      "studentType": "",
      "tcNumber": null,
      "totalFees": "0",
      "transportEnabled": false,
      "transportRadius": null
    },
    "success": true
  }
  ```

---

## 9. Update Student
* **Endpoint**: `PUT /api/school/:schoolId/people/students/:studentId`
* **Rust Handler**: `students::update_student`
* **Kya kaam aati hai**: Student profile ke dynamic values ya updates update karne ke liye.
* **Data Flow / Working**:
  - **Audit History Logic**: Data changes track karne ke liye dynamically `student_history` check kiya jata hai. Current values query compute context se delta delta-difference analyze hoti hain.
  - Updates `students` table with SQL `COALESCE` update assignments.
  - Insert new audit track version snapshot into `student_history` using `rev_no` counter.
  - Syncs the updated data to global table.
* **Test Command**:
  ```bash
  curl -s -X PUT "http://localhost:8080/api/school/689225/people/students/S000012" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Siddharth Updated Roy","contact":"+919999999999"}'
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Student updated successfully"
  }
  ```
* **Actual Response (200)**:
  ```json
  {
    "message": "Student updated successfully",
    "success": true
  }
  ```

---

## 10. Get Form Status
* **Endpoint**: `GET /api/school/:schoolId/people/students/form-status`
* **Rust Handler**: `student_forms::get_form_status`
* **Kya kaam aati hai**: Admission form compilation workflow monitoring (documents details, form complete flag status metrics).
* **Data Flow / Working**:
  - Queries `SELECT student_id, name, class_name, created_at, updated_at, data->>'formCompleted' FROM students`.
  - Agregates dynamically uploaded documents array urls via a fast subquery to the `document_box` table.
* **Test Command**:
  ```bash
  curl -s "http://localhost:8080/api/school/689225/people/students/form-status" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json"
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "completed": 0,
    "pending": 0,
    "data": []
  }
  ```
* **Actual Response (200)**:
  ```json
  {
    "completed": 0,
    "data": [
      {
        "className": "10-A",
        "createdAt": "2026-05-24T17:14:05.720408+00:00",
        "documentCount": 0,
        "formCompleted": false,
        "hasDocuments": false,
        "name": "Siddharth Updated Roy",
        "studentId": "S000012"
      }
    ],
    "pending": 3,
    "success": true,
    "total": 3
  }
  ```

---

## 11. Auto Fill Form
* **Endpoint**: `GET /api/school/:schoolId/people/students/:studentId/auto-fill`
* **Rust Handler**: `student_forms::auto_fill_form`
* **Kya kaam aati hai**: Kisi student profile ki data extraction/OCR values use karke form dynamic autocompletion prefilling ke liye.
* **Data Flow / Working**:
  - Reads detailed profile columns of student: `dob`, `gender`, `father_name`, `mother_name`, `address_line1`, `aadhaar_number` along with `data` json columns.
  - Queries dynamic documents list from `document_box`.
  - Prefills using fallbacks structure (structured db columns fallbacks -> raw data json fallbacks).
* **Test Command**:
  ```bash
  curl -s "http://localhost:8080/api/school/689225/people/students/S000012/auto-fill" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json"
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": { "studentId": "S000012", "name": "Siddharth Updated Roy" }
  }
  ```
* **Actual Response (200)**:
  ```json
  {
    "data": {
      "aadhaarNumber": "",
      "address": "",
      "className": "10-A",
      "dateOfBirth": "2010-04-12",
      "fatherName": "",
      "formCompleted": false,
      "gender": "Male",
      "motherName": "",
      "name": "Siddharth Updated Roy",
      "ocrAvailable": false,
      "studentId": "S000012"
    },
    "success": true
  }
  ```

---

## 12. Mark Form Complete
* **Endpoint**: `POST /api/school/:schoolId/people/students/:studentId/form-complete`
* **Rust Handler**: `student_forms::mark_form_complete`
* **Kya kaam aati hai**: Admission form process task transition completion state record timeline mark karne ke liye.
* **Data Flow / Working**:
  - Updates `data` jsonb field column mapping on students database set `{formCompleted}` value to now timeline.
* **Test Command**:
  ```bash
  curl -s -X POST "http://localhost:8080/api/school/689225/people/students/S000012/form-complete" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json"
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "studentId": "S000012",
    "formCompletedAt": "2026-05-24..."
  }
  ```
* **Actual Response (200)**:
  ```json
  {
    "formCompletedAt": "2026-05-24T17:14:06.452940100+00:00",
    "studentId": "S000012",
    "success": true
  }
  ```

---

## 13. Delete Student
* **Endpoint**: `DELETE /api/school/:schoolId/people/students/:studentId`
* **Rust Handler**: `students::delete_student`
* **Kya kaam aati hai**: Kisi student account profile delete system cleanup database action trace verify karne ke liye.
* **Data Flow / Working**:
  - Reads student photo info.
  - `DELETE FROM students WHERE school_id = $1 AND student_id = $2`.
  - Cleans up uploaded photos dynamically by marking `is_permanent = false` in storage system tracking table.
* **Test Command**:
  ```bash
  curl -s -X DELETE "http://localhost:8080/api/school/689225/people/students/S000012" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json"
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Student deleted successfully"
  }
  ```
* **Actual Response (200)**:
  ```json
  {
    "message": "Student deleted successfully",
    "success": true
  }
  ```

---

## ⚠️ Important Bugs Discovered & Fixed

1. **`students/form-status` class_id column compilation bug**: Handlers were querying non-existent column `s.class_id` which crashed with 500 error. Replaced with `created_at` and `updated_at` timestamps correctly formatted.
2. **Missing `data` column on `students`**: Init migration had table without `data` column while form completion update statements were writing JSON fields. Dynamically added `data JSONB NOT NULL DEFAULT '{}'` update queries to the startup checker.
3. **Repository table discrepancy**: `PostgresDocumentBoxRepository` was attempting writes to a non-existent `documents` table. Aligned mappings with the correct `document_box` table schema.
4. **`student_history` schema mismatch**: Repository history endpoints were querying `revision_no`, `snapshot`, and `rev_date` while database columns were named `rev_no`, `snapshot`, and `created_at`. Aligned database columns correctly.
5. **Decoded Null profile images crash**: `query_scalar` type inferences were triggering `ColumnDecode UnexpectedNullError` on NULL string values. Modified decodings to robust `Option<Option<String>>` structures to resolve all issues.
