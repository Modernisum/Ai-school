# Students API Contract

Covers `students::create_student`, `students::list_students`, `students::get_student`, `students::update_student`, `students::delete_student`, `students::validate_student`, `students::bulk_import_students`, `students::list_students_paginated`, `students::list_students_by_space`, `students::list_student_ids`.

All routes are nested under:
- **New:** `/api/school/:schoolId/people/students/...`
- **Legacy:** `/api/students/:schoolId/...`

---

## `POST /api/school/:schoolId/people/students`

- Handler: `rust/src/domain/people/students.rs::create_student`
- Purpose: Register a new student in the school directory.
- Auth/Tenant: Requires authenticated Bearer token. `TenantContext` is extracted from the request extension.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Body:

```json
{
  "name": "Arjun Sharma",
  "spaceId": "class_10a",
  "className": "10-A",
  "gender": "male",
  "dob": "2010-05-15",
  "contact": "9988776655",
  "alternativeContact": "9988776654",
  "email": "arjun@gmail.com",
  "aadhaarNumber": "123456789012",
  "fatherName": "Dev Sharma",
  "motherName": "Sita Sharma",
  "addressLine1": "12, MG Road",
  "addressCountryId": 1,
  "addressCountryCode": "IN",
  "addressPhoneCode": "+91",
  "addressStateId": 1,
  "addressState": "Delhi",
  "addressDistrict": "Central Delhi",
  "addressCity": "New Delhi",
  "addressPincode": "110001",
  "tcNumber": "TC-99812",
  "admissionDate": "2026-04-01",
  "roomNumber": "101",
  "transportEnabled": true,
  "transportRadius": 5.0,
  "studentType": "day_scholar",
  "totalFee": 15000.0,
  "selectedSubjects": ["MATH", "SCIENCE"],
  "profileImageUrl": "https://cdn.school.com/profiles/arjun.jpg",
  "bloodGroup": "B+",
  "caste": "General",
  "medicalHistory": "Asthma",
  "allergies": "Peanuts",
  "emergencyContact": "9998887776"
}
```

### Expected success response

`201 CREATED`

```json
{
  "success": true,
  "message": "Student added successfully",
  "data": {
    "studentId": "STD-99812",
    "name": "Arjun Sharma"
  }
}
```

### Important validations

- `className` is required and cannot be empty, max 100 characters.
- `name` max 100 characters if provided.
- `contact` max 20 characters if provided.
- `parentContact` max 20 characters if provided.
- If `transportEnabled` is `true`, `transportRadius` is required.
- Triggers `student.enrolled` webhook after successful creation.

### Expected error response

`400 BAD_REQUEST` (validation errors)

```json
{
  "success": false,
  "message": "className is required and cannot be empty"
}
```

`500 INTERNAL_SERVER_ERROR` (AppError propagation)

```json
{
  "success": false,
  "message": "<service or DB error>"
}
```

### Test cases

#### Create student with minimum required fields

