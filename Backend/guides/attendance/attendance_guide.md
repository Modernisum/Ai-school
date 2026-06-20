# 📅 Chapter 8: Attendance & Leaves Domain Manual

## Fresher Developer Quick Links

- `README.md` — Attendance guide index aur API contract structure.
- `implementation_plan.md` — Attendance/leave API docs ko split `.md` files mein implement karne ka plan.
- `api/00-index.md` — Attendance/leave route groups aur expected `.md` file locations.

Yeh manual daily roll-call registers, geofence QR check-in, biometric database sync, calendar holidays, leaves applications, aur proxy teacher management ko explain karta hai.

---

## 📖 Overview aur Features (Udeshya aur Suvidhayein)

### 🎯 Feature Purpose (Kyun banaya gaya hai)
Students aur staff ki attendance track karta hai, leaves handle karta hai, aur substitute teachers manage karta hai. Geofence/biometric se roll-call auto-register ho jata hai.


Attendance aur Leaves domain school-wide daily registers aur leave management ko handle karta hai:
- **Biometric & Bi-daily registers:** Student/staff check-in aur check-out logs track karta hai.
- **Geofenced QR Scans:** Location-restricted QR codes generate karta hai aur user GPS check karke present mark karta hai.
- **Biometric Offline Sync:** Offline biometrics data cache karta hai aur network aane par cloud db se sync karta hai.
- **Holiday Planners:** Attendance metrics se holidays ko remove/exclude karta hai.
- **Leaves Pipeline:** Leave applications, extensions/reductions, aur priority queues manage karta hai.
- **Coverage Assigners:** Absent teacher ki jagah substitute proxy teacher recommend karta hai.
- **AI Workload Audits:** AI se check karta hai ki teacher leave ka syllabus timeline par kya impact padega.

---

## 🏗️ Architecture aur Data Flow

### 🛠️ Tech Stack aur Dependencies
- **Framework:** Axum
- **Database:** Postgres (sqlx).
- **Caching:** Redis for QR tokens with TTL.
- **Geo:** Haversine formula logic for geofence validation.

### 🌊 Deep Code aur Data Flow
1. **Request:** Mobile app QR code token aur user ki GPS location bhejta hai.
2. **Validation:** Redis QR token verify karta hai aur distance formula check karta hai ki user class ke 50m ke andar hai ya nahi.
3. **Service Logic:** `services/attendance/` user ko present mark karta hai.
4. **Database:** Database update hota hai.
5. **Response:** Check-in confirmation bhej di jati hai.


- **Route Module:** `src/domain/attendance/mod.rs`
- **Handler Files:** `src/domain/attendance/attendance.rs`, `src/domain/attendance/attendance_automation.rs`, `src/domain/attendance/leave.rs`
- **Services:** `src/services/attendance/`
- **Repositories:** `src/repository/attendance/`
- **Database Tables:** `attendance`, `holidays`, `attendance_qr_tokens`, `leave_applications`, `leave_coverage`, `leave_history`, `leave_policies`

```mermaid
sequenceDiagram
    autonumber
    actor Mobile as Student Mobile App
    participant Attendance as Attendance Handlers (Axum)
    participant Redis as Session Token Registry (Redis)
    database DB as Postgres Database

    Mobile->>Attendance: POST /attendance/user {"token": "qr_token_str", "latitude": 28.52, "longitude": 77.21}
    Note over Attendance: Validate token expiration in Redis.<br/>Verify GPS distance is under 50 meters from classroom coordinate.
    Attendance->>DB: INSERT INTO attendance (user_id, status, check_in_time) VALUES (...)
    DB-->>Attendance: OK
    Attendance-->>Mobile: JSON { success: true, message: "Checked in successfully" }
```

---

## 🚦 Developer Laws (Do's aur Don'ts - Kya karein aur kya na karein)

- **DO:** Check-in dates ko holidays checklist se verify karein taaki galat 'absent' mark na ho.
- **DO:** Geofenced check-in mein GPS coordinates validate karein aur coordinates spoofing detect karein.
- **DON'T:** Bina leave policies aur previous logs data check kiye memory mein direct leave balance calculate na karein.
- **DON'T:** Pehle se approved ya rejected leave applications ke dates change karne ki permission na dein.

---

## 🔌 API Reference aur Specs (API Ki Jankari)

### 1. Daily Attendance Registers

#### A. Log User Check-In Present Today
- **Endpoint:** `POST /api/school/:schoolId/attendance/:role/:userId/present`
- **Path Parameters:**
  - `role` (string, required): `student` or `employee`.
  - `userId` (string, required): Target user ID.
- **Request Body:**
  ```json
  {
    "status": "present",
    "remarks": "Arrived via bus route A"
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "message": "Attendance marked successfully"
  }
  ```

#### B. Update Check-In Timestamps
- **Endpoint:** `PUT /api/school/:schoolId/attendance/:role/:userId/:date`
- **Request Body:**
  ```json
  {
    "status": "half_day",
    "inTime": "09:00:00",
    "outTime": "12:30:00"
  }
  ```

