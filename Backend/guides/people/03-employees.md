# Employees API Contract

Covers `employees::create_employee`, `employees::list_employees`, `employees::get_employee`, `employees::update_employee`, `employees::delete_employee`, `employees::validate_employee`, `employees::bulk_import_employees`.

All routes are nested under:
- **New:** `/api/school/:schoolId/people/employees/...`
- **Legacy:** `/api/employees/:schoolId/...`

---

## `POST /api/school/:schoolId/people/employees`

- Handler: `rust/src/domain/people/employees.rs::create_employee`
- Purpose: Register a new employee (teacher, driver, admin, etc.) in the school directory.
- Auth/Tenant: Requires authenticated Bearer token with `TenantContext`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Body:

```json
{
  "name": "Sunita Rao",
  "fatherName": "K. Rao",
  "motherName": "M. Rao",
  "dob": "1988-08-20",
  "age": 37,
  "gender": "female",
  "category": "teaching",
  "employeeType": "teacher",
  "baseSalary": 45000.0,
  "email": "sunita.rao@school.com",
  "phone": "9922334455",
  "alternativeContact": "9922334456",
  "permanent address": "45 Lake Road, Bangalore",
  "temporaryAddress": "45 Lake Road, Bangalore",
  "experience": [
    { "school": "DPS Bangalore", "years": 5, "role": "Math Teacher" }
  ],
  "education": [
    { "degree": "B.Ed", "institution": "Bangalore University", "year": 2010 }
  ],
  "aadhaarNumber": "987654321098",
  "responsibilities": [
    {
      "spaceId": "class_10a",
      "roleIds": ["class_teacher", "subject_math"]
    }
  ],
  "bankDetails": {
    "accountHolder": "Sunita Rao",
    "bankName": "SBI",
    "branch": "MG Road"
  },
  "profileImageUrl": "https://cdn.school.com/profiles/sunita.jpg",
  "roles": [{"role": "teacher", "permissions": ["grade_entry", "attendance"]}],
  "bloodGroup": "A+",
  "emergencyContact": "9988776655",
  "bankAccountNumber": "12345678901",
  "bankIfscCode": "SBIN0001234",
  "experienceStatus": "verified",
  "experienceYears": 5,
  "previousSchool": "DPS Bangalore",
  "experienceIncrementPercent": 5.0
}
```

### Important rules

- If `age` is not provided, the handler auto-calculates it from `dob`.
- `age` takes precedence over auto-calculated value when both are present.
- `dob` format must be `YYYY-MM-DD`.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "employee": {
    "employeeId": "EMP-00281",
    "name": "Sunita Rao"
  }
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<service or DB error>"
}
```

### Test cases

#### Create employee with all fields

- Type: positive
- Preconditions: Authenticated tenant token for `SCH-001`.
- Request: `POST /api/school/SCH-001/people/employees`
- Body: Full payload as shown above.
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "employee": { "employeeId": "EMP-...", "name": "Sunita Rao" } }`
- Database/state assertion: `employees` table contains one row for school `SCH-001`.

#### Create employee with auto-calculated age

- Type: positive
- Body omits `age` field but includes `dob: "1988-08-20"`.
- Expected HTTP status: `200`
- Expected response: Employee created with calculated age.

#### Create employee with invalid dob format

- Type: negative
- Body: `{ "dob": "20-08-1988" }` (DD-MM-YYYY instead of YYYY-MM-DD).
- Expected HTTP status: `500`
- Expected response: `{ "success": false, "message": "<error>" }`

#### Duplicate employee (phone/email)

- Type: negative
- Preconditions: Employee with same phone/email already exists.
- Expected HTTP status: `500`
- Expected response: `{ "success": false, "message": "<duplicate error>" }`

---

## `GET /api/school/:schoolId/people/employees`

