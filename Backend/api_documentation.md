# Super Admin API Documentation
**Base URL Route:** `/api/admin`

This document provides a comprehensive overview of all the Super Admin APIs, their workflows, exact purposes, and sample JSON payloads based on the Rust backend implementation.

All endpoints (except login) require a strictly valid Super Admin token passed in the header:
`Authorization: Bearer <token>`

---

## 1. Authentication

### Admin Login
**Endpoint:** `POST /api/admin/login`
**What it does:** Authenticates the super admin and returns an access token.
**Workflow:** Super Admin submits credentials → Backend verifies hash → Generates and returns JWT token.

**Request Payload:**
```json
{
  "username": "superadmin",
  "password": "my_secret_password"
}
```
**Response Details:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI... (JWT Token)",
  "message": "Super admin login successful"
}
```

---

## 2. Schools Management (CRUD)

### List All Schools
**Endpoint:** `GET /api/admin/schools`
**What it does:** Fetches a list of all registered schools on the platform.
**Response Details:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "school_id": "SCH_001",
      "school_name": "Delhi Public School",
      "status": "active",
      "wallet_balance": "1000.00",
      "session_duration_hours": 24
    }
  ]
}
```

### Get Single School
**Endpoint:** `GET /api/admin/schools/:schoolId`
**What it does:** Fetches detailed information, including statistics, for a specific school.
**Response Details:**
```json
{
  "success": true,
  "data": {
    "school_id": "SCH_001",
    "school_name": "Delhi Public School",
    "status": "active",
    "created_at": "2026-03-10T12:00:00Z"
  }
}
```

### Update School
**Endpoint:** `PUT /api/admin/schools/:schoolId`
**What it does:** Updates basic data properties of a school (like address, contact, etc. wrapped inside the `data` JSONB field).
**Request Payload (Example Updates):**
```json
{
  "contactNumber": "9876543210",
  "address": "New Delhi"
}
```
**Response:**
```json
{
  "success": true,
  "data": "School updated"
}
```

### Delete School
**Endpoint:** `DELETE /api/admin/schools/:schoolId`
**What it does:** Completely deletes the school and *all* its related data from the platform.
**Response:**
```json
{
  "success": true,
  "data": "School and all related data deleted"
}
```

---

## 3. Operations per School

### Set School Status (Block/Unblock)
**Endpoint:** `PATCH /api/admin/schools/:schoolId/status`
**What it does:** Changes the operational status of a school. Acceptable values are `active`, `blocked`, or `inactive`. If blocked, the school won't be able to log in.
**Request Payload:**
```json
{
  "status": "blocked"
}
```
**Response:**
```json
{
  "success": true,
  "data": "School status set to blocked"
}
```

### Change School Password
**Endpoint:** `PATCH /api/admin/schools/:schoolId/password`
**What it does:** Force-changes the login password for a school account.
**Request Payload:**
```json
{
  "newPassword": "new_secure_password_123"
}
```
**Response:**
```json
{
  "success": true,
  "data": "Password updated"
}
```

### Set Session Duration
**Endpoint:** `PATCH /api/admin/schools/:schoolId/session`
**What it does:** Configures how long (in hours) a school's login token remains valid before they must log in again. Max allowed is 8760 hours (1 year).
**Request Payload:**
```json
{
  "hours": 48
}
```
**Response:**
```json
{
  "success": true,
  "data": "Session duration set to 48 hours"
}
```

### Expire School Sessions
**Endpoint:** `DELETE /api/admin/schools/:schoolId/sessions`
**What it does:** Instantly invalidates all active login sessions/tokens for the specified school, forcing them to log in again immediately.
**Response:**
```json
{
  "success": true,
  "data": "5 sessions expired"
}
```

### Send Notification to School
**Endpoint:** `POST /api/admin/schools/:schoolId/notify`
**What it does:** Sends an alert/notification directly to a school's dashboard.
**Request Payload:**
```json
{
  "title": "System Maintenance",
  "message": "The servers will be down at midnight for 10 minutes.",
  "type": "warning"
}
```