#### C. Get Present Student IDs on Date
- **Endpoint:** `GET /api/school/:schoolId/attendance/student/date/:date`
- **Success Response:**
  ```json
  {
    "success": true,
    "data": ["STD-00921", "STD-99882"]
  }
  ```

#### D. Submit Class Roll Call Logs
- **Endpoint:** `POST /api/school/:schoolId/attendance/bulk`
- **Request Body:**
  ```json
  {
    "date": "2026-06-08",
    "role": "student",
    "className": "10-A",
    "attendances": [
      { "userId": "STD-00921", "status": "present" },
      { "userId": "STD-99882", "status": "absent", "reason": "Fever" }
    ]
  }
  ```

---

### 2. Geofenced QR & Biometric Check-in

#### A. Generate Classroom Scan QR Code
- **Endpoint:** `POST /api/school/:schoolId/attendance/qr`
- **Request Body:**
  ```json
  {
    "schoolId": "SCH-00021",
    "classId": "class_10a",
    "expiresInMinutes": 5
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "token": "QR_ATT_TOKEN_88291881",
      "expiresAt": "2026-06-08T08:25:40Z"
    }
  }
  ```

#### B. Check-In via Geofenced QR Scan
- **Endpoint:** `POST /api/school/:schoolId/attendance/user`
- **Request Body:**
  ```json
  {
    "token": "QR_ATT_TOKEN_88291881",
    "userId": "STD-99882",
    "role": "student",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "accuracy": 12.5
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "message": "Checked in successfully within school geofence"
  }
  ```

#### C. Biometric Sync Log Buffer
- **Endpoint:** `POST /api/school/:schoolId/attendance/offline-sync`
- **Request Body:**
  ```json
  {
    "records": [
      {
        "userId": "EMP-00109",
        "role": "employee",
        "date": "2026-06-07",
        "status": "present",
        "inTime": "08:55:00",
        "outTime": "17:05:00"
      }
    ],
    "deviceId": "biometric_terminal_east",
    "syncTimestamp": 1780902881
  }
  ```

---

### 3. Holidays Planner

#### A. Declare New Holiday
- **Endpoint:** `POST /api/school/:schoolId/attendance/holidays`
- **Request Body:**
  ```json
  {
    "holidayName": "Independence Day",
    "startDate": "2026-08-15",
    "endDate": "2026-08-15",
    "isNationalHoliday": true
  }
  ```

#### B. Check if Date is declared holiday
- **Endpoint:** `GET /api/school/:schoolId/attendance/holidays/check?date=2026-08-15`

---

### 4. Leaves Workflow

#### A. Apply for Leave
- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/`
- **Request Body:**
  ```json
  {
    "startDate": "2026-06-12",
    "endDate": "2026-06-15",
    "leaveType": "sick",
    "reason": "Severe medical procedure recovery"
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "leaveId": "LV_8821",
      "status": "pending"
    }
  }
  ```

#### B. Approve / Reject Leave
- **Endpoints:**
  - `POST /api/school/:schoolId/attendance/leave/:leaveId/approve`
  - `POST /api/school/:schoolId/attendance/leave/:leaveId/reject`

#### C. Extend / Reduce Leave
- **Endpoints:**
  - `POST /api/school/:schoolId/attendance/leave/:leaveId/extend` (Body: `{"days": 2}`)
  - `POST /api/school/:schoolId/attendance/leave/:leaveId/reduce` (Body: `{"days": 1}`)

#### D. Get Priority Pending Leave Queue
- **Endpoint:** `GET /api/school/:schoolId/attendance/leave/queue`

#### E. Set Conditional Approval Terms
- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/:leaveId/conditional/approve`
- **Request Body:**
  ```json
  {
    "approvalConditions": "Subject to submission of medical certificate within 48 hours."
  }
  ```

---

### 5. Proxy Coverage Assignments

#### A. List Eligible Substitution Candidates
- **Endpoint:** `GET /api/school/:schoolId/attendance/leave/:leaveId/coverage/available`
- **Success Response:**
  ```json
  {
    "success": true,
    "data": [
      { "employeeId": "EMP-00302", "name": "David Miller", "availablePeriods": [2, 5] }
    ]
  }
  ```

#### B. Assign Substitute Class Proxy Staff
- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/:leaveId/coverage/assign`
- **Request Body:**
  ```json
  {
    "coverageId": "EMP-00302",
    "classPeriods": [
      { "day": 1, "period": 2, "className": "10-A" }
    ]
  }
  ```

#### C. Run AI syllabus impact delay audit
- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/:leaveId/workload/assess`
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "syllabusProgressImpactPercent": -2.5,
      "delayedChapters": ["Limits - Exercise 3.2"],
      "recommendedMakeupClasses": 1
    }
  }
  ```

---

## 🕒 Update History aur Status (Badlavo ki History)

*Is section mein hum saare bade badlavo, design decisions, aur future plans ko track karte hain.*

- **Syllabus impact assessment:** Leave pipeline is integrated with syllabus planners. Executing `/leave/:leaveId/workload/assess` calculates potential chapter delays based on planned timelines and proposes makeup schedules automatically.
- **Biometric hardware sync:** Biometric records sync `/attendance/offline-sync` accepts batch logs and handles duplicate UUID checks securely without breaking Postgres transactions.