- Handler: `rust/src/domain/people/employees.rs::list_employees`
- Purpose: List all employees for a school.
- Auth/Tenant: Uses `schoolId` path value.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "employees": [
    {
      "employeeId": "EMP-00281",
      "schoolId": "SCH-001",
      "name": "Sunita Rao",
      "employeeType": "teacher",
      "baseSalary": 45000.0,
      "status": "active",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z"
    }
  ]
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

#### List all employees

- Type: positive
- Request: `GET /api/school/SCH-001/people/employees`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "employees": [...] }`

#### Empty employee list

- Type: positive
- Preconditions: No employees registered.
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "employees": [] }`

---

## `GET /api/school/:schoolId/people/employees/:employeeId`

- Handler: `rust/src/domain/people/employees.rs::get_employee`
- Purpose: Fetch a single employee by ID.
- Auth/Tenant: Uses `schoolId` and `employeeId` path values.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "employee": {
    "employeeId": "EMP-00281",
    "schoolId": "SCH-001",
    "name": "Sunita Rao",
    "employeeType": "teacher",
    "baseSalary": 45000.0,
    "status": "active",
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-01-15T10:00:00Z"
  }
}
```

### Expected error response

`404 NOT_FOUND`

```json
{
  "success": false,
  "message": "Employee not found"
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

#### Get existing employee

- Type: positive
- Preconditions: Employee `EMP-00281` exists in `SCH-001`.
- Request: `GET /api/school/SCH-001/people/employees/EMP-00281`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "employee": { "employeeId": "EMP-00281", ... } }`

#### Get non-existent employee

- Type: negative
- Request: `GET /api/school/SCH-001/people/employees/NONEXIST`
- Expected HTTP status: `404`
- Expected response: `{ "success": false, "message": "Employee not found" }`

---

## `PUT /api/school/:schoolId/people/employees/:employeeId`

- Handler: `rust/src/domain/people/employees.rs::update_employee`
- Purpose: Update an existing employee's details.
- Auth/Tenant: Requires `TenantContext`.

### Request

Body (full `CreateEmployeeRequest`):

```json
{
  "name": "Sunita R. Rao",
  "fatherName": "K. Rao",
  "motherName": "M. Rao",
  "dob": "1988-08-20",
  "gender": "female",
  "category": "teaching",
  "employeeType": "teacher",
  "baseSalary": 48000.0,
  "email": "sunita.rao@school.com",
  "phone": "9922334455",
  "alternativeContact": "9922334456",
  "permanent address": "45 Lake Road, Bangalore",
  "temporaryAddress": "46 Garden Road, Bangalore",
  "experience": [],
  "education": [],
  "aadhaarNumber": "987654321098",
  "responsibilities": [
    {
      "spaceId": "class_10a",
      "roleIds": ["class_teacher"]
    }
  ]
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Employee updated successfully"
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<service error>"
}
```

### Test cases

#### Update employee salary

- Type: positive
- Preconditions: Employee `EMP-00281` exists.
- Request: `PUT /api/school/SCH-001/people/employees/EMP-00281`
- Body: Full employee data with updated `baseSalary: 48000.0`.
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "message": "Employee updated successfully" }`

#### Update non-existent employee

- Type: negative
- Request: `PUT /api/school/SCH-001/people/employees/NONEXIST`
- Expected HTTP status: `500`
- Expected response: `{ "success": false, "message": "<error>" }`

---

## `DELETE /api/school/:schoolId/people/employees/:employeeId`

- Handler: `rust/src/domain/people/employees.rs::delete_employee`
- Purpose: Remove an employee from the school directory.
- Auth/Tenant: Requires `TenantContext`.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Employee deleted successfully"
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<service error>"
}
```

### Test cases

#### Delete existing employee

- Type: positive
- Preconditions: Employee `EMP-00281` exists.
- Request: `DELETE /api/school/SCH-001/people/employees/EMP-00281`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "message": "Employee deleted successfully" }`
- Database/state assertion: Employee row is removed or marked inactive.

