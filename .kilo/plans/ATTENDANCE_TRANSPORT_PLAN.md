# Attendance Management & Transport Integration — Implementation Plan

## Overview

Upgrade the attendance system to support **3-tier authority** (Admin → Class Teacher → Driver), 
**transport-based pickup attendance** with GPS tracking, **auto-routing** for unattended attendance,
and **leave escalation** with duration-based approval chains.

---

## GAP ANALYSIS vs Existing System

### What Already Works ✅
| Feature | State |
|---|---|
| Individual student/employee attendance marking | Working |
| School holiday CRUD | Working |
| QR code generation (image + token) | Working |
| Mobile GPS-attested QR attendance | Working |
| Offline attendance sync | Working |
| Leave application CRUD | Working |
| Leave approval/reject/conditional | Working |
| Leave proxy/substitute suggestions (AI) | Working |
| Leave coverage assignment + responsibility delegation | Working |
| Transport GPS real-time Redis pub/sub | Working |
| Employee driver dashboard (start/stop trip) | Working |
| Responsibility system (assignment, fees, coverage) | Working |
| Student fee sync from responsibilities | Working |
| Class attendance analytics frontend | Working |

### Critical Gaps 🔴
| Gap | Severity | Current State |
|---|---|---|
| `bulk_mark_attendance` is a stub | 🔴 HIGH | Returns `{}` — no students get marked |
| `get_class_attendance` is a stub | 🔴 HIGH | Returns `[]` — analytics broken |
| `attendance_qr_tokens` table missing | 🔴 HIGH | Tokens accepted as any valid UUID |
| School GPS hardcoded (0,0) | 🔴 HIGH | Geofencing disabled |
| No transport/pickup attendance | 🔴 HIGH | Driver can't mark students as picked |
| No auto-assign teacher for empty period | 🔴 HIGH | Unattended class if teacher/driver absent |
| No student leave duration escalation | 🟡 MED | All leaves go only to class teacher |
| No bus location for parent/student app | 🟡 MED | GPS data not exposed |
| `auto_mark_absent_after_cutoff` is stub | 🟡 MED | No automatic absent marking |

---

## PHASE 1: FIX CRITICAL STUBS (Backend)

### 1.1 Implement `bulk_mark_attendance`
**File:** `src/services/attendance_service.rs`
**Logic:**
```
1. Accept { school_id, class_name, date, students: [{ id, status, note }] }
2. Validate class_name exists (get_class_by_name)
3. For each student:
   a. Look up student_id in students table (or global_users for cross-reference)
   b. Check if already marked for this date → update
   c. If not: insert new attendance row with status, inTime=now, role='student'
   d. Log in attendance_history
4. Return marked_count, failed_count
```

### 1.2 Implement `get_class_attendance`
**File:** `src/services/attendance_service.rs`
**Logic:**
```
1. Accept { school_id, class_name, date }
2. Query: SELECT a.* FROM attendance a 
   JOIN students s ON s.student_id = a.user_id 
   WHERE s.class_name = $class_name AND a.school_id = $school_id AND a.date = $date
3. Return list of { student_id, status, inTime, note }
```

### 1.3 Create `attendance_qr_tokens` table
**File:** `src/db/schema_setup.rs`
```sql
CREATE TABLE IF NOT EXISTS attendance_qr_tokens (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    class_id VARCHAR(255),
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_used BOOLEAN DEFAULT FALSE,
    used_by TEXT,
    used_at TIMESTAMP WITH TIME ZONE
);
```
**Update QR generation:** POST `/qr` now persists the token. Token validation in `mobile_mark_attendance` checks `is_used = FALSE AND expires_at > NOW()`.

### 1.4 Fix School GPS Coordinates
**File:** `src/routes/attendance.rs`
**Logic:** Read school GPS from `system_config` table (key: `school_location`) instead of hardcoded (0,0). Fallback to school `data` JSONB field if not in config.

---

## PHASE 2: TRANSPORT ATTENDANCE (New Feature)

