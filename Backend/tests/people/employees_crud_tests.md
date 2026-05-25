# People API — Employees CRUD Tests

This document contains verification details, curl commands, data flows, database details, and expected/actual response payloads for all **13 Employee CRUD & Payroll APIs**.

---

## Actual Route Table

| # | Endpoint | Method | Rust Handler |
|---|----------|--------|---------|
| 1 | `/api/school/:schoolId/people/employees` | GET | `list_employees` |
| 2 | `/api/school/:schoolId/people/employees` | POST | `create_employee` |
| 3 | `/api/school/:schoolId/people/employees/validate` | POST | `validate_employee` |
| 4 | `/api/school/:schoolId/people/employees/bulk` | POST | `bulk_import_employees` |
| 5 | `/api/school/:schoolId/people/employees/:employeeId` | GET | `get_employee` |
| 6 | `/api/school/:schoolId/people/employees/:employeeId` | PUT | `update_employee` |
| 7 | `/api/school/:schoolId/people/employees/:employeeId` | DELETE | `delete_employee` |
| 8 | `/api/school/:schoolId/people/employees/:employeeId/salary-breakdown` | GET | `get_salary_breakdown` |
| 9 | `/api/school/:schoolId/people/employees/:employeeId/bonus` | POST | `add_bonus` |
| 10 | `/api/school/:schoolId/people/employees/:employeeId/aid` | POST | `add_aid` |
| 11 | `/api/school/:schoolId/people/employees/:employeeId/close-month` | POST | `auto_close_month` |
| 12 | `/api/school/:schoolId/people/employees/:employeeId/pay` | POST | `record_salary_payment` |
| 13 | `/api/school/:schoolId/people/employees/:employeeId/salary` | POST | `set_base_salary` |

---

## 1. List Employees
* **Endpoint**: `GET /api/school/:schoolId/people/employees` (Also supports legacy path `/api/employees/:schoolId` via backward compatibility)
* **Rust Handler**: `employees::list_employees`
* **Kya kaam aati hai**: School ke sabhi employees ki list aur unke fields fetch karne ke liye.
* **Data Flow / Working**: 
  - Token aur school_id validation middleware pass hota hai.
  - SQL query `SELECT employee_id, data FROM employees WHERE school_id = $1` run karta hai.
  - Har employee ke corresponding experience aur education details subqueries se load karke combined JSON return kiya jata hai.
* **Test Command**:
  ```bash
  curl -s "http://localhost:8080/api/school/689225/people/employees" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json"
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "employees": []
  }
  ```
* **Actual Response (200)**:
  ```json
  {
    "employees": [
      {
        "employeeId": "E0002",
        "name": "Bulk Employee 1",
        "type": "teacher",
        "email": "bulk1@test.com",
        "phone": "+919826230028",
        "status": "active",
        "subject": "Physics",
        "department": "Science",
        "baseSalary": 45000
      }
    ],
    "success": true
  }
  ```

---

## 2. Create Employee
* **Endpoint**: `POST /api/school/:schoolId/people/employees` (Also supports legacy path `/api/employees/:schoolId`)
* **Rust Handler**: `employees::create_employee`
* **Kya kaam aati hai**: Ek naye employee profile ko system mein register karne ke liye.
* **Data Flow / Working**:
  - Request body parse hokar Aadhaar number uniqueness check ki jati hai.
  - `employee_id_seq` sequence se new employee ID generate hoti hai (e.g. `E0004`).
  - Database table `employees` mein basic properties insert hoti hain aur array inputs `experience` aur `education` alag relational tables mein add hote hain.
  - Global user login synchronization layer `global_user.sync_user` par user trigger hota hai.
* **Test Command**:
  ```bash
  curl -s -X POST "http://localhost:8080/api/school/689225/people/employees" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Employee","fatherName":"Father Name","motherName":"Mother Name","dob":"1990-05-15","gender":"Male","category":"General","employeeType":"teacher","baseSalary":50000.0,"email":"emp_test@test.com","phone":"+919166610420","alternativeContact":"+919876543211","permanent address":"123 Permanent St","temporaryAddress":"456 Temporary St","experience":[],"education":[],"aadhaarNumber":"137741105463","responsibilities":[]}'
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "employee": { "employeeId": "E0004" }
  }
  ```

---

