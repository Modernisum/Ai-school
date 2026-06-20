# Phase 4: Advanced Features & Feature Completion

> **Goal**: Complete all partially-implemented features, fix broken feature integrations, and introduce advanced capabilities that bring the platform to premium SaaS standards. All features must work end-to-end across web and mobile.

---

## 4.1 Academic Module — Complete Implementation

### 4.1.1 Gradebook System
- **Current state**: Migration `202604120001_create_gradebook_table.sql` exists; frontend missing
- **Sub-tasks**:
  1. Verify gradebook database schema is complete and correct
  2. Create backend CRUD routes for gradebook entries
  3. Create backend service for grade calculations (weighted averages, GPA)
  4. Create Vidhyam gradebook page with:
     - Class/subject selector
     - Student list with grade entry
     - Bulk grade import from Excel
     - Grade export to PDF
  5. Create chatra grade view for students/parents
  6. Create employee grade entry for teachers
  7. Add gradebook API endpoints to shared API client

### 4.1.2 Exam Management
- **Current state**: Basic `exam.rs` route exists; limited frontend
- **Sub-tasks**:
  1. Complete exam creation workflow (schedule, rooms, invigilators)
  2. Add exam timetable generation
  3. Add seating arrangement with room capacity validation
  4. Add exam result entry and publishing
  5. Add exam analytics (class average, pass rate, distribution)
  6. Create exam hall ticket PDF generation
  7. Build Vidhyam exam management pages
  8. Build chatra exam schedule view for students

### 4.1.3 Timetable System
- **Current state**: `timetable_engine.rs` and `generator.rs` exist; needs integration
- **Sub-tasks**:
  1. Verify timetable generation algorithm works correctly
  2. Add constraint configuration (teacher availability, room capacity, subject priorities)
  3. Add manual timetable editing after auto-generation
  4. Add timetable conflict detection and resolution
  5. Build Vidhyam timetable management page with drag-and-drop
  6. Build chatra timetable view for students
  7. Build employee timetable view for teachers
  8. Add timetable PDF export

---

## 4.2 Attendance System — Complete Implementation

### 4.2.1 QR-based attendance
- **Current state**: `qr_scanner_screen.dart` exists in chatra; `smart_scanner_screen.dart` in employee
- **Sub-tasks**:
  1. Verify QR code generation on backend works
  2. Verify QR scanning on both mobile apps works
  3. Add dynamic QR that changes periodically (security)
  4. Add GPS verification for on-premise attendance
  5. Add offline attendance sync (already started in `offline_sync_service.dart`)
  6. Complete offline queue with conflict resolution
  7. Add attendance notification to parents when student marked present/absent

### 4.2.2 Attendance analytics
- **Current state**: `attendance_analytics_service.rs` and `attendance_health_monitor.rs` exist
- **Sub-tasks**:
  1. Build attendance analytics dashboard in Vidhyam:
     - Overall attendance rate
     - Class-wise comparison
     - Student-wise trend
     - Chronic absenteeism detection
  2. Add attendance prediction (ML-based, using existing `prediction.rs`)
  3. Add automated parent notification for low attendance
  4. Add attendance report generation (PDF, Excel)

### 4.2.3 Holiday management
- **Current state**: Routes exist for CRUD holidays
- **Sub-tasks**:
  1. Build holiday calendar view in Vidhyam
  2. Add holiday import from academic calendar templates
  3. Add holiday impact on attendance calculations
  4. Show holidays in chatra and employee apps

---

## 4.3 Finance Module — Complete Implementation

### 4.3.1 Fee collection workflow
- **Current state**: Basic fee CRUD exists; payment gateway integration started
- **Sub-tasks**:
  1. Complete Razorpay integration in chatra app
  2. Add UPI payment support
  3. Add payment reconciliation (match online payments with bank statements)
  4. Add partial payment support
  5. Add fee waiver and scholarship management
  6. Add custom fee assignment to individual students
  7. Build fee receipt PDF with school branding
  8. Add fee reminder notifications (automated)
  9. Build fee analytics dashboard:
     - Collection rate
     - Pending amount by class
     - Payment method distribution
     - Monthly collection trend

### 4.3.2 Payroll system
- **Current state**: `payroll_service.rs` with calculation, processing, reporting exists
- **Sub-tasks**:
  1. Complete payroll calculation engine (basic + DA + HRA + deductions)
  2. Add salary slip PDF generation
  3. Add payroll approval workflow
  4. Add leave deduction auto-calculation
  5. Add tax calculation (TDS)
  6. Build payroll management page in Vidhyam
  7. Build salary slip view in employee app
  8. Add payroll analytics dashboard

### 4.3.3 Expense tracking
- **Current state**: `expense/overview.jsx` exists but minimal
- **Sub-tasks**:
  1. Add expense category management
  2. Add expense entry with receipt upload
  3. Add expense approval workflow
  4. Add budget vs actual comparison
  5. Build expense analytics dashboard
  6. Add expense export to Excel

---

## 4.4 Communication Module — Complete Implementation

### 4.4.1 Announcement system
- **Current state**: `announcement.rs` minimal; `announcement_screen.dart` in chatra
- **Sub-tasks**:
  1. Add announcement creation with rich text
  2. Add announcement targeting (all, class, section, individual)
  3. Add announcement scheduling
  4. Add read receipt tracking
  5. Add push notification for new announcements
  6. Build announcement management in Vidhyam
  7. Build announcement view in chatra and employee apps

### 4.4.2 Chat system
- **Current state**: `chat.rs` and `ws.rs` exist; basic WebSocket
- **Sub-tasks**:
  1. Complete WebSocket chat implementation
  2. Add chat rooms (class, department, individual)
  3. Add message types (text, image, file, voice)
  4. Add message search
  5. Add message read receipts
  6. Add chat notification management
  7. Build chat UI in Vidhyam
  8. Build chat UI in chatra and employee apps