- Type: positive
- Preconditions: Authenticated tenant token for `SCH-001`.
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-001/people/students`
  - Body:
```json
{
  "name": "Amit Sen",
  "className": "10-A",
  "gender": "male",
  "dob": "2010-02-12",
  "contact": "9911223344",
  "studentType": "day_scholar"
}
```
- Expected HTTP status: `201`
- Expected response: `{ "success": true, "message": "Student added successfully", "data": { "studentId": "STD-..." } }`
- Database/state assertion: `students` table contains one row for school `SCH-001`.

#### Create student with all fields

- Type: positive
- Request: Full body as shown in the request example above.
- Expected HTTP status: `201`
- Expected response: `{ "success": true, "data": { "studentId": ..., "name": "Arjun Sharma" } }`

#### Missing className

- Type: negative
- Request body omits `className` or sets it to empty string.
- Expected HTTP status: `400`
- Expected response: `{ "success": false, "message": "className is required and cannot be empty" }`

#### className too long

- Type: boundary
- Request body sets `className` to a 101-character string.
- Expected HTTP status: `400`
- Expected response: `{ "success": false, "message": "className cannot exceed 100 characters" }`

#### transportEnabled without transportRadius

- Type: negative
- Request body: `{ "transportEnabled": true }` without `transportRadius`.
- Expected HTTP status: `400`
- Expected response: `{ "success": false, "message": "transportRadius is required when transportEnabled is true" }`

#### Duplicate student (phone/aadhaar)

- Type: negative
- Preconditions: A student with the same phone/aadhaar already exists.
- Expected HTTP status: `500`
- Expected response: `{ "success": false, "message": "<duplicate error>" }`

---

## `GET /api/school/:schoolId/people/students`

- Handler: `rust/src/domain/people/students.rs::list_students`
- Purpose: List all students for a school.
- Auth/Tenant: Uses `schoolId` path value.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "studentId": "STD-99812",
      "schoolId": "SCH-001",
      "name": "Arjun Sharma",
      "spaceId": "class_10a",
      "rollNumber": 1,
      "section": "A",
      "gender": "male",
      "dob": "2010-05-15",
      "contact": "9988776655",
      "address": "12, MG Road, New Delhi",
      "parentName": "Dev Sharma",
      "parentContact": "9988776654",
      "status": "active",
      "createdAt": "2026-04-01T10:00:00Z",
      "updatedAt": "2026-04-01T10:00:00Z"
    }
  ]
}
```

### Test cases

#### List all students

- Type: positive
- Request: `GET /api/school/SCH-001/people/students`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": [...] }`

#### Empty student list

- Type: positive
- Preconditions: No students registered for school.
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": [] }`

---

## `GET /api/school/:schoolId/people/students/:studentId`

- Handler: `rust/src/domain/people/students.rs::get_student`
- Purpose: Fetch a single student by ID.
- Auth/Tenant: Uses `schoolId` and `studentId` path values.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "studentId": "STD-99812",
    "schoolId": "SCH-001",
    "name": "Arjun Sharma",
    "spaceId": "class_10a",
    "rollNumber": 1,
    "section": "A",
    "gender": "male",
    "dob": "2010-05-15",
    "contact": "9988776655",
    "address": "12, MG Road, New Delhi",
    "parentName": "Dev Sharma",
    "parentContact": "9988776654",
    "status": "active",
    "createdAt": "2026-04-01T10:00:00Z",
    "updatedAt": "2026-04-01T10:00:00Z"
  }
}
```

### Expected error response

`404 NOT_FOUND`

```json
{
  "success": false,
  "message": "Student not found"
}
```

`400 BAD_REQUEST` (empty studentId)

```json
{
  "success": false,
  "message": "student_id cannot be empty"
}
```

### Test cases

#### Get existing student

- Type: positive
- Preconditions: Student `STD-99812` exists in `SCH-001`.
- Request: `GET /api/school/SCH-001/people/students/STD-99812`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": { "studentId": "STD-99812", ... } }`

#### Get non-existent student

- Type: negative
- Request: `GET /api/school/SCH-001/people/students/NONEXIST`
- Expected HTTP status: `404`
- Expected response: `{ "success": false, "message": "Student not found" }`

#### Empty studentId

- Type: negative
- Request: `GET /api/school/SCH-001/people/students/%20` (URL-encoded space)
- Expected HTTP status: `400`
- Expected response: `{ "success": false, "message": "student_id cannot be empty" }`

---

## `PUT /api/school/:schoolId/people/students/:studentId`

- Handler: `rust/src/domain/people/students.rs::update_student`
- Purpose: Update an existing student's details.
- Auth/Tenant: Requires `TenantContext`.

### Request

Body (any subset of fields):

```json
{
  "name": "Arjun S. Sharma",
  "spaceId": "class_10b",
  "contact": "9988776655",
  "addressCity": "New Delhi"
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Student updated successfully"
}
```

### Important validations

- `spaceId` cannot be empty, max 50 characters.
- `name` max 100 characters.
- `contact` max 20 characters.
- `studentId` path param cannot be empty.

### Test cases

#### Update student name