### 2.1 Driver Student List Endpoint
**Route:** `GET /api/school/:schoolId/transport/driver-students`
**Handler:** New file `src/routes/transport.rs` (extend existing)
**Logic:**
```
1. Get driver's employee_id from auth claims
2. Find driver's responsibilities WHERE employee_type = 'driver' AND space_category = 'parking'
3. For each responsibility, get space_ids → find students in those spaces
4. Also check: which students have this responsibility_id in their assigned responsibilities
5. Return: [{ student_id, name, class_name, pickup_point, parent_contact }]
```

### 2.2 Pickup/Drop Attendance Endpoint
**Route:** `POST /api/school/:schoolId/transport/mark-pickup`
**Handler:** New in `src/routes/transport.rs`
**Logic:**
```
1. Accept { student_ids: [], status: 'picked_up' | 'dropped_off', 
            latitude, longitude, vehicle_id, date, time }
2. For each student: call mark_attendance with:
   - role = 'student'
   - status = status
   - location = { lat, lng }
   - vehicle_id = vehicle_id
   - inTime/outTime = current time
3. Store GPS location in attendance data JSONB
4. Return marked_count
```

### 2.3 Auto-Assign First Period Teacher
**Route:** No new route — this is a background/triggered function
**File:** New `src/services/attendance_automation.rs` (or extend existing)
**Logic:**
```
1. Runs after cutoff time (e.g., 15 min after school start)
2. Find classes where no student attendance has been marked for today
3. For each class:
   a. Query timetable_slots WHERE class_id = X AND period_number = 1 AND day_of_week = today
   b. Get teacher_id from that slot
   c. Send push notification to teacher: "Please mark attendance for Class X"
   d. Grant temporary attendance-marking authority for this class
4. If teacher doesn't respond within 10 min → escalate to admin notification
```

### 2.4 Bus GPS Tracking for Parents
**Route:** `GET /api/school/:schoolId/transport/bus-location/:vehicleId`
**Handler:** New in `src/routes/transport.rs`
**Logic:**
```
1. Read latest GPS data from Redis for vehicleId
2. Return { lat, lng, speed, last_updated, driver_name, route }
```
**Route:** `WS /ws/school/:schoolId/transport/:vehicleId`
**Handler:** Extend existing WebSocket handler or use polling
**Logic:** Subscribe to Redis channel, push updates to connected clients (Chatra parent app)

### 2.5 Transport Fees Integration
**File:** Extend `src/services/fee_service.rs`
**Logic:**
```
When a student is assigned a "transport" responsibility:
1. responsibility.student_fee → added to student.total_fees
2. Recalculate using existing fee sync logic
3. Show in fee_breakdown as "Transport Fee"
```

---

## PHASE 3: LEAVE ESCALATION

### 3.1 Student Leave Duration-Based Escalation
**File:** `src/routes/leave.rs` — extend `create_leave` + `approve_leave`
**Logic:**
```
Create leave:
1. If start_date → end_date > 3 days:
   a. Set status = 'pending_admin' instead of 'pending'
   b. Auto-approve by class teacher (set teacher_approved = true)
   c. Route to admin approval queue

Approve leave:
1. If leave is 'pending_admin' and approver role is not admin → reject
2. Only admin can approve 'pending_admin' status leaves
```

### 3.2 Auto-Substitute Suggestion on Leave Creation
**File:** `src/routes/leave.rs` — extend `create_leave`
**Logic:**
```
On leave create for employee:
1. Auto-call find_matching_employees_for_responsibility (already exists in leave_service)
2. Return { leaveId, suggestedSubstitutes: [...] } in response
3. Admin sees suggestions inline
```

---

## PHASE 4: EMPLOYEE APP (Flutter) Screens

### 4.1 Driver Pickup Attendance Screen
**File:** New `lib/screens/driver/pickup_attendance_screen.dart`
**Layout:**
- Top: Vehicle selector + current trip status (ON/OFF)
- GPS indicator (green=active, red=inactive)
- Student list grouped by pickup point (A / B / C)
- Each student card: name, class, parent contact, pickup/drop toggle
- **Bulk mark** button: "Mark All Picked Up" / "Mark All Dropped Off"
- Submits to `POST /transport/mark-pickup`