### 4.4.3 Notification system
- **Current state**: `notification_service.dart` and `global_notifications` migration exist
- **Sub-tasks**:
  1. Complete FCM integration for both mobile apps
  2. Add notification preferences per user
  3. Add notification categories (attendance, fees, announcements, chat)
  4. Add notification history and mark-as-read
  5. Add email notification channel (using existing `email_service.rs`)
  6. Add SMS notification channel (using existing `sms_service.rs`)
  7. Build notification center in Vidhyam
  8. Build notification center in chatra and employee apps

---

## 4.5 Infrastructure Module — Complete Implementation

### 4.5.1 Responsibility system
- **Current state**: Extensive backend + partial frontend; most complete feature
- **Sub-tasks**:
  1. Verify all responsibility CRUD operations work end-to-end
  2. Verify bulk assignment works
  3. Verify responsibility history tracking
  4. Verify responsibility analytics dashboard
  5. Verify WebSocket real-time updates
  6. Complete fee breakdown view in chatra
  7. Complete my teachers view in chatra
  8. Complete responsibility list/detail in employee app
  9. Add responsibility transfer workflow
  10. Add responsibility performance metrics

### 4.5.2 Space management
- **Current state**: `spaces.rs` and `SpacePage.jsx` exist
- **Sub-tasks**:
  1. Add space floor plan upload (image)
  2. Add space utilization analytics
  3. Add space booking/scheduling
  4. Add space maintenance requests
  5. Build space management page in Vidhyam
  6. Build space directory in employee app

### 4.5.3 Transport tracking
- **Current state**: `bus_tracking_screen.dart` and `transport_bloc.dart` exist
- **Sub-tasks**:
  1. Complete real-time bus tracking with WebSocket
  2. Add route management in Vidhyam
  3. Add student bus assignment
  4. Add driver app functionality (employee app)
  5. Add parent notification on bus arrival/departure
  6. Add geofencing for school premises
  7. Build transport management in Vidhyam
  8. Build bus tracking in chatra

---

## 4.6 AI Integration — Refinement

### 4.6.1 AI chat assistant
- **Current state**: `ai.rs`, `chat_handler.rs`, multiple AI providers exist
- **Sub-tasks**:
  1. Verify AI provider routing works (OpenAI, Anthropic, Gemini, local)
  2. Add usage tracking and cost monitoring
  3. Add rate limiting per school
  4. Add AI response caching for common queries
  5. Add context-aware responses (school data integration)
  6. Build AI chat UI in Vidhyam (AiStudio page)
  7. Build AI assistant in employee app (teacher_ai_assistant.dart)
  8. Ensure minimal runtime AI reliance — pre-compute what possible

### 4.6.2 Content generation
- **Current state**: `content_generation.rs` and `content_generation_service.rs` exist
- **Sub-tasks**:
  1. Verify content generation for: lesson plans, worksheets, question papers
  2. Add template system for content generation
  3. Add content review and approval workflow
  4. Add content versioning
  5. Build content generation UI in Vidhyam
  6. Build content view in employee app

### 4.6.3 Predictive analytics
- **Current state**: `prediction.rs` and `predictive_analytics.sql` exist
- **Sub-tasks**:
  1. Implement student dropout prediction
  2. Implement attendance trend prediction
  3. Implement fee default prediction
  4. Build prediction dashboard in Vidhyam
  5. Add automated alerts based on predictions
  6. Ensure all predictions use pre-trained models, not runtime AI calls

---

## 4.7 Leave Management — Complete Implementation

### 4.7.1 Employee leave system
- **Current state**: `leave_service.rs` and `EnhancedLeaveManagement.jsx` exist
- **Sub-tasks**:
  1. Verify leave application workflow
  2. Verify leave approval/rejection workflow
  3. Add leave balance calculation
  4. Add leave carry-forward rules
  5. Add leave calendar view
  6. Add substitute teacher assignment during leave
  7. Build leave management in Vidhyam
  8. Build leave application in employee app
  9. Build leave approval in management dashboard

### 4.7.2 Student leave system
- **Current state**: `add_student_leave_support.sql` migration exists
- **Sub-tasks**:
  1. Add student leave application (from chatra)
  2. Add parent approval for student leave
  3. Add student leave impact on attendance
  4. Build student leave view in chatra
  5. Build student leave approval in Vidhyam

---

## 4.8 Developer Access & API Keys

### 4.8.1 Developer portal
- **Current state**: `developer_access.rs` and `developer_access_service.rs` exist
- **Sub-tasks**:
  1. Complete API key management (create, revoke, rotate)
  2. Add API usage analytics per key
  3. Add webhook management (create, test, delivery logs)
  4. Build developer portal page in Vidhyam
  5. Add API documentation with interactive examples
  6. Add rate limiting per API key

---

## Exit Criteria

- [ ] Gradebook works end-to-end (entry → calculation → view → export)
- [ ] Exam management works (schedule → hall ticket → result → analytics)
- [ ] Timetable generation works with conflict detection
- [ ] QR attendance works with offline sync
- [ ] Fee collection with Razorpay/UPI works
- [ ] Payroll calculation and salary slip generation works
- [ ] Announcements with push notifications work
- [ ] Chat with WebSocket works
- [ ] Responsibility system fully functional across all apps
- [ ] Bus tracking with real-time updates works
- [ ] AI chat assistant works with cost monitoring
- [ ] Leave management works for both employees and students
- [ ] Developer portal with API keys and webhooks works