## 3. Validate Employee Data
* **Endpoint**: `POST /api/school/:schoolId/people/employees/validate` (Also supports legacy path `/api/employees/:schoolId/validate`)
* **Rust Handler**: `employees::validate_employee`
* **Kya kaam aati hai**: Add/Update form submit karne se pehle frontend data structure aur constraints validation (Aadhaar uniqueness check) verify karne ke liye.
* **Test Command**:
  ```bash
  curl -s -X POST "http://localhost:8080/api/school/689225/people/employees/validate" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"aadhaarNumber":"137741105463","name":"Test Employee","phone":"+919166610420"}'
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Data is valid"
  }
  ```

---

## 4. Bulk Import Employees
* **Endpoint**: `POST /api/school/:schoolId/people/employees/bulk` (Also supports legacy path `/api/employees/:schoolId/bulk`)
* **Rust Handler**: `employees::bulk_import_employees`
* **Kya kaam aati hai**: Ek sath multiple employees ki details array format mein import karne ke liye.
* **Test Command**:
  ```bash
  curl -s -X POST "http://localhost:8080/api/school/689225/people/employees/bulk" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"employees":[{"name":"Bulk Employee 1","type":"teacher","email":"bulk1@test.com","phone":"+919296211299","subject":"Physics","department":"Science","baseSalary":45000.0},{"name":"Bulk Employee 2","type":"staff","email":"bulk2@test.com","phone":"+919766306653","subject":"None","department":"Office","baseSalary":30000.0}]}'
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "2 employees imported, 0 failed",
    "results": [
      { "row": 1, "status": "success", "employeeId": "E0005" },
      { "row": 2, "status": "success", "employeeId": "E0006" }
    ],
    "successCount": 2,
    "failCount": 0
  }
  ```

---

## 5. Get Single Employee
* **Endpoint**: `GET /api/school/:schoolId/people/employees/E0004` (Also supports legacy path `/api/employees/:schoolId/:employeeId`)
* **Rust Handler**: `employees::get_employee`
* **Kya kaam aati hai**: Kisi specific employee ki profile, experience aur education detail read karne ke liye.
* **Test Command**:
  ```bash
  curl -s "http://localhost:8080/api/school/689225/people/employees/E0004" \
    -H "Authorization: Bearer $TOKEN"
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "employee": { "employeeId": "E0004", "name": "Test Employee" }
  }
  ```

---

## 6. Update Employee
* **Endpoint**: `PUT /api/school/:schoolId/people/employees/:employeeId` (Also supports legacy path `/api/employees/:schoolId/:employeeId`)
* **Rust Handler**: `employees::update_employee`
* **Kya kaam aati hai**: Kis employee ki details edit ya modify karne ke liye.
* **Data Flow / Working**:
  - `employeeId` parameter validation check list mein inject kiya jata hai taaki dynamic Aadhaar unique check self-profile validation skip kare.
  - SQL `UPDATE employees SET data = $1, ... WHERE employee_id = $2` call hoti hai.
  - Changed profile image variables update hone par image storage tracking table cleanups dynamically perform hoti hain.
* **Test Command**:
  ```bash
  curl -s -X PUT "http://localhost:8080/api/school/689225/people/employees/E0004" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Updated Employee Name","fatherName":"Father Name","motherName":"Mother Name","dob":"1990-05-15","gender":"Male","category":"General","employeeType":"teacher","baseSalary":55000.0,"email":"emp_test@test.com","phone":"+919166610420","alternativeContact":"+919876543211","permanent address":"123 Permanent St","temporaryAddress":"456 Temporary St","experience":[],"education":[],"aadhaarNumber":"137741105463","responsibilities":[]}'
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Employee updated successfully"
  }
  ```

---

## 7. Set Base Salary Parameters
* **Endpoint**: `POST /api/school/:schoolId/people/employees/:employeeId/salary` (Also supports legacy path `/api/employees/:schoolId/:employeeId/salary`)
* **Rust Handler**: `emppay::set_base_salary`
* **Kya kaam aati hai**: Employee payroll calculation rules set karne ke liye (base salary, experience components, tenure coefficients etc).
* **Test Command**:
  ```bash
  curl -s -X POST "http://localhost:8080/api/school/689225/people/employees/E0004/salary" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"baseSalary":60000.0,"incrementPercent":5.0,"experienceYears":3.0,"experienceRate":1000.0,"tenureMonths":12.0,"tenureRate":500.0}'
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Salary parameters updated"
  }
  ```

---