### 4.2 Teacher First-Period Attendance Prompt
**File:** Modify `lib/screens/dashboards/teacher_dashboard.dart`
**Logic:**
- On dashboard load: call `GET /attendance/class?class_name=X&date=today` 
- If empty → show red banner: "Attendance not marked for Class X. Mark now?"
- Button navigates to attendance marking screen

### 4.3 Real-Time Bus Tracking Widget (Driver Dashboard)
**File:** Modify `lib/screens/dashboards/driver_dashboard.dart`
**Add:** GPS streaming status with speed, route map view using `flutter_map` or simple `Container`,
trip history list.

---

## PHASE 5: STUDENT APP (Chatra) Screens

### 5.1 Bus Tracking Widget
**File:** New `lib/features/transport/widgets/bus_tracker.dart`
**Layout:**
- Full-width card showing bus location on Google Maps / OpenStreetMap
- ETA: "Bus arriving in ~12 min"
- Driver name + contact
- Powered by polling `GET /transport/bus-location/:vehicleId` every 10 seconds

### 5.2 Student Attendance Calendar
**File:** Modify existing `lib/features/attendance/` (if exists, otherwise create)
**Layout:**
- Monthly calendar view with color-coded dots:
  - Green = present, Red = absent, Blue = holiday, Yellow = late
- Tap date → shows mark time + status + reason

---

## IMPLEMENTATION ORDER

```
Phase 1: Fix Critical Stubs
  1.1 bulk_mark_attendance     ~80 lines
  1.2 get_class_attendance     ~50 lines
  1.3 attendance_qr_tokens     ~30 lines schema + ~20 lines validation
  1.4 school GPS config        ~15 lines

Phase 2: Transport Attendance
  2.1 driver student list      ~60 lines 
  2.2 pickup/drop marking      ~50 lines
  2.3 auto-assign teacher      ~80 lines
  2.4 bus GPS for parents      ~40 lines + ~60 lines WS
  2.5 transport fees           ~30 lines

Phase 3: Leave Escalation
  3.1 student >3 days          ~30 lines
  3.2 auto-substitute suggest  ~20 lines

Phase 4: Employee App
  4.1 driver pickup screen     ~200 lines
  4.2 teacher prompt           ~30 lines
  4.3 bus tracking dashboard   ~80 lines

Phase 5: Chatra App
  5.1 bus tracking widget      ~120 lines
  5.2 attendance calendar      ~80 lines

Total estimated: ~40 files, ~1,075 lines
```

## File Checklist

### Backend — New Files (4)
- [ ] `src/services/attendance_automation.rs` — auto-assign teacher + cutoff logic
- [ ] (routes extend existing `attendance.rs`, `transport.rs`, `leave.rs`)

### Backend — Modified Files (8)
- [ ] `src/services/attendance_service.rs` — bulk_mark, get_class_attendance implementation
- [ ] `src/routes/attendance.rs` — QR token persistence, GPS config fix
- [ ] `src/routes/transport.rs` — driver students, pickup marking, bus location
- [ ] `src/routes/leave.rs` — duration escalation, auto-substitute
- [ ] `src/db/schema_setup.rs` — qr_tokens table, transport_attendance cols
- [ ] `src/domain/attendance.rs` — new route wiring
- [ ] `src/services/fee_service.rs` — transport fee sync
- [ ] `src/logic/timetable_engine.rs` — auto-assign first period teacher

### Employee App — New Files (1)
- [ ] `lib/screens/driver/pickup_attendance_screen.dart`

### Employee App — Modified Files (2)
- [ ] `lib/screens/dashboards/teacher_dashboard.dart` — attendance prompt
- [ ] `lib/screens/dashboards/driver_dashboard.dart` — GPS tracking widget

### Chatra App — New Files (1)
- [ ] `lib/features/transport/widgets/bus_tracker.dart`

### Chatra App — Modified Files (1)
- [ ] `lib/core/network/api_service.dart` — bus location endpoint
