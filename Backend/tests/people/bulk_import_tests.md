# People API — Bulk Import Verification & Documentation

This document contains verification details, supported schemas, dynamic descriptions, data flows, and actual/expected payloads for **Student & Employee Bulk Import APIs**.

---

## Actual Route Table

| # | Endpoint | Method | Rust Handler | Description |
|---|----------|--------|--------------|-------------|
| 1 | `/api/school/:schoolId/people/students/bulk` | POST | `bulk_import_students` | Inserts an array of student profiles into the database and syncs them to global users. |
| 2 | `/api/school/:schoolId/people/employees/bulk` | POST | `bulk_import_employees` | Inserts an array of employee profiles and setups baseline salary mappings. |

---

## 1. Bulk Import Students

* **Endpoint**: `POST /api/school/:schoolId/people/students/bulk`
* **Rust Handler**: `students::bulk_import_students`
* **Kya kaam aati hai**: Ek sath bulk CSV/Excel files ya raw lists se multiple students ke complete data profiles ko system me add karne ke liye.
* **Data Flow / Working**:
  - Request body me `students` array validate kiya jata hai.
  - Har student ke roll number, section allocation, base fee structure ko dynamically calculate kiya jata hai.
  - Classroom space check perform hota hai. Space exist nahi karti to space automatically register ho jati hai.
  - Dynamic user details aur login synchronization layer `global_user.sync_user` execute hoti hai.
* **Supported Columns (No details missing)**:
  - `name` (Student Name)
  - `className` (Allocated Space/Classroom)
  - `email` (Communication Email)
  - `contact` (Primary Contact Phone)
  - `alternativeContact` (Secondary/Parent Contact)
  - `dob` (Date of Birth)
  - `gender` (Gender)
  - `aadhaarNumber` (Aadhaar Card ID)
  - `fatherName` (Father's Name)
  - `motherName` (Mother's Name)
  - `addressLine1` (Primary Address)
  - `addressCity` (City)
  - `addressState` (State)
  - `addressPincode` (Pincode)
  - `admissionDate` (Admission Date)
  - `roomNumber` (Physical Room Index)
  - `studentType` (Private/Regular Category)
  - `bloodGroup` (Blood Group)
  - `caste` (Category/Caste)
  - `emergencyContact` (Emergency Contact Number)

* **Test Curl Command**:
  ```bash
  curl -s -X POST "http://localhost:8080/api/school/689225/people/students/bulk" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "students": [
        {
          "name": "Bulk Student One",
          "className": "10-A",
          "email": "student_bulk1@test.com",
          "contact": "+919876543211",
          "address": "Street 1, Delhi",
          "aadhaarNumber": "123456789012",
          "gender": "Male",
          "dob": "2010-06-15",
          "fatherName": "Father One",
          "motherName": "Mother One"
        },
        {
          "name": "Bulk Student Two",
          "className": "10-A",
          "email": "student_bulk2@test.com",
          "contact": "+919876543212",
          "address": "Street 2, Delhi",
          "aadhaarNumber": "123456789013",
          "gender": "Female",
          "dob": "2011-08-20",
          "fatherName": "Father Two",
          "motherName": "Mother Two"
        }
      ]
    }'
  ```

* **Expected Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "2 students imported, 0 failed",
    "results": [
      { "row": 1, "status": "success", "studentId": "S000018" },
      { "row": 2, "status": "success", "studentId": "S000019" }
    ],
    "successCount": 2,
    "failCount": 0
  }
  ```

---

## 2. Bulk Import Employees

* **Endpoint**: `POST /api/school/:schoolId/people/employees/bulk`
* **Rust Handler**: `employees::bulk_import_employees`
* **Kya kaam aati hai**: Pure school staff, teachers aur administrators ki list ko directly upload karke dynamic credentials, basic salary mappings aur user profiles allocate karne ke liye.
* **Data Flow / Working**:
  - `employees` array parameter read hota hai.
  - Aadhaar card validation checks aur phone format filters sequence-by-sequence execute hote hain.
  - Sequence-generator se dynamic Employee ID (`E0001`, `E0002`...) allocate ki jati hai.
  - Staff profiles database me write ki jati hain, aur baseline salary details setup and save ho jati hain.
* **Supported Columns (No details missing)**:
  - `name` (Full Name)
  - `employeeType` (Role: teacher/staff/principal)
  - `email` (Official/Personal Email)
  - `phone` (Primary Phone Number)
  - `alternativeContact` (Alternative contact phone)
  - `dob` (Date of Birth)
  - `gender` (Gender)
  - `category` (General/OBC/SC/ST)
  - `fatherName` (Father's Name)
  - `motherName` (Mother's Name)
  - `permanent address` (Permanent Home Address)
  - `temporaryAddress` (Current Residing Address)
  - `aadhaarNumber` (Government Identification Aadhaar)
  - `bloodGroup` (Blood Group)
  - `emergencyContact` (Emergency Contact Number)
  - `bankAccountNumber` (Bank Payout Account Number)
  - `bankIfscCode` (IFSC code)
  - `baseSalary` (Gross Base Salary Amount)
  - `subject` (Core expertise subject)
  - `department` (Assigned Department)

* **Test Curl Command**:
  ```bash
  curl -s -X POST "http://localhost:8080/api/school/689225/people/employees/bulk" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "employees": [
        {
          "name": "Bulk Staff One",
          "employeeType": "teacher",
          "email": "staff_bulk1@test.com",
          "phone": "+919998887771",
          "dob": "1988-04-12",
          "gender": "Male",
          "category": "General",
          "fatherName": "Emp Father One",
          "motherName": "Emp Mother One",
          "permanent address": "Permanent Rd 1",
          "aadhaarNumber": "987654321012",
          "baseSalary": 55000.0,
          "subject": "Mathematics",
          "department": "Science"
        },
        {
          "name": "Bulk Staff Two",
          "employeeType": "staff",
          "email": "staff_bulk2@test.com",
          "phone": "+919998887772",
          "dob": "1992-12-05",
          "gender": "Female",
          "category": "OBC",
          "fatherName": "Emp Father Two",
          "motherName": "Emp Mother Two",
          "permanent address": "Permanent Rd 2",
          "aadhaarNumber": "987654321013",
          "baseSalary": 35000.0,
          "subject": "Administration",
          "department": "Office"
        }
      ]
    }'
  ```

* **Expected Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "2 employees imported, 0 failed",
    "results": [
      { "row": 1, "status": "success", "employeeId": "E0010" },
      { "row": 2, "status": "success", "employeeId": "E0011" }
    ],
    "successCount": 2,
    "failCount": 0
  }
  ```

---

## ⚠️ Fixed Bugs & Enhancements

1. **Missing Fields During Bulk Imports**:
   - **Old Behavior**: Handlers mapped only a handful of keys (like name, phone, email, and class), causing critical details (like gender, dob, aadhaarNumber, fatherName, motherName, addresses, and emergency contacts) to be completely lost.
   - **Fix**: Upgraded both student and employee bulk import mapping blocks to dynamically check and bind all possible columns present in CSV/JSON payloads.
2. **Missing UI bulk buttons**:
   - **Student Page**: `student.jsx` imported the bulk modal but didn't expose any button or state triggers.
   - **Fix**: Integrated the `Import CSV` action button, configured state handling, and wired up `BulkImportModal` with proper hooks and mutation endpoints.