- Type: positive
- Preconditions: Student `STD-99812` exists.
- Request: `PUT /api/school/SCH-001/people/students/STD-99812`
- Body: `{ "name": "Arjun Updated" }`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "message": "Student updated successfully" }`

#### Update to invalid spaceId

- Type: negative
- Body: `{ "spaceId": "   " }` (whitespace only)
- Expected HTTP status: `400`
- Expected response: `{ "success": false, "message": "spaceId cannot be empty" }`

#### Update non-existent student

- Type: negative
- Request: `PUT /api/school/SCH-001/people/students/NONEXIST`
- Body: `{ "name": "Ghost" }`
- Expected HTTP status: `500` (service layer error)
- Expected response: `{ "success": false, "message": "<error>" }`

---

## `DELETE /api/school/:schoolId/people/students/:studentId`

- Handler: `rust/src/domain/people/students.rs::delete_student`
- Purpose: Remove a student from the school directory.
- Auth/Tenant: Requires `TenantContext`.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Student deleted successfully"
}
```

### Test cases

#### Delete existing student

- Type: positive
- Preconditions: Student `STD-99812` exists.
- Request: `DELETE /api/school/SCH-001/people/students/STD-99812`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "message": "Student deleted successfully" }`
- Database/state assertion: Student row is removed or marked inactive.

#### Delete non-existent student

- Type: negative
- Request: `DELETE /api/school/SCH-001/people/students/NONEXIST`
- Expected HTTP status: `500`
- Expected response: `{ "success": false, "message": "<error>" }`

#### Empty studentId

- Type: negative
- Request: `DELETE /api/school/SCH-001/people/students/%20`
- Expected HTTP status: `400`
- Expected response: `{ "success": false, "message": "student_id cannot be empty" }`

---

## `POST /api/school/:schoolId/people/students/validate`

- Handler: `rust/src/domain/people/students.rs::validate_student`
- Purpose: Validate student data before actual registration (dry-run check for duplicates, field validity).
- Auth/Tenant: Uses `schoolId` path value.

### Request

Body:

```json
{
  "phone": "9988776655",
  "aadhaarNumber": "123456789012",
  "email": "arjun@gmail.com"
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Data is valid"
}
```

### Test cases

#### Validate unique student data

- Type: positive
- Preconditions: No student with given phone/aadhaar/email exists.
- Request: `POST /api/school/SCH-001/people/students/validate`
- Body: `{ "phone": "9999999999", "aadhaarNumber": "111111111111" }`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "message": "Data is valid" }`

#### Validate duplicate student data

- Type: negative
- Preconditions: Existing student with given phone/aadhaar.
- Expected HTTP status: `500`
- Expected response: `{ "success": false, "message": "<duplicate error>" }`

---

## `POST /api/school/:schoolId/people/students/bulk`

- Handler: `rust/src/domain/people/students.rs::bulk_import_students`
- Purpose: Bulk import multiple students from a JSON array.
- Auth/Tenant: Requires `TenantContext`.

### Request

Body:

```json
{
  "students": [
    {
      "Name": "Amit Sen",
      "Gender": "male",
      "Space Name": "10-A",
      "dob": "2010-02-12",
      "Contact": "9911223344",
      "Email": "amit@mail.com",
      "Aadhaar Number": "112233445566",
      "Father Name": "Raj Sen",
      "Mother Name": "Priya Sen",
      "Address": "45 Lake Road",
      "City": "Kolkata",
      "State": "West Bengal",
      "Pincode": "700001",
      "Student Type": "day_scholar",
      "Blood Group": "O+",
      "Caste": "General",
      "Admission Date": "2026-04-01"
    },
    {
      "name": "Priya Das",
      "gender": "female",
      "className": "10-B",
      "dob": "2010-06-18",
      "contact": "9922334455",
      "email": "priya@mail.com",
      "aadhaarNumber": "223344556677",
      "fatherName": "Suresh Das",
      "motherName": "Rina Das",
      "addressLine1": "22 Park Street",
      "addressCity": "Mumbai",
      "addressState": "Maharashtra",
      "addressPincode": "400001",
      "studentType": "hosteler"
    }
  ]
}
```

### Important rules