#### Delete non-existent employee

- Type: negative
- Request: `DELETE /api/school/SCH-001/people/employees/NONEXIST`
- Expected HTTP status: `500`
- Expected response: `{ "success": false, "message": "<error>" }`

---

## `POST /api/school/:schoolId/people/employees/validate`

- Handler: `rust/src/domain/people/employees.rs::validate_employee`
- Purpose: Validate employee data before actual registration (dry-run check for duplicates, field validity).
- Auth/Tenant: Uses `schoolId` path value.

### Request

Body:

```json
{
  "phone": "9922334455",
  "aadhaarNumber": "987654321098",
  "email": "sunita.rao@school.com"
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

### Expected error response

`400 BAD_REQUEST`

```json
{
  "success": false,
  "message": "<validation error>"
}
```

### Test cases

#### Validate unique employee data

- Type: positive
- Preconditions: No employee with given phone/aadhaar/email.
- Request: `POST /api/school/SCH-001/people/employees/validate`
- Body: `{ "phone": "9999999999", "aadhaarNumber": "111111111111" }`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "message": "Data is valid" }`

#### Validate duplicate employee data

- Type: negative
- Preconditions: Existing employee with same phone/aadhaar.
- Expected HTTP status: `400`
- Expected response: `{ "success": false, "message": "<duplicate error>" }`

---

## `POST /api/school/:schoolId/people/employees/bulk`

- Handler: `rust/src/domain/people/employees.rs::bulk_import_employees`
- Purpose: Bulk import multiple employees from a JSON array.
- Auth/Tenant: Requires `TenantContext`.

### Request

Body:

```json
{
  "employees": [
    {
      "Name": "Ravi Kumar",
      "employeeType": "teacher",
      "Email": "ravi.kumar@school.com",
      "Phone Number": "9911223344",
      "Alternative Contact": "9911223345",
      "dob": "1990-03-15",
      "Gender": "male",
      "Category": "teaching",
      "Father Name": "Suresh Kumar",
      "Mother Name": "Geeta Kumar",
      "Permanent Address": "12 MG Road, Delhi",
      "Aadhaar Number": "111122223333",
      "Blood Group": "B+",
      "Bank Account Number": "98765432101",
      "Bank IFSC Code": "HDFC0001234",
      "Base Salary": 40000.0,
      "Subject": "Physics",
      "Department": "Science"
    }
  ]
}
```

### Important rules

- The handler accepts both an array directly or a `{ "employees": [...] }` wrapper.
- Each row is processed individually; failures in one row do not stop the entire batch.
- Field names accept multiple casing: `Name`/`name`, `Phone Number`/`phone`/`Phone`/`phone_number`, `Aadhaar Number`/`aadhaarNumber`/`aadhaar_number`/`aadhaar`, etc.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "1 employees imported, 0 failed",
  "results": [
    { "row": 1, "status": "success", "employeeId": "EMP-00300" }
  ],
  "successCount": 1,
  "failCount": 0
}
```

### Expected error response

`400 BAD_REQUEST` (missing `employees` array)

```json
{
  "success": false,
  "message": "Expected an 'employees' array"
}
```

### Test cases

#### Bulk import valid employees

- Type: positive
- Request: `POST /api/school/SCH-001/people/employees/bulk`
- Body: 2 valid employee rows.
- Expected HTTP status: `200`
- Expected response: `{ "successCount": 2, "failCount": 0 }`

#### Bulk import with some failures

- Type: mixed
- Body: 3 rows, 1 with duplicate phone.
- Expected HTTP status: `200`
- Expected response: `{ "successCount": 2, "failCount": 1, "results": [...] }`

#### Bulk import with no employees array

- Type: negative
- Body: `{}` (empty object)
- Expected HTTP status: `400`
- Expected response: `{ "success": false, "message": "Expected an 'employees' array" }`