## 8. Get Salary Breakdown
* **Endpoint**: `GET /api/school/:schoolId/people/employees/:employeeId/salary-breakdown` (Also supports legacy path `/api/employees/:schoolId/:employeeId/salary-breakdown`)
* **Rust Handler**: `emppay::get_salary_breakdown`
* **Kya kaam aati hai**: Employee ki active parameters, bonus, aid aur absent deductions ke base par dynamically calculated gross/net monthly salary return karna.
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "baseSalary": 60000.0,
      "spacesComponent": 0.0,
      "experienceComponent": 3000.0,
      "tenureComponent": 6000.0,
      "grossSalary": 9000.0,
      "deductions": 0.0,
      "netMonthlySalary": 9000.0
    }
  }
  ```

---

## 9. Add Bonus
* **Endpoint**: `POST /api/school/:schoolId/people/employees/:employeeId/bonus` (Also supports legacy path `/api/employees/:schoolId/:employeeId/bonus`)
* **Rust Handler**: `emppay::add_bonus`
* **Kya kaam aati hai**: Employee ki database json data column mein bonus amount dynamically add karne ke liye.
* **Test Command**:
  ```bash
  curl -s -X POST "http://localhost:8080/api/school/689225/people/employees/E0004/bonus" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"amount":5000.0}'
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": { "newBonus": 5000.0 }
  }
  ```

---

## 10. Add Aid
* **Endpoint**: `POST /api/school/:schoolId/people/employees/:employeeId/aid` (Also supports legacy path `/api/employees/:schoolId/:employeeId/aid`)
* **Rust Handler**: `emppay::add_aid`
* **Kya kaam aati hai**: Medical aid, helper checks ya special allowances add karne ke liye.
* **Test Command**:
  ```bash
  curl -s -X POST "http://localhost:8080/api/school/689225/people/employees/E0004/aid" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"amount":2000.0}'
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": { "newAid": 2000.0 }
  }
  ```

---

## 11. Close Month
* **Endpoint**: `POST /api/school/:schoolId/people/employees/:employeeId/close-month` (Also supports legacy path `/api/employees/:schoolId/:employeeId/close-month`)
* **Rust Handler**: `emppay::auto_close_month`
* **Kya kaam aati hai**: Current monthly cycles complete karke salary calculations list compile karna aur payments due check register karna.
* **Test Command**:
  ```bash
  curl -s -X POST "http://localhost:8080/api/school/689225/people/employees/E0004/close-month" \
    -H "Authorization: Bearer $TOKEN"
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Month closed successfully"
  }
  ```

---

## 12. Record Salary Payment
* **Endpoint**: `POST /api/school/:schoolId/people/employees/:employeeId/pay` (Also supports legacy path `/api/employees/:schoolId/:employeeId/pay`)
* **Rust Handler**: `emppay::record_salary_payment`
* **Kya kaam aati hai**: Advance payments ya due salary payouts register karne ke liye.
* **Test Command**:
  ```bash
  curl -s -X POST "http://localhost:8080/api/school/689225/people/employees/E0004/pay" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"type":"advance","amount":1000.0}'
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": { "type": "advance", "amount": 1000.0 }
  }
  ```

---

## 13. Delete Employee
* **Endpoint**: `DELETE /api/school/:schoolId/people/employees/:employeeId` (Also supports legacy path `/api/employees/:schoolId/:employeeId`)
* **Rust Handler**: `employees::delete_employee`
* **Kya kaam aati hai**: Employee records delete karne aur unke profile images storage configurations cleanup karne ke liye.
* **Test Command**:
  ```bash
  curl -s -X DELETE "http://localhost:8080/api/school/689225/people/employees/E0004" \
    -H "Authorization: Bearer $TOKEN"
  ```
* **Expected Response (200)**:
  ```json
  {
    "success": true,
    "message": "Employee deleted successfully"
  }
  ```

---

## ⚠️ Important Bugs Discovered & Fixed

1. **Aadhaar Uniqueness Self-Profile validation bug**:
   - When updating an employee profile, `validate_employee_data` failed with `Aadhaar Number already exists...` because the payload `employeeId` was missing in `data` JSON map, resolving `exclude_eid` to `None`. Fixed by dynamically injecting `employeeId` into validation payload prior to calling the uniqueness check.
2. **`profileImageUrl` query_scalar UnexpectedNullError panic**:
   - `sqlx::query_scalar` decodes table rows matching `SELECT data->>'profileImageUrl' ...`. When this value is NULL in database, standard decoders mapped to `Option<String>` crashed. Fixed by wrapping values using double Option layouts (`Option<Option<String>>`) and calling `.flatten()` correctly.
3. **Frontend API 404 Route Incompatibilities**:
   - Frontend and mobile applications requested paths under `/api/employees/...` and `/api/students/...` whereas backend controllers expected nested paths `/api/school/:schoolId/people/employees`. Resolved by adding explicit, backward-compatible routes in [router.rs](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/routes/router.rs) to prevent 404 errors completely.