- The handler accepts both an array directly or a `{ "students": [...] }` wrapper.
- Each row is processed individually; failures in one row do not stop the entire batch.
- Field names accept multiple casing conventions: `Name`/`name`, `Space Name`/`spaceId`/`className`/`class`/`class_name`, `dob`/`DOB`/`dateOfBirth`/`date_of_birth`, etc.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "2 students imported, 0 failed",
  "results": [
    { "row": 1, "status": "success", "studentId": "STD-00123" },
    { "row": 2, "status": "success", "studentId": "STD-00124" }
  ],
  "successCount": 2,
  "failCount": 0
}
```

### Test cases

#### Bulk import valid students

- Type: positive
- Request: `POST /api/school/SCH-001/people/students/bulk`
- Body: 2 valid student rows.
- Expected HTTP status: `200`
- Expected response: `{ "successCount": 2, "failCount": 0 }`

#### Bulk import with some failures

- Type: mixed
- Body: 3 rows, 1 with duplicate phone number.
- Expected HTTP status: `200`
- Expected response: `{ "successCount": 2, "failCount": 1, "results": [...] }`
- Results array contains error detail for the failed row.

#### Bulk import with no students array

- Type: negative
- Body: `{}` (empty object, no `students` key)
- Expected HTTP status: `400`
- Expected response: `{ "success": false, "message": "Expected a 'students' array" }`

---

## `GET /api/school/:schoolId/people/students/paginated`

- Handler: `rust/src/domain/people/students.rs::list_students_paginated`
- Purpose: List students with pagination, filtering, and search.
- Auth/Tenant: Uses `schoolId` path value.

### Request

Query params:

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `page` | i32 | No | 1 | Page number (min 1) |
| `limit` | i32 | No | 20 | Items per page (min 1, max 100) |
| `space_id` | string | No | - | Filter by space/class ID |
| `status` | string | No | - | Filter by student status |
| `search` | string | No | - | Search term across name/contact |

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "studentId": "STD-99812",
      "name": "Arjun Sharma",
      "spaceId": "class_10a",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### Test cases

#### First page with default limit

- Type: positive
- Request: `GET /api/school/SCH-001/people/students/paginated`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 20 } }`

#### Paginated with search filter

- Type: positive
- Request: `GET /api/school/SCH-001/people/students/paginated?search=Arjun&page=1&limit=5`
- Expected HTTP status: `200`
- Expected response: Only students whose name/contact contains "Arjun".

#### Paginated with space filter

- Type: positive
- Request: `GET /api/school/SCH-001/people/students/paginated?space_id=class_10a`
- Expected HTTP status: `200`
- Expected response: Only students in `class_10a`.

#### Page beyond total

- Type: boundary
- Request: `GET /api/school/SCH-001/people/students/paginated?page=999`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": [], "pagination": { "hasNext": false } }`

#### Invalid limit (exceeds 100)

- Type: boundary
- Request: `GET /api/school/SCH-001/people/students/paginated?limit=200`
- Expected HTTP status: `200`
- Expected response: Limit is clamped to 100.

---

## `GET /api/school/:schoolId/people/students/space/:space_id`

- Handler: `rust/src/domain/people/students.rs::list_students_by_space`
- Purpose: List all students in a specific space/class.
- Auth/Tenant: Uses `schoolId` and `space_id` path values.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "studentId": "STD-99812",
      "name": "Arjun Sharma",
      "spaceId": "class_10a",
      "section": "A"
    }
  ]
}
```

### Test cases

#### List students in existing space

- Type: positive
- Request: `GET /api/school/SCH-001/people/students/space/class_10a`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": [...] }`

#### Empty space

- Type: positive
- Preconditions: No students in `class_10c`.
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": [] }`

---

## `GET /api/school/:schoolId/people/students/studentIds`

- Handler: `rust/src/domain/people/students.rs::list_student_ids`
- Purpose: Get a flat list of all student IDs for a school (useful for dropdowns/autocompletes).
- Auth/Tenant: Uses `schoolId` path value.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "studentIds": ["STD-99812", "STD-99813", "STD-99814"]
}
```

### Test cases

#### List all student IDs

- Type: positive
- Request: `GET /api/school/SCH-001/people/students/studentIds`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "studentIds": [...] }`

#### No students

- Type: positive
- Preconditions: School has no students.
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "studentIds": [] }`