### Clear Notification
**Endpoint:** `DELETE /api/admin/schools/:schoolId/notify`
**What it does:** Clears any active notification set by the admin for the school.

---

## 4. Promo Codes & Billing

### Create Promo Code
**Endpoint:** `POST /api/admin/promos`
**What it does:** Generates a new promo code that schools can use for discounts or wallet credits.
**Request Payload:**
```json
{
  "code": "SUMMER2026",
  "creditAmount": "500",
  "freeDays": 30,
  "discountPercentage": "10.00",
  "maxUses": 100,
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

### List Promo Codes
**Endpoint:** `GET /api/admin/promos`
**What it does:** Lists all promo codes created by the Super Admin.

### Get Promo Usage
**Endpoint:** `GET /api/admin/promos/:promoId/usage`
**What it does:** Shows statistics about which schools used a particular promo code.

### Apply Promo to School (Directly)
**Endpoint:** `POST /api/admin/schools/:schoolId/apply-promo`
**What it does:** Forces a promo/discount to be applied to a specific school account on their behalf.
**Request Payload:**
```json
{
  "code": "SUMMER2026"
}
```

---

## 5. Support Ticketing

### List Support Requests
**Endpoint:** `GET /api/admin/support`
**What it does:** Fetches all inquiries and support tickets raised by schools.

### Resolve Support Request
**Endpoint:** `PATCH /api/admin/support/:id/resolve`
**What it does:** Marks a specific support ticket ID as resolved/closed.
**Response:**
```json
{
  "success": true,
  "data": "Request marked as resolved"
}
```

---

## 6. Backup & Restore

### Export Single School Data
**Endpoint:** `GET /api/admin/schools/:schoolId/export`
**What it does:** Downloads all database tables, records, students, and settings associated directly with that specific school as a single JSON file backup.

### Import Single School Data
**Endpoint:** `POST /api/admin/schools/:schoolId/import`
**What it does:** Restores a school's entire database structure from a previously exported JSON backup payload.

### Export All Schools
**Endpoint:** `GET /api/admin/schools/export/all`
**What it does:** Triggers a mass JSON export of the entire system across every active school on the platform.

### Global Backup (Manual Database Trigger)
**Endpoint:** `POST /api/admin/backup`
**What it does:** Triggers the system's global Postgres DB backup routine manually (outside of the 15-minute cron job interval), saving data directly to the server's disk space.
**Response:**
```json
{
  "success": true,
  "data": "Manual backup completed successfully"
}
```

---

## 7. Geo Data (`/api/geo`)
These endpoints provide the geographical boundaries (Countries, States, Districts) required during school setup, student profile, or employee profile creation.

### Get Countries
**Endpoint:** `GET /api/geo/countries`
**What it does:** Returns a list of all countries available.
**Response:**
```json
[
  {
    "id": 1,
    "name": "India",
    "code": "IN",
    "phone_code": "+91"
  }
]
```

### Get States
**Endpoint:** `GET /api/geo/states/:countryId`
**What it does:** Fetches states for a specific country ID.
**Response:**
```json
[
  {
    "id": 1,
    "country_id": 1,
    "name": "Maharashtra"
  }
]
```

### Get Districts
**Endpoint:** `GET /api/geo/districts/:stateId`
**What it does:** Fetches districts for a specific state ID.
**Response:**
```json
[
  {
    "id": 1,
    "state_id": 1,
    "name": "Mumbai"
  }
]
```

### Export Geo Data
**Endpoint:** `GET /api/geo/export`
**What it does:** Returns the entire geo data catalog as a JSON object, read directly from the `Backup/geo.json` backup file.

### Import Geo Data
**Endpoint:** `POST /api/geo/import`
**What it does:** Accepts a JSON payload containing geo records, writes it to `Backup/geo.json`, and triggers the auto-restore routine to sync the database.

---

## 8. School Notifications (Polling)
These endpoints are designed to be polled periodically by the school dashboard/frontend.

### Get School Notification
**Endpoint:** `GET /api/school/:schoolId/notification`
**What it does:** Checks if there is an active alert/notification set by the Super Admin for this specific school.
**Response:**
```json
{
  "success": true,
  "data": {
    "title": "System Maintenance",
    "message": "Servers down tonight.",
    "type": "warning",
    "sentAt": "2026-03-10T15:00:00Z",
    "dismissible": true
  }
}
```

### Clear School Notification
**Endpoint:** `DELETE /api/school/:schoolId/notification`
**What it does:** Allows the school dashboard to clear the alert (dismiss it) once the user has read it.

---

## 9. Authentication (`/api/auth`)
Standard authentication for schools (Admin/Teachers) to access the system.

### Login
**Endpoint:** `POST /api/auth/login` (Also specifically mapped at `POST /api/auth/school/login`)
**What it does:** Authenticates a school user using their school ID and password.
**Request Payload:**
```json
{
  "schoolId": "SCH_001",
  "password": "mypassword123",
  "userType": "admin"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJ0eXAiOiJ....",
  "schoolId": "SCH_001",
  "expiresIn": "1h"
}
```

### Set Security Question
**Endpoint:** `POST /api/auth/school/set-security`
**What it does:** Sets a security question and its hashed answer for account recovery.
**Request Payload:**
```json
{
  "schoolId": "SCH_001",
  "question": "What is your mother's maiden name?",
  "answer": "Sharma"
}
```

### Forgot Password
**Endpoint:** `POST /api/auth/school/forgot-password`
**What it does:** If the user answers the security question correctly, the system generates and returns a temporary password.
**Request Payload:**
```json
{
  "schoolId": "SCH_001",
  "answer": "Sharma"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Temporary password generated. Use it to login and change your password.",
  "tempPassword": "A9z2Xy"
}
```

---

## 10. Complains / Tickets (`/api/complains`)
Manages internal school complaints (e.g., student reports, maintenance reports).

### Create Complain
**Endpoint:** `POST /api/complains/:schoolId`
**What it does:** Registers a new complaint or issue.
**Request Payload:**
```json
{
  "studentId": "STU_105",
  "title": "Broken Desk",
  "description": "The desk in Room 101 is broken.",
  "priority": "high",
  "category": "infrastructure"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "complainId": "CMP_001",
    "status": "open",
    "createdAt": "2026-03-10T12:00:00Z"
  }
}
```

### List All Complains
**Endpoint:** `GET /api/complains/:schoolId`
**What it does:** Retrieves a list of all complaints filed within the given school.

### List Complains by Student
**Endpoint:** `GET /api/complains/:schoolId/student/:studentId`
**What it does:** Retrieves a filtered list of complaints associated specifically with a single student profile.

---

## 11. Student Management (`/api/students`)
Core APIs for managing user data inside a school.

### Create Single Student
**Endpoint:** `POST /api/students/:schoolId/students`
**What it does:** Adds a single student to the database.
**Request Payload:**
```json
{
  "className": "10th A",
  "name": "Arjun Kumar",
  "gender": "Male",
  "dob": "2010-05-15",
  "contact": "9876543210",
  "parentName": "Vijay Kumar",
  "totalFee": 25000.00
}
```
**Response:**
```json
{
  "success": true,
  "message": "Student added successfully",
  "data": {
    "studentId": "STU_8910",
    "status": "active"
  }
}
```

### Bulk Import Students
**Endpoint:** `POST /api/students/:schoolId/students/bulk`
**What it does:** Allows importing multiple students at once (usually from a CSV/Excel file uploaded on the frontend).
**Request Payload:**
```json
{
  "students": [
    { "Name": "Rahul", "Class Name": "10th A", "Contact": "9876543210" },
    { "Name": "Simran", "Class Name": "9th B", "Contact": "9988776655" }
  ]
}
```
**Response:**
```json
{
  "success": true,
  "message": "2 students imported, 0 failed",
  "successCount": 2,
  "failCount": 0,
  "results": [
    { "row": 1, "status": "success", "studentId": "STU_100" },
    { "row": 2, "status": "success", "studentId": "STU_101" }
  ]
}
```

### Get/Update/Delete Single Student
*   **Get:** `GET /api/students/:schoolId/students/:studentId` (Fetches full profile JSON)
*   **Update:** `PUT /api/students/:schoolId/students/:studentId` (Accepts partial JSON directly mapping to the database fields)
*   **Delete:** `DELETE /api/students/:schoolId/students/:studentId`

---

## 12. Employee Management (`/api/employees`)
APIs handling staff members, teachers, drivers, and their fundamental salary metadata.

### Create Employee
**Endpoint:** `POST /api/employees/:schoolId/employees`
**What it does:** Registers a new staff member.
**Request Payload:**
```json
{
  "name": "Sunita Verma",
  "employeeType": "teacher",
  "department": "Mathematics",
  "baseSalary": 50000.00,
  "email": "sunita@school.com",
  "experience": [],
  "education": []
}
```
**Response:**
```json
{
  "success": true,
  "employee": {
    "employeeId": "EMP_001",
    "name": "Sunita Verma"
  }
}
```

### Salary Breakdown (EmpPay)
**Endpoint:** `GET /api/employees/:schoolId/:employeeId/salary-breakdown`
**What it does:** Calculates the exact payable salary for the current month after factoring in base pay, unpaid leaves, bonuses, and aids/fines.

### Add Bonus / Add Aid
*   **Bonus Endpoint:** `POST /api/employees/:schoolId/:employeeId/bonus` (Adds reward money)
*   **Aid Endpoint:** `POST /api/employees/:schoolId/:employeeId/aid` (Adds penalty/fine money)
**Request Payload:**
```json
{
  "amount": 1000.00,
  "reason": "Excellent Performance in Science Fair"
}
```

---

## 13. Space Management (`/api/spaces`)
Schools track their physical infrastructure (Classrooms, Labs, Playgrounds) to assign responsibilities efficiently.

### Create Space Category
**Endpoint:** `POST /api/spaces/:schoolId/categories`
**What it does:** Creates a classification for spaces (e.g., "Science Lab", "Auditorium").
**Request Payload:**
```json
{
  "name": "Computer Lab"
}
```

### Create / Bulk Import Spaces
*   **Single Create:** `POST /api/spaces/:schoolId/spaces`
*   **Bulk Import:** `POST /api/spaces/:schoolId/spaces/bulk`
**Bulk Request Payload:**
```json
{
  "spaces": [
    { "Space Name": "Room 101" },
    { "Space Name": "Main Library" }
  ]
}
```

### Space Assignments
*   **Assign Materials (Inventory):** `POST /api/spaces/:schoolId/:spaceId/materials` (Assigns books, desks, or chemicals to a specific room).
*   **Assign Employees (In-charge):** `POST /api/spaces/:schoolId/:spaceId/employees` (Assigns staff members as in-charges of a physical space).
**Assign Material Request Payload:**
```json
[
  { "materialId": "MAT_101", "quantity": 30 },
  { "materialId": "MAT_102", "quantity": 1 }
]
```

### Materials Bulk Import
**Endpoint:** `POST /api/materials/:schoolId/bulk`
**What it does:** Allows the school to import their entire starting inventory directly via CSV/JSON mapping.
**Request Payload Sample:**
```json
{
  "materials": [
    { "Name": "Chalk Box", "Quantity": 100, "Price": 50 },
    { "Name": "Projector", "Quantity": 5, "Price": 12000 }
  ]
}
```

---

## 14. Academic Management
APIs to manage classes, subjects, exams, and topics.

### Create Class
**Endpoint:** `POST /api/class/:schoolId/classes`
**What it does:** Adds a new class/grade level to a specific school.
**Request Payload:**
```json
{
  "className": "10th Grade"
}
```

### List Classes
**Endpoint:** `GET /api/class/:schoolId/classes`
**What it does:** Returns a list of all classes created in the system.

### Create Subject
**Endpoint:** `POST /api/subjects/:schoolId`
**What it does:** Appends a new academic subject to the school.
**Request Payload:**
```json
{
  "name": "Mathematics",
  "code": "MATH101"
}
```

### Create Exam
**Endpoint:** `POST /api/exams/:schoolId`
**What it does:** Registers a new examination schedule.
**Request Payload:**
```json
{
  "name": "Mid-Term Examination 2026",
  "startDate": "2026-09-01",
  "endDate": "2026-09-15"
}
```

### Create Topic
**Endpoint:** `POST /api/topics`
**What it does:** Adds a specific topic to a broader subject.
**Request Payload:**
```json
{
  "subjectId": "SUB_1",
  "topicName": "Algebra",
  "description": "Basic algebraic expressions"
}
```

---

## 15. Attendance Operations (`/api/operations/attendance`)
Manages daily attendance for both students and employees, including school-endorsed holidays.

### Mark Present
**Endpoint:** `POST /api/operations/attendance/:schoolId/:role/:userId/present`
**What it does:** Marks a student or employee as present on a specific date. 
*(Note: Valid roles are exactly `student` or `employee`)*
**Request Payload:**
```json
{
  "date": "2026-03-10",
  "remarks": "Arrived late"
}
```

### Mark Holiday (Individual)
**Endpoint:** `POST /api/operations/attendance/:schoolId/:role/:userId/holiday`
**What it does:** Manually marks a specific student or employee as being on leave/holiday.
**Request Payload:**
```json
{
  "date": "2026-03-10"
}
```

### Update / Delete Attendance
*   **Update:** `PUT /api/operations/attendance/:schoolId/:role/:userId/:date` (Update existing records)
*   **Delete:** `DELETE /api/operations/attendance/:schoolId/:role/:userId/:date` (Erase an attendance entry)

### List Attendance By Date (Students Only)
**Endpoint:** `GET /api/operations/attendance/:schoolId/student/date/:date`
**What it does:** Efficiently fetches only the IDs of all students who were marked "Present" on a specific day.

### School Holidays Management
Schools can set global holidays (like summer breaks) where no one can mark attendance unless specifically exempted.
*   **Create Global Holiday:** `POST /api/operations/attendance/:schoolId/holidays`
*   **List Holidays:** `GET /api/operations/attendance/:schoolId/holidays`
*   **Check Date for Holiday:** `GET /api/operations/attendance/:schoolId/holidays/check?date=YYYY-MM-DD` (Automatically counts Sundays as holidays)

**Create Global Holiday Request Payload:**
```json
{
  "title": "Summer Vacation",
  "description": "Annual summer break",
  "fromDate": "2026-05-01",
  "toDate": "2026-06-30",
  "classes": ["10th Grade", "9th Grade"],
  "exemptEmployees": ["EMP_001"],
  "exemptStudents": []
}
```

---

## 16. Fees Management (`/api/fees`)
Complete financial tracking for student tuition, custom fees (like transport), and discount coupons.

### Create School Fee Structure
**Endpoint:** `POST /api/fees/:schoolId`
**What it does:** Generates a standard baseline fee applied at the school level.
**Request Payload:**
```json
{
  "feeType": "Tuition Fee",
  "amount": 50000.00
}
```

### Fetch Default/Pending Fees
*   **Get All Fees:** `GET /api/fees/:schoolId`
*   **Get Pending Defaulters:** `GET /api/fees/:schoolId/pendingFees/filter?minPercentage=50&className=10th` (Filter students who haven't paid their dues above a certain percentage threshold).

### Student Specific Fees
*   **Get Student Ledger:** `GET /api/fees/:schoolId/student/:studentId`
*   **Add Fee to specific Student Ledger:** `POST /api/fees/:schoolId/student/:studentId/add`
*   **Pay Fee (Record Transaction):** `POST /api/fees/:schoolId/student/:studentId/pay`
*   **Apply Permanent Discount:** `POST /api/fees/:schoolId/student/:studentId/discount`

**Pay Fee Request Payload:**
```json
{
  "amount": 25000.00
}
```

### Custom Fees
Allows creation of ad-hoc fees beyond the standard school structure (e.g., specific lab fees, sudden trip fees).
*   **Create Ad-Hoc Fee:** `POST /api/fees/:schoolId/custom`
*   **Apply Custom Fee directly to ledgers:** `POST /api/fees/:schoolId/custom/:feeId/apply`

### Coupons / Referrals
Manage promotional codes explicitly generated by the school (distinct from Super Admin promos).
*   **Create Coupon:** `POST /api/fees/:schoolId/coupons`
*   **Validate Before Use:** `POST /api/fees/:schoolId/coupons/validate`
*   **Use Coupon on Student Fee:** `POST /api/fees/:schoolId/coupons/:couponId/use`

**Create Coupon Request Payload:**
```json
{
  "code": "REFERRAL2026",
  "discountAmount": 1000.00,
  "maxUses": 50,
  "expiresAt": "2026-12-31"
}
```

---

## 17. Expanded Profiles & Payroll

### Student Extended Profile
**Endpoint:** `GET /api/students/:schoolId/students/:studentId/profile`
**What it does:** Fetches the student's complete profile enriched natively with their exact fee breakdown (paid vs pending).

### Set Employee Base Salary
**Endpoint:** `POST /api/payroll/:schoolId/employees/:employeeId`
**What it does:** Explicitly sets or updates the basic monthly salary for an employee.
**Request Payload:**
```json
{
  "baseSalary": 65000.00
}
```

---

## 18. Communication, Resources, and Tasks

### Create Announcement (Notice Board)
**Endpoint:** `POST /api/announcements/:schoolId/:type/:userId`
**What it does:** Broadcasts a notice or announcement. `:type` can be `school`, `class`, or `role`.
**Request Payload:**
```json
{
  "title": "Tomorrow is a Holiday",
  "content": "Due to heavy rain, the school will remain closed."
}
```

### Events
**Endpoint:** `POST /api/events/:schoolId`
**What it does:** Creates a calendar event (e.g., Annual Sports Day).
**Request Payload:**
```json
{
  "title": "Annual Sports Day",
  "date": "2026-12-20",
  "description": "All students must participate."
}
```

### Tasks
**Endpoint:** `GET /api/task/:schoolId`
**What it does:** Retrieves all pending administrative or academic tasks linked to the school.

---

## 19. HR & Leave Management (`/api/leave`)
Employees and Students can request leaves; Admins approve/reject them.

### Request Leave
**Endpoint:** `POST /api/leave/:schoolId`
**What it does:** Submits a leave request.
**Request Payload:**
```json
{
  "userId": "EMP_001",
  "role": "employee",
  "startDate": "2026-04-10",
  "endDate": "2026-04-12",
  "reason": "Family Medical Emergency"
}
```

### Leave Operations
*   **List Leaves:** `GET /api/leave/:schoolId`
*   **Approve:** `POST /api/leave/:schoolId/:leaveId/approve`
*   **Reject:** `POST /api/leave/:schoolId/:leaveId/reject`
*   **Extend:** `POST /api/leave/:schoolId/:leaveId/extend` (Payload needs `{"days": 2}`)
*   **Reduce:** `POST /api/leave/:schoolId/:leaveId/reduce` (Payload needs `{"days": 1}`)
*   **Download PDF:** `GET /api/leave/:schoolId/:leaveId/pdf` (Generates an official PDF Leave Letter for printing).

---

## 20. School Setup & Profile Update

### Get/Update School Profile
*   **View Profile:** `GET /api/school/:schoolId`
*   **Update Own Profile:** `PUT /api/school/:schoolId`
*   **Change Own Password:** `PATCH /api/school/:schoolId`

### Initial System Setup
**Endpoint:** `POST /api/setup/school`
**What it does:** When a brand new school logs in for the first time, this endpoint configures their classes, subjects, standard fees, and initial infrastructure all in one massive bulk payload.

---

## 21. AI and OCR Integrations

### Query AI Assistant
**Endpoint:** `POST /api/ai/:schoolId/query`
**What it does:** Allows the school admin to ask natural language questions (e.g., "Which students haven't paid fees?"). The backend triggers a Gemini LLM alongside function calling to fetch database results.
**Request Payload:**
```json
{
  "query": "Show me the list of students in 10th grade who have pending fees."
}
```
**Response:**
```json
{
  "success": true,
  "data": "Here is the list of students in 10th grade with pending dues: \n1. Rahul (₹5000 pending)\n 2. Simran (₹2500 pending)..."
}
```

### OCR Text Extraction (Image/PDF Reading)
**Endpoint:** `POST /api/ocr-routes/extract?engine=paddleocr`
**What it does:** Accepts a `multipart/form-data` image upload and returns all the extracted text found inside the image (used for scanning report cards, ID proofs, etc.).

**Form-Data Payload:**
*   `image`: `<File Binary>`

**Response:**
```json
{
  "success": true,
  "data": [
    "Extracted text line 1",
    "Extracted text line 2"
  ]
}
```

---

## 22. Mobile App Authentication (Students/Teachers)

### Mobile Login (Request OTP)
**Endpoint:** `POST /:schoolId/mobile/login`
**What it does:** Initiates a login for the mobile app (WhatsApp style) by sending an OTP to the provided identifier (Phone for teacher, ID for student).
**Request Payload:**
```json
{
  "ident": "9876543210",
  "role": "teacher" 
}
```

### Mobile Verify OTP
**Endpoint:** `POST /:schoolId/mobile/verify`
**What it does:** Verifies the OTP and returns a long-lived (10-year) JWT token for the mobile session.
**Request Payload:**
```json
{
  "ident": "9876543210",
  "role": "teacher",
  "otp": "1234"
}
```

---

## 23. Auxiliary Features (Awards, Documents, Reminders, Responsibilities)

### Awards
**Endpoint:** `GET /api/award/:schoolId`
**What it does:** Lists all awards distributed within the school.

### Setup (View Current Configuration)
**Endpoint:** `GET /api/setup/:schoolId`
**What it does:** Retrieves the current infrastructure setup mapping for the school (Class & Subject associations).

### Document Box (File Management)
*   **Upload General Document:** `POST /api/document_upload/:schoolId`
*   **Upload Student Specific Document:** `POST /api/document_upload/:schoolId/student/:studentId`
*   **List Saved Documents:** `GET /api/documentbox/:schoolId`

**Upload Payload:** Expects standard file upload.

### Reminders
**Endpoint:** `GET /api/reminder/:schoolId`
**What it does:** Lists upcoming administrative or student reminders.

### Responsibilities (Delegation)
Allows assigning specific recurring responsibilities (like "Library Incharge", "Sports Coordinator") to employees.
*   **List Global Responsibilities:** `GET /api/responsibility/:schoolId`
*   **Create Global Responsibility Role:** `POST /api/responsibility/:schoolId`
*   **List an Employee's Responsibilities:** `GET /api/responsibility/:schoolId/employees/:employeeId/responsibilities`
*   **Assign Responsibility to Employee:** `POST /api/responsibility/:schoolId/employees/:employeeId/responsibilities`
*   **Remove Employee Responsibility:** `DELETE /api/responsibility/:schoolId/employees/:employeeId/responsibilities/:responsibilityId`

**Create Responsibility Payload:**
```json
{
  "title": "Head of Disciplinary Committee",
  "description": "Handles student misconduct"
}
```

**Assign Responsibility Payload:**
```json
{
  "responsibilityId": "RESP_001"
}
```
