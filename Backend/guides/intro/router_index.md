# Universal Route Index

This index lists every API endpoint registered in the system. Use this as your starting reference point before adding new APIs to ensure you do not violate the **Law of Duplicate Endpoints**.

---

## 1. Unified Base Root
- **Source Module:** `src/domain/mod.rs`

| Method | Route | Handler Path | Description |
|--------|-------|--------------|-------------|
| GET | `/` | `src/domain/mod.rs` | Base server identification greeting. |

---

## 2. Authentication Domain (`/api/auth/*`)
- **Source Module:** `src/domain/auth/mod.rs`

| Method | Route | Handler Path | Description |
|--------|-------|--------------|-------------|
| POST | `/api/auth/:userType/login` | `auth.rs` | Core login gateway (returns JWT). |
| POST | `/api/auth/:schoolId/user/select-profile` | `auth.rs` | Multi-role user profile selector. |
| POST | `/api/auth/school/support` | `admin::support` | Support ticket generation request. |
| POST | `/api/auth/school/verify-token` | `auth.rs` | JWT authenticity ko verify karta hai. |
| POST | `/api/auth/school/logout` | `auth.rs` | Terminates session and logs out. |
| POST | `/api/auth/school/set-security` | `auth.rs` | Configure 2FA/security parameters. |
| POST | `/api/auth/school/verify-otp` | `auth.rs` | Validate Multi-Factor OTP. |
| POST | `/api/auth/school/forgot-password` | `auth.rs` | Initiates forgot password flow. |
| POST | `/api/auth/school/change-password` | `auth.rs` | Changes school portal password. |
| POST | `/api/auth/register-device` | `auth.rs` | Registers active device token. |
| POST | `/api/auth/setup/school` | `setup.rs` | Initialize school onboarding setup. |
| GET | `/api/school/:schoolId` | `school.rs` | Retrieve school details. |
| PUT | `/api/school/:schoolId` | `school.rs` | Update school details. |
| PATCH| `/api/school/:schoolId` | `school.rs` | Change school login password. |

---

## 3. People Domain (`/api/school/:schoolId/people/*`)
- **Source Module:** `src/domain/people/mod.rs`

| Method | Route | Handler Path | Description |
|--------|-------|--------------|-------------|
| GET | `/api/school/:schoolId/people/user/students` | `user_api.rs` | List students (requires API key). |
| GET | `/api/school/:schoolId/people/user/students/search` | `user_api.rs` | Search students (requires API key). |
| GET | `/api/school/:schoolId/people/user/students/:studentId` | `user_api.rs` | Get student profile (requires API key). |
| GET | `/api/school/:schoolId/people/user/employees` | `user_api.rs` | List employees (requires API key). |
| GET | `/api/school/:schoolId/people/user/employees/search` | `user_api.rs` | Search employees (requires API key). |
| GET | `/api/school/:schoolId/people/user/employees/:employeeId` | `user_api.rs` | Get employee profile (requires API key). |
| POST | `/api/school/:schoolId/people/students` | `students.rs` | Register a new student. |
| GET | `/api/school/:schoolId/people/students` | `students.rs` | Retrieve list of all students. |
| POST | `/api/school/:schoolId/people/students/validate` | `students.rs` | Validate student inputs fields. |
| POST | `/api/school/:schoolId/people/students/bulk` | `students.rs` | Bulk CSV parse student uploads. |
| GET | `/api/school/:schoolId/people/students/paginated` | `students.rs` | Fetch paginated students feed. |
| GET | `/api/school/:schoolId/people/students/space/:space_id` | `students.rs` | List students linked to physical room. |
| GET | `/api/school/:schoolId/people/students/studentIds` | `students.rs` | List all valid student ID strings. |
| GET | `/api/school/:schoolId/people/students/:studentId` | `students.rs` | Retrieve student profile records. |
| PUT | `/api/school/:schoolId/people/students/:studentId` | `students.rs` | Update student profile data. |
| DELETE| `/api/school/:schoolId/people/students/:studentId` | `students.rs` | De-register/delete student. |
| GET | `/api/school/:schoolId/people/students/form-status` | `student_forms.rs` | Get registration form status state. |
| GET | `/api/school/:schoolId/people/students/:studentId/auto-fill` | `student_forms.rs` | Autocomplete form details via AI. |
| POST | `/api/school/:schoolId/people/students/:studentId/form-complete`| `student_forms.rs`| Mark student form process complete. |
| POST | `/api/school/:schoolId/people/employees` | `employees.rs` | Register a new employee. |
| GET | `/api/school/:schoolId/people/employees` | `employees.rs` | List all school employees. |
| POST | `/api/school/:schoolId/people/employees/validate` | `employees.rs` | Validate employee input parameters. |
| POST | `/api/school/:schoolId/people/employees/bulk` | `employees.rs` | Bulk import employee directories. |
| GET | `/api/school/:schoolId/people/employees/:employeeId` | `employees.rs` | Retrieve employee profile records. |
| PUT | `/api/school/:schoolId/people/employees/:employeeId` | `employees.rs` | Update employee profile records. |
| DELETE| `/api/school/:schoolId/people/employees/:employeeId` | `employees.rs` | Delete employee from active directory. |
| GET | `/api/school/:schoolId/people/employees/:employeeId/salary-breakdown`| `emppay.rs` | Get employee monthly paycheck details. |
| POST | `/api/school/:schoolId/people/employees/:employeeId/bonus` | `emppay.rs` | Award bonus payment allocations. |
| POST | `/api/school/:schoolId/people/employees/:employeeId/aid` | `emppay.rs` | Grant employee financial allowance. |
| POST | `/api/school/:schoolId/people/employees/:employeeId/close-month` | `emppay.rs` | Close monthly payroll ledger. |
| POST | `/api/school/:schoolId/people/employees/:employeeId/pay` | `emppay.rs` | Record salary payout transactions. |
| POST | `/api/school/:schoolId/people/employees/:employeeId/salary` | `emppay.rs` | Set contract base salary params. |

---

## 4. Academic Domain (`/api/school/:schoolId/academic/*`)
- **Source Module:** `src/domain/academic/mod.rs`

| Method | Route | Handler Path | Description |
|--------|-------|--------------|-------------|
| POST | `/api/school/:schoolId/academic/exams` | `exam.rs` | Schedule a new exam. |
| GET | `/api/school/:schoolId/academic/exams` | `exam.rs` | List scheduled exams. |
| POST | `/api/school/:schoolId/academic/exams/:examId/sections` | `exam.rs` | Define exam test section. |
| GET | `/api/school/:schoolId/academic/exams/:examId/sections` | `exam.rs` | Get list of exam test sections. |
| PATCH| `/api/school/:schoolId/academic/exams/:examId/sections/:sectionId` | `exam.rs` | Modify exam test section parameters. |
| POST | `/api/school/:schoolId/academic/exams/ai/generate` | `exam.rs` | Autogenerate exam papers using AI. |
| POST | `/api/school/:schoolId/academic/exams/ai/regenerate-question` | `exam.rs` | Regenerate targeted test question. |
| POST | `/api/school/:schoolId/academic/exams/submit-test` | `exam.rs` | Submit student exam test score sheet. |
| POST | `/api/school/:schoolId/academic/exams/teacher-test` | `exam.rs` | Schedule teacher mock exam keys. |
| POST | `/api/school/:schoolId/academic/exams/checker/assign/:examId` | `exam_checker.rs` | Assign grader/checker to review. |
| GET | `/api/school/:schoolId/academic/exams/checker/pending` | `exam_checker.rs` | List exams awaiting grading. |
| GET | `/api/school/:schoolId/academic/exams/checker/submissions/:examId` | `exam_checker.rs` | List student submissions to grade. |
| POST | `/api/school/:schoolId/academic/exams/checker/review/:examId/:submissionId`| `exam_checker.rs` | Submit checker graded report. |
| POST | `/api/school/:schoolId/academic/exams/approve/:examId/:submissionId`| `exam_checker.rs` | Approve grading values (teacher). |
| POST | `/api/school/:schoolId/academic/exams/reject/:examId/:submissionId`| `exam_checker.rs` | Reject grading and request re-check. |
| POST | `/api/school/:schoolId/academic/exams/publish/:examId` | `exam_checker.rs` | Publish grading results to students. |
| GET | `/api/school/:schoolId/academic/exams/results/:studentId` | `exam_results.rs` | Fetch student scorecard reports. |
| POST | `/api/school/:schoolId/academic/timetable/generate` | `timetable.rs` | Trigger AI optimized timetable generate. |
| GET | `/api/school/:schoolId/academic/timetable` | `timetable.rs` | List timetable configs. |
| GET | `/api/school/:schoolId/academic/timetable/:configId` | `timetable.rs` | Get timetable configuration details. |
| DELETE| `/api/school/:schoolId/academic/timetable/:configId` | `timetable.rs` | Delete timetable config. |
| POST | `/api/school/:schoolId/academic/timetable/:configId/approve` | `timetable.rs` | Set timetable config as active. |
| POST | `/api/school/:schoolId/academic/topics` | `topic.rs` | Add syllabus topic. |
| GET | `/api/school/:schoolId/academic/syllabus/:responsibilityId` | `syllabus_calendar.rs`| Fetch syllabus outline mapping. |
| POST | `/api/school/:schoolId/academic/syllabus/:responsibilityId/plot`| `syllabus_calendar.rs`| Plot annual milestone targets. |
| POST | `/api/school/:schoolId/academic/syllabus/:responsibilityId/micro-plan`| `syllabus_calendar.rs`| Slice syllabus into daily period steps. |
| PATCH| `/api/school/:schoolId/academic/syllabus/chapter/:chapterId`| `syllabus_calendar.rs`| Update progress on chapter targets. |
| GET | `/api/school/:schoolId/academic/syllabus/quarter/:quarter`| `syllabus_calendar.rs`| Get syllabus completion reports. |
| GET | `/api/school/:schoolId/academic/period-plans/today` | `period_plan.rs` | Get daily teacher period plans list. |
| GET | `/api/school/:schoolId/academic/period-plans/:date` | `period_plan.rs` | Get period plans list on date. |
| POST | `/api/school/:schoolId/academic/period-plans/:id/status` | `period_plan.rs` | Update period plan status metrics. |
| POST | `/api/school/:schoolId/academic/period-plans/restructure` | `period_plan.rs` | Shift/postpone pending period plans. |
| POST | `/api/school/:schoolId/academic/changes/request` | `schedule_change.rs` | Submit class schedule swap request. |
| GET | `/api/school/:schoolId/academic/changes/pending` | `schedule_change.rs` | List pending class schedule swaps. |
| POST | `/api/school/:schoolId/academic/changes/:id/approve` | `schedule_change.rs` | Approve schedule swap. |
| POST | `/api/school/:schoolId/academic/changes/:id/reject` | `schedule_change.rs` | Reject schedule swap. |
| POST | `/api/school/:schoolId/academic/reports/daily` | `daily_report.rs` | Submit daily activity report. |
| GET | `/api/school/:schoolId/academic/reports/daily/:date` | `daily_report.rs` | Retrieve daily activity report. |
| GET | `/api/school/:schoolId/academic/reports/missed` | `daily_report.rs` | Get missed daily reports lists. |
| GET | `/api/school/:schoolId/academic/timetable-issue-box/:configId` | `timetable_enhanced.rs`| Get scheduler conflict audits. |
| GET | `/api/school/:schoolId/academic/timetable-view/:configId` | `timetable_enhanced.rs`| Get parsed timetable scheduler grid.|
| GET | `/api/school/:schoolId/academic/timetable-substitute/:spaceId/:responsibilityId/:day/:period`| `timetable_enhanced.rs`| Suggest proxy teachers for class. |

---

## 5. Finance Domain (`/api/school/:schoolId/finance/*`)
- **Source Module:** `src/domain/finance/mod.rs`

| Method | Route | Handler Path | Description |
|--------|-------|--------------|-------------|
| GET | `/api/school/:schoolId/finance/fees` | `fees.rs` | Get school fee structures. |
| POST | `/api/school/:schoolId/finance/fees` | `fees.rs` | Create new school fee template. |
| GET | `/api/school/:schoolId/finance/fees/pending` | `fees.rs` | List students with outstanding fees. |
| GET | `/api/school/:schoolId/finance/fees/student/:studentId` | `fees.rs` | Get student billing ledger status. |
| GET | `/api/school/:schoolId/finance/user/fees/:studentId` | `fees.rs` | Fetch billing ledger (user access). |
| GET | `/api/school/:schoolId/finance/fees/student/:studentId/ai-reminder`| `fees.rs` | Generate AI-personalized reminder. |
| POST | `/api/school/:schoolId/finance/fees/student/:studentId/add`| `fees.rs` | Charge ad-hoc fee on student ledger.|
| POST | `/api/school/:schoolId/finance/fees/student/:studentId/pay`| `fees.rs` | Log manual student payment. |
| POST | `/api/school/:schoolId/finance/fees/student/:studentId/discount`| `fees.rs` | Grant discount on outstanding bill. |
| GET | `/api/school/:schoolId/finance/fees/custom` | `fees.rs` | List special custom fee invoices. |
| POST | `/api/school/:schoolId/finance/fees/custom` | `fees.rs` | Define new special custom fee type. |
| DELETE| `/api/school/:schoolId/finance/fees/custom/:feeId` | `fees.rs` | Revoke special custom fee. |
| POST | `/api/school/:schoolId/finance/fees/custom/:feeId/apply`| `fees.rs` | Charge custom fee to target classes. |
| GET | `/api/school/:schoolId/finance/coupons` | `fees.rs` | List referral coupons. |
| POST | `/api/school/:schoolId/finance/coupons` | `fees.rs` | Create new referral coupon. |
| POST | `/api/school/:schoolId/finance/coupons/validate` | `fees.rs` | Verify promo coupon parameters. |
| DELETE| `/api/school/:schoolId/finance/coupons/:couponId` | `fees.rs` | Revoke referral coupon. |
| PUT | `/api/school/:schoolId/finance/coupons/:couponId/block` | `fees.rs` | Block/unblock coupon. |
| POST | `/api/school/:schoolId/finance/coupons/:couponId/use` | `fees.rs` | Redeem coupon discount. |
| POST | `/api/school/:schoolId/finance/payment/:schoolId/create-order`| `payment.rs` | Generate online payment order ID. |
| POST | `/api/school/:schoolId/finance/payment/webhook` | `payment.rs` | Razorpay payment webhook endpoint. |
| POST | `/api/school/:schoolId/finance/user/order` | `payment.rs` | User dashboard Razorpay order. |

---

## 6. Attendance Domain (`/api/school/:schoolId/attendance/*`)
- **Source Module:** `src/domain/attendance/mod.rs`

| Method | Route                                                                       | Handler Path               | Description                            |
| --------| -----------------------------------------------------------------------------| ----------------------------| ----------------------------------------|
| GET    | `/api/school/:schoolId/attendance/public/attendance/:date`                  | `attendance.rs`            | Public endpoint (requires API key).    |
| POST   | `/api/school/:schoolId/attendance/:role/:userId/present`                    | `attendance.rs`            | Log user check-in present today.       |
| POST   | `/api/school/:schoolId/attendance/:role/:userId/holiday`                    | `attendance.rs`            | Log user holiday roster status.        |
| PUT    | `/api/school/:schoolId/attendance/:role/:userId/:date`                      | `attendance.rs`            | Update check-in timestamps.            |
| DELETE | `/api/school/:schoolId/attendance/:role/:userId/:date`                      | `attendance.rs`            | Delete attendance record.              |
| GET    | `/api/school/:schoolId/attendance/student/date/:date`                       | `attendance.rs`            | List present student IDs on date.      |
| GET    | `/api/school/:schoolId/attendance/:role/:userId`                            | `attendance.rs`            | List attendance logs of user.          |
| GET    | `/api/school/:schoolId/attendance/holidays`                                 | `attendance.rs`            | List academic school holidays.         |
| POST   | `/api/school/:schoolId/attendance/holidays`                                 | `attendance.rs`            | Declare new academic holiday.          |
| GET    | `/api/school/:schoolId/attendance/holidays/check`                           | `attendance.rs`            | Check if date is declared holiday.     |
| GET    | `/api/school/:schoolId/attendance/holidays/:holidayId`                      | `attendance.rs`            | Fetch holiday details.                 |
| DELETE | `/api/school/:schoolId/attendance/holidays/:holidayId`                      | `attendance.rs`            | Revoke holiday declaration.            |
| POST   | `/api/school/:schoolId/attendance/bulk`                                     | `attendance.rs`            | Submit class roll call logs.           |
| GET    | `/api/school/:schoolId/attendance/class`                                    | `attendance.rs`            | Get daily attendance stats of class.   |
| POST   | `/api/school/:schoolId/attendance/qr`                                       | `attendance.rs`            | Generate classroom scan QR code.       |
| POST   | `/api/school/:schoolId/attendance/user`                                     | `attendance.rs`            | Check-in via Geofenced QR scan.        |
| POST   | `/api/school/:schoolId/attendance/offline-sync`                             | `attendance.rs`            | Upload local biometric log buffers.    |
| GET    | `/api/school/:schoolId/attendance/`                                         | `attendance.rs`            | School-wide attendance statistics.     |
| GET    | `/api/school/:schoolId/attendance/reports/student`                          | `attendance.rs`            | Aggregate student attendance sheet.    |
| GET    | `/api/school/:schoolId/attendance/reports/class`                            | `attendance.rs`            | Aggregate class attendance report.     |
| GET    | `/api/school/:schoolId/attendance/reports/employee`                         | `attendance.rs`            | Aggregate employee attendance sheet.   |
| POST   | `/api/school/:schoolId/attendance/reports/custom`                           | `attendance.rs`            | Request customized XLS/PDF sheet.      |
| GET    | `/api/school/:schoolId/attendance/auto-assign-teacher`                      | `attendance_automation.rs` | Run proxy teacher auto-scheduler.      |
| POST   | `/api/school/:schoolId/attendance/leave/`                                   | `leave.rs`                 | Apply for employee leave.              |
| GET    | `/api/school/:schoolId/attendance/leave/`                                   | `leave.rs`                 | List leave applications.               |
| POST   | `/api/school/:schoolId/attendance/leave/:leaveId/approve`                   | `leave.rs`                 | Approve leave application.             |
| POST   | `/api/school/:schoolId/attendance/leave/:leaveId/reject`                    | `leave.rs`                 | Reject leave application.              |
| POST   | `/api/school/:schoolId/attendance/leave/:leaveId/extend`                    | `leave.rs`                 | Extend leave duration days.            |
| POST   | `/api/school/:schoolId/attendance/leave/:leaveId/reduce`                    | `leave.rs`                 | Shorten leave duration days.           |
| GET    | `/api/school/:schoolId/attendance/leave/:leaveId/pdf`                       | `leave.rs`                 | Download leave request PDF.            |
| GET    | `/api/school/:schoolId/attendance/leave/balance/:employeeId`                | `leave.rs`                 | Get employee leave balances.           |
| GET    | `/api/school/:schoolId/attendance/leave/queue`                              | `leave.rs`                 | List prioritized pending leave queue.  |
| GET    | `/api/school/:schoolId/attendance/leave/details/:leaveId`                   | `leave.rs`                 | Get complete details of leave.         |
| POST   | `/api/school/:schoolId/attendance/leave/:leaveId/conditional/approve`       | `leave.rs`                 | Apply approval terms constraints.      |
| POST   | `/api/school/:schoolId/attendance/leave/:leaveId/conditional/respond`       | `leave.rs`                 | Accept/decline approval terms.         |
| GET    | `/api/school/:schoolId/attendance/leave/conditional/templates`              | `leave.rs`                 | List conditional approval templates.   |
| POST   | `/api/school/:schoolId/attendance/leave/conditional/templates`              | `leave.rs`                 | Create conditional template.           |
| POST   | `/api/school/:schoolId/attendance/leave/:leaveId/coverage/assign`           | `leave.rs`                 | Assign substitute class proxy staff.   |
| GET    | `/api/school/:schoolId/attendance/leave/:leaveId/coverage/available`        | `leave.rs`                 | List eligible substitution candidates. |
| POST   | `/api/school/:schoolId/attendance/leave/coverage/:coverageId/accept`        | `leave.rs`                 | Accept substitution request.           |
| POST   | `/api/school/:schoolId/attendance/leave/:leaveId/workload/assess`           | `leave.rs`                 | Run AI syllabus impact delay audit.    |
| GET    | `/api/school/:schoolId/attendance/leave/:leaveId/workload/assessment`       | `leave.rs`                 | Get AI syllabus impact report.         |
| GET    | `/api/school/:schoolId/attendance/leave/notifications`                      | `leave.rs`                 | Get leave workflow alert cards.        |
| POST   | `/api/school/:schoolId/attendance/leave/notifications/:notificationId/read` | `leave.rs`                 | Dismiss leave workflow alerts.         |
| GET    | `/api/school/:schoolId/attendance/leave/feature-flags`                      | `leave.rs`                 | Get leave engine active config flags.  |
| POST   | `/api/school/:schoolId/attendance/leave/feature-flags`                      | `leave.rs`                 | Update leave config flags.             |

---

## 7. Resources Domain (`/api/school/:schoolId/resources/*`)
- **Source Module:** `src/domain/resources/mod.rs`

| Method | Route | Handler Path | Description |
|--------|-------|--------------|-------------|
| GET | `/api/school/:schoolId/resources/public/spaces` | `spaces.rs` | List public rooms (requires API key). |
| GET | `/api/school/:schoolId/resources/spaces/categories` | `spaces.rs` | List room space categories. |
| POST | `/api/school/:schoolId/resources/spaces/categories` | `spaces.rs` | Create room space category. |
| DELETE| `/api/school/:schoolId/resources/spaces/categories/:categoryName`| `spaces.rs`| Revoke category. |
| GET | `/api/school/:schoolId/resources/spaces` | `spaces.rs` | List physical rooms layout. |
| POST | `/api/school/:schoolId/resources/spaces/:category` | `spaces.rs` | Register room under category. |
| GET | `/api/school/:schoolId/resources/spaces/detail/:spaceName`| `spaces.rs` | Fetch room metadata details. |
| PUT | `/api/school/:schoolId/resources/spaces/detail/:spaceName`| `spaces.rs` | Update room metadata parameters. |
| DELETE| `/api/school/:schoolId/resources/spaces/detail/:spaceName`| `spaces.rs` | Delete a physical room. |
| GET | `/api/school/:schoolId/resources/spaces/detail/:spaceName/budget`| `spaces.rs` | Get financial budget assigned to room. |
| PUT | `/api/school/:schoolId/resources/spaces/detail/:spaceName/budget`| `spaces.rs` | Update room space budget. |
| GET | `/api/school/:schoolId/resources/spaces/materials/all` | `spaces.rs` | List materials allocated in rooms. |
| GET | `/api/school/:schoolId/resources/spaces/:spaceName/materials`| `spaces.rs` | List materials in specific room. |
| POST | `/api/school/:schoolId/resources/spaces/:spaceName/materials`| `spaces.rs` | Allocate inventory items to room. |
| DELETE| `/api/school/:schoolId/resources/spaces/:spaceName/materials/:materialName`| `spaces.rs`| Remove inventory item from room. |
| POST | `/api/school/:schoolId/resources/spaces/:spaceName/materials/:materialName/transfer`| `spaces.rs`| Transfer item from Room A to Room B. |
| POST | `/api/school/:schoolId/resources/spaces/:spaceName/clone` | `spaces.rs` | Clone Room layout parameters. |
| GET | `/api/school/:schoolId/resources/materials` | `materials.rs` | List inventory stock items. |
| POST | `/api/school/:schoolId/resources/materials` | `materials.rs` | Register new inventory stock type. |
| POST | `/api/school/:schoolId/resources/materials/bulk` | `materials.rs` | Bulk import material registers. |
| GET | `/api/school/:schoolId/resources/materials/shortage-summary`| `materials.rs` | Get details of low stock items. |
| POST | `/api/school/:schoolId/resources/materials/run-shortage-check`| `materials.rs` | Run stock inventory check. |
| GET | `/api/school/:schoolId/resources/materials/:materialName` | `materials.rs` | Get parameters of stock item. |
| PATCH| `/api/school/:schoolId/resources/materials/:materialName` | `materials.rs` | Update stock item fields. |
| DELETE| `/api/school/:schoolId/resources/materials/:materialName` | `materials.rs` | Delete stock item. |
| POST | `/api/school/:schoolId/resources/materials/:materialName/buy`| `materials.rs` | Buy and increment stock level. |
| POST | `/api/school/:schoolId/resources/materials/:materialName/sell`| `materials.rs` | Sell and decrement stock level. |
| GET | `/api/school/:schoolId/resources/materials/:materialName/history`| `materials.rs` | List stock updates ledger. |
| GET | `/api/school/:schoolId/resources/events` | `events.rs` | List events calendars. |
| POST | `/api/school/:schoolId/resources/events` | `events.rs` | Add event card to calendar. |
| PATCH| `/api/school/:schoolId/resources/events/:eventId` | `events.rs` | Update event card. |
| DELETE| `/api/school/:schoolId/resources/events/:eventId` | `events.rs` | Delete/cancel event card. |
| GET | `/api/school/:schoolId/resources/awards` | `award.rs` | List student awards list. |
| POST | `/api/school/:schoolId/resources/documents/upload` | `document_upload.rs`| Upload administrative files. |
| POST | `/api/school/:schoolId/resources/documents/upload/student/:studentId`| `document_upload.rs`| Upload student document file. |
| GET | `/api/school/:schoolId/resources/documents/box` | `documentbox.rs` | Get document box storage explorer.|
| POST | `/api/school/:schoolId/resources/storage/upload` | `storage.rs` | Upload raw image/PDF asset files. |
| GET | `/api/school/:schoolId/resources/storage/files` | `storage.rs` | List uploaded raw asset files. |
| DELETE| `/api/school/:schoolId/resources/storage/files/:id` | `storage.rs` | Delete asset file by registry ID. |
| DELETE| `/api/school/:schoolId/resources/storage/file-by-url` | `storage.rs` | Delete asset file by URL match. |
| GET | `/api/school/:schoolId/resources/storage/uploads/*` | `ServeDir` | Serve uploaded assets (requires JWT). |

---

## 8. Communication Domain (`/api/school/:schoolId/comm/*`)
- **Source Module:** `src/domain/communication/mod.rs`

| Method | Route | Handler Path | Description |
|--------|-------|--------------|-------------|
| POST | `/api/school/:schoolId/comm/announcements/:type/:userId`| `announcement.rs`| Broadcast system announcement. |
| POST | `/api/school/:schoolId/comm/chat/:schoolId/send` | `chat.rs` | Send real-time chat message. |
| GET | `/api/school/:schoolId/comm/chat/:schoolId/history/:user1/:user2`| `chat.rs` | Get peer chat message feed. |
| GET | `/api/school/:schoolId/comm/chat/:schoolId/ai-history`| `chat.rs` | Get AI chat assistant history log. |
| GET | `/api/school/:schoolId/comm/notifications` | `notification.rs`| List active center notifications. |
| POST | `/api/school/:schoolId/comm/notifications` | `notification.rs`| Generate and dispatch alert. |
| GET | `/api/school/:schoolId/comm/notifications/unread-count`| `notification.rs`| Get unread alerts count. |
| POST | `/api/school/:schoolId/comm/notifications/mark-all-read`| `notification.rs`| Clear all user alerts. |
| POST | `/api/school/:schoolId/comm/notifications/:notification_id/read`| `notification.rs`| Clear single alert. |
| DELETE| `/api/school/:schoolId/comm/notifications/:notification_id`| `notification.rs`| Delete notification alert card. |
| GET | `/api/school/:schoolId/comm/school/notification` | `notification.rs`| Get school admin marquee alert. |
| DELETE| `/api/school/:schoolId/comm/school/notification` | `notification.rs`| Clear school admin marquee alert. |
| GET | `/api/school/:schoolId/comm/school/notify/global` | `notification.rs`| Get system broadcast alert banner. |
| GET | `/api/school/:schoolId/comm/ws` | `ws.rs` | Establish real-time WS connection. |
| POST | `/api/school/:schoolId/comm/webhooks` | `webhook.rs` | Register webhook push listener. |
| GET | `/api/school/:schoolId/comm/webhooks` | `webhook.rs` | List registered webhook pushes. |
| DELETE| `/api/school/:schoolId/comm/webhooks/:webhookId` | `webhook.rs` | Revoke webhook callback URL. |
| GET | `/api/school/:schoolId/comm/webhooks/:webhookId/logs` | `webhook.rs` | Get delivery logs for webhook. |

---

## 9. Operations Domain (`/api/school/:schoolId/operations/*`)
- **Source Module:** `src/domain/operations/mod.rs`

| Method | Route | Handler Path | Description |
|--------|-------|--------------|-------------|
| GET | `/api/school/:schoolId/operations/responsibility` | `responsibility.rs`| List operational duties. |
| POST | `/api/school/:schoolId/operations/responsibility` | `responsibility.rs`| Define new operational duty. |
| GET | `/api/school/:schoolId/operations/responsibility/:responsibilityId/analytics`| `responsibility.rs`| Fetch metrics reports for duty. |
| GET | `/api/school/:schoolId/operations/responsibility/overview/analytics`| `responsibility.rs`| Fetch general operations metrics. |
| GET | `/api/school/:schoolId/operations/responsibility/export/csv`| `responsibility.rs`| Export duty definitions list to CSV.|
| POST | `/api/school/:schoolId/operations/responsibility/import/csv`| `responsibility.rs`| Parse and import duties from CSV. |
| GET | `/api/school/:schoolId/operations/responsibility/students/:studentId/responsibilities`| `responsibility.rs`| List duties student relies upon. |
| GET | `/api/school/:schoolId/operations/responsibility/:responsibilityId`| `responsibility.rs`| Retrieve duty parameters config. |
| PATCH| `/api/school/:schoolId/operations/responsibility/:responsibilityId`| `responsibility.rs`| Modify duty parameters config. |
| DELETE| `/api/school/:schoolId/operations/responsibility/:responsibilityId`| `responsibility.rs`| Delete operational duty config. |
| GET | `/api/school/:schoolId/operations/responsibility/employees/:employeeId/responsibilities`| `responsibility.rs`| Get duties assigned to staff. |
| GET | `/api/school/:schoolId/operations/responsibility/spaces/:spaceId/responsibilities`| `responsibility.rs`| Get duties linked to room space. |
| GET | `/api/school/:schoolId/operations/responsibility/search`| `responsibility.rs`| Search operational duties catalog.|
| POST | `/api/school/:schoolId/operations/responsibility/:responsibilityId/bulk-assign`| `responsibility.rs`| Assign duty to multiple staff. |
| DELETE| `/api/school/:schoolId/operations/responsibility/:responsibilityId/bulk-remove`| `responsibility.rs`| Revoke duty from multiple staff. |
| PUT | `/api/school/:schoolId/operations/responsibility/:responsibilityId/bulk-update`| `responsibility.rs`| Update details across assignments.|
| GET | `/api/school/:schoolId/operations/responsibility/:responsibilityId/history`| `responsibility.rs`| Fetch logs of assignment updates. |
| GET | `/api/school/:schoolId/operations/responsibility/:responsibilityId/versions`| `responsibility.rs`| Get config version histories. |
| POST | `/api/school/:schoolId/operations/responsibility/:responsibilityId/rollback/:version`| `responsibility.rs`| Revert config to historic version.|
| GET | `/api/school/:schoolId/operations/responsibility/metrics/utilization`| `responsibility.rs`| Fetch staff duty allocation stats. |
| GET | `/api/school/:schoolId/operations/responsibility/metrics/workload`| `responsibility.rs`| Get workload capacity analysis. |
| GET | `/api/school/:schoolId/operations/responsibility/metrics/space-distribution`| `responsibility.rs`| Get distribution of room duties. |
| GET | `/api/school/:schoolId/operations/responsibility/metrics/revenue`| `responsibility.rs`| Get operational cost structures. |
| GET | `/api/school/:schoolId/operations/responsibility/reports/utilization/:startDate/:endDate`| `responsibility.rs`| Generate staff utilization reports.|
| GET | `/api/school/:schoolId/operations/responsibility/reports/workload/:startDate/:endDate`| `responsibility.rs`| Generate staff workload reports. |
| GET | `/api/school/:schoolId/operations/responsibility/reports/space-distribution/:startDate/:endDate`| `responsibility.rs`| Generate room activity reports. |
| GET | `/api/school/:schoolId/operations/responsibility/reports/revenue/:startDate/:endDate`| `responsibility.rs`| Generate operational cost sheet. |
| GET | `/api/school/:schoolId/operations/responsibility/reports/utilization/:startDate/:endDate/pdf`| `responsibility.rs`| Download utilization report PDF. |
| GET | `/api/school/:schoolId/operations/responsibility/reports/workload/:startDate/:endDate/pdf`| `responsibility.rs`| Download workload report PDF. |
| GET | `/api/school/:schoolId/operations/responsibility/reports/space-distribution/:startDate/:endDate/pdf`| `responsibility.rs`| Download room activity PDF. |
| GET | `/api/school/:schoolId/operations/responsibility/reports/revenue/:startDate/:endDate/pdf`| `responsibility.rs`| Download cost report PDF. |
| POST | `/api/school/:schoolId/operations/responsibility/sync-student-fees`| `responsibility.rs`| Trigger general student billing sync|
| POST | `/api/school/:schoolId/operations/responsibility/:responsibilityId/sync-student-fees`| `responsibility.rs`| Force sync on specific duty. |
| POST | `/api/school/:schoolId/operations/responsibility/generate-salaries/:month/:year`| `responsibility.rs`| Trigger salary calculation run. |
| GET | `/api/school/:schoolId/operations/responsibility/spaces/:spaceId/financial-overview`| `responsibility.rs`| Get ledger details of room space.|
| GET | `/api/school/:schoolId/operations/responsibility/alerts/missing-responsibilities`| `responsibility.rs`| Get warning alerts for empty rooms.|
| GET | `/api/school/:schoolId/operations/responsibility/ws` | `responsibility_ws.rs`| WS connection for operations updates|
| POST | `/api/school/:schoolId/operations/transport/gps/:vehicleId`| `transport.rs` | Update vehicle GPS coordinates. |
| GET | `/api/school/:schoolId/operations/transport/bus-location/:vehicleId`| `transport.rs` | Get vehicle GPS coordinates. |
| GET | `/api/school/:schoolId/operations/transport/driver-students`| `transport.rs` | List assigned route passengers. |
| POST | `/api/school/:schoolId/operations/transport/mark-pickup` | `transport.rs` | Mark passenger check-in. |
| GET | `/api/school/:schoolId/operations/tasks` | `task.rs` | Get board task lists. |
| PUT | `/api/school/:schoolId/operations/tasks/:taskId/status` | `task.rs` | Modify task progress state. |
| POST | `/api/school/:schoolId/operations/tasks/ai/generate` | `ai.rs` | Autogenerate operational tasks (AI)|
| POST | `/api/school/:schoolId/operations/tasks/ai/reorganize` | `ai.rs` | Reorganize task board layout (AI).|
| GET | `/api/school/:schoolId/operations/complains/:summaryId/complainlist`| `complains.rs` | List complaints under summary. |
| GET | `/api/school/:schoolId/operations/complains/student/:studentId`| `complains.rs` | List complaints filed on student. |
| POST | `/api/school/:schoolId/operations/complains` | `complains.rs` | File a student discipline complaint|
| GET | `/api/school/:schoolId/operations/complains` | `complains.rs` | List complaints catalogs. |
| GET | `/api/school/:schoolId/operations/reminders` | `reminder.rs` | List operational remind triggers.|

---

## 10. AI Domain (`/api/school/:schoolId/ai/*`)
- **Source Module:** `src/domain/ai/mod.rs`

| Method | Route | Handler Path | Description |
|--------|-------|--------------|-------------|
| POST | `/api/school/:schoolId/ai/chat/:schoolId/query` | `ai.rs` | Submit query to school assistant. |
| POST | `/api/school/:schoolId/ai/chat/:schoolId/tasks/generate` | `ai.rs` | Generate weekly tasks using AI. |
| POST | `/api/school/:schoolId/ai/chat/:schoolId/tasks/reorganize` | `ai.rs` | Reorganize pending tasks (AI). |
| POST | `/api/school/:schoolId/ai/chat/:schoolId/exam/generate` | `ai.rs` | Generate exam papers (AI). |
| GET | `/api/school/:schoolId/ai/chat/config/:schoolId` | `ai.rs` | Get school AI provider settings. |
| PUT | `/api/school/:schoolId/ai/chat/config/:schoolId` | `ai.rs` | Update school AI settings. |
| DELETE| `/api/school/:schoolId/ai/chat/config/:schoolId/:providerId`| `ai.rs` | Remove school AI config block. |
| GET | `/api/school/:schoolId/ai/chat/health/:schoolId` | `ai.rs` | Check AI provider health. |
| POST | `/api/school/:schoolId/ai/chat/embedding/:schoolId` | `ai.rs` | Calculate embedding from text. |
| POST | `/api/school/:schoolId/ai/chat/embedding/:schoolId/search` | `ai.rs` | Retrieve similar vector documents. |
| POST | `/api/school/:schoolId/ai/content/generate/exam` | `content_gen.rs` | Generate exam questions. |
| POST | `/api/school/:schoolId/ai/content/generate/lesson-plan` | `content_gen.rs` | Generate daily lesson plans. |
| POST | `/api/school/:schoolId/ai/content/generate/study-materials` | `content_gen.rs` | Generate syllabus study guides. |
| POST | `/api/school/:schoolId/ai/content/generate/practice-problems`| `content_gen.rs` | Generate practice worksheets. |
| POST | `/api/school/:schoolId/ai/content/summarize` | `content_gen.rs` | Summarize textbook content. |
| POST | `/api/school/:schoolId/ai/content/enhanced/generate-exam` | `content_gen.rs` | Generate formatted test papers. |
| POST | `/api/school/:schoolId/ai/ocr/extract` | `ocr.rs` | Extract text values from image. |
| POST | `/api/school/:schoolId/ai/ocr/extract-batch` | `ocr.rs` | Extract text from multiple images. |

---

## 11. Platform Admin Domain (`/api/admin/*`)
- **Source Module:** `src/domain/admin/mod.rs`

| Method | Route | Handler Path | Description |
|--------|-------|--------------|-------------|
| POST | `/api/admin/login` | `auth.rs` | Platform admin portal login. |
| GET | `/api/admin/profile` | `auth.rs` | Retrieve admin details profile. |
| POST | `/api/admin/update-credentials` | `auth.rs` | Update admin credentials. |
| GET | `/api/admin/stats` | `billing.rs` | Get revenue stats & counters. |
| GET | `/api/admin/stats/advanced` | `billing.rs` | Get detailed operations analysis. |
| GET | `/api/admin/churn-radar` | `billing.rs` | Analyze tenant churn patterns. |
| GET | `/api/admin/promos` | `promo.rs` | List promo discount codes. |
| POST | `/api/admin/promos` | `promo.rs` | Create promo discount code. |
| GET | `/api/admin/promos/:promoId/usage` | `promo.rs` | Get promo usage registry metrics. |
| GET | `/api/admin/config/:key` | `system.rs` | Get platform global config key. |
| POST | `/api/admin/config` | `system.rs` | Update platform config key. |
| GET | `/api/admin/schools` | `school.rs` | List all onboarding schools. |
| GET | `/api/admin/schools/export/all` | `system.rs` | Export complete schools DB. |
| GET | `/api/admin/schools/:schoolId` | `school.rs` | Retrieve details of onboarding. |
| PUT | `/api/admin/schools/:schoolId` | `school.rs` | Update school registration record. |
| DELETE| `/api/admin/schools/:schoolId` | `school.rs` | Suspend/delete school tenant. |
| PATCH| `/api/admin/schools/:schoolId/status` | `school.rs` | Freeze school active account. |
| PATCH| `/api/admin/schools/:schoolId/password` | `school.rs` | Hard reset school admin password. |
| PATCH| `/api/admin/schools/:schoolId/session` | `school.rs` | Set idle session expiry limits. |
| GET | `/api/admin/schools/:schoolId/sessions` | `school.rs` | List active sessions in school. |
| DELETE| `/api/admin/schools/:schoolId/sessions` | `school.rs` | Kill active login sessions. |
| POST | `/api/admin/schools/:schoolId/notify` | `school.rs` | Send broadcast notification. |
| DELETE| `/api/admin/schools/:schoolId/notify` | `school.rs` | Dismiss marquee broadcast alert. |
| POST | `/api/admin/schools/:schoolId/apply-promo`| `promo.rs` | Apply promo code to school billing.|
| GET | `/api/admin/schools/:schoolId/ledger` | `billing.rs` | Get wallet transaction ledger. |
| POST | `/api/admin/schools/:schoolId/refund` | `billing.rs` | Log refund transaction. |
| GET | `/api/admin/schools/:schoolId/export` | `system.rs` | Export school data backup. |
| POST | `/api/admin/schools/:schoolId/import` | `system.rs` | Restore school data backup. |
| GET | `/api/admin/support` | `support.rs` | List client support tickets. |
| PATCH| `/api/admin/support/:id/resolve` | `support.rs` | Resolve support ticket. |
| POST | `/api/admin/backup` | `system.rs` | Trigger manual DB backup task. |
| POST | `/api/admin/notify/global` | `system.rs` | Send alert to all active schools. |
| DELETE| `/api/admin/notify/global` | `system.rs` | Clear global alert banner. |
| POST | `/api/admin/cms/blog` | `cms.rs` (nested) | Publish blog post. |
| PUT | `/api/admin/cms/blog/:id` | `cms.rs` (nested) | Update blog post. |
| DELETE| `/api/admin/cms/blog/:id` | `cms.rs` (nested) | Delete blog post. |
| POST | `/api/admin/cms/testimonials` | `cms.rs` (nested) | Add client testimonial. |
| PUT | `/api/admin/cms/testimonials/:id` | `cms.rs` (nested) | Update client testimonial. |
| DELETE| `/api/admin/cms/testimonials/:id` | `cms.rs` (nested) | Delete client testimonial. |
| GET | `/api/admin/cms/school-requests` | `cms.rs` (nested) | List onboarding requests. |
| PUT | `/api/admin/cms/school-requests/:id` | `cms.rs` (nested) | Update onboarding request status. |

---

## 12. Public CMS Domain (`/api/cms/*`)
- **Source Module:** `src/domain/cms/mod.rs`

| Method | Route | Handler Path | Description |
|--------|-------|--------------|-------------|
| GET | `/api/cms/blog` | `cms.rs` | Get public blog posts catalog. |
| GET | `/api/cms/blog/:slug` | `cms.rs` | Get public blog post content. |
| GET | `/api/cms/testimonials` | `cms.rs` | List public client testimonials. |
| POST | `/api/cms/school-request` | `cms.rs` | Submit onboarding contact form. |

---

## 13. System Domain (`/api/school/:schoolId/system/*` & `/api/geo/*`)
- **Source Module:** `src/domain/system/mod.rs`

| Method | Route | Handler Path | Description |
|--------|-------|--------------|-------------|
| GET | `/api/school/:schoolId/system/health` | `health.rs` | Tenant-specific health check. |
| GET | `/api/school/:schoolId/system/geo/countries` | `geo.rs` | Get countries list. |
| GET | `/api/school/:schoolId/system/geo/states/:countryId`| `geo.rs` | Get states of country. |
| GET | `/api/school/:schoolId/system/geo/districts/:stateId`| `geo.rs` | Get districts of state. |
| GET | `/api/school/:schoolId/system/geo/export` | `geo.rs` | Export geo data JSON. |
| POST | `/api/school/:schoolId/system/geo/import` | `geo.rs` | Parse and import geo data JSON. |
| GET | `/api/school/:schoolId/system/recovery/history/students`| `recovery.rs`| Get student change logs feed. |
| POST | `/api/school/:schoolId/system/recovery/history/undo/:id`| `recovery.rs`| Undo student change log. |
| GET | `/api/school/:schoolId/system/recovery/audit`| `recovery.rs`| List audit log entries database. |
| POST | `/api/school/:schoolId/system/recovery/audit/undo/:logId`| `recovery.rs`| Revert action by audit log ID. |
| POST | `/api/school/:schoolId/system/api-keys/` | `api_keys.rs` | Generate new client API key. |
| GET | `/api/school/:schoolId/system/api-keys/` | `api_keys.rs` | List integration API keys. |
| DELETE| `/api/school/:schoolId/system/api-keys/:keyId` | `api_keys.rs` | Revoke/delete active API key. |
| GET | `/api/school/:schoolId/system/developer-access/requests`| `dev_access.rs`| List developer access requests. |
| GET | `/api/school/:schoolId/system/developer-access/validate`| `dev_access.rs`| Validate developer token. |
| POST | `/api/school/:schoolId/system/developer-access/:dev_id/request`| `dev_access.rs`| Request developer authorization. |
| GET | `/api/school/:schoolId/system/developer-access/:dev_id/access`| `dev_access.rs`| Get developer access parameters. |
| DELETE| `/api/school/:schoolId/system/developer-access/:dev_id/access`| `dev_access.rs`| Revoke developer access keys. |
| GET | `/api/school/:schoolId/system/developer-access/:dev_id/activity`| `dev_access.rs`| List developer actions logs. |
| PUT | `/api/school/:schoolId/system/developer-access/:dev_id/role`| `dev_access.rs`| Update developer access roles. |
| POST | `/api/school/:schoolId/system/developer-access/:dev_id/emergency`| `dev_access.rs`| Escalate emergency dev privileges.|
| POST | `/api/school/:schoolId/system/developer-access/requests/:req_id/approve`| `dev_access.rs`| Approve developer request. |
| POST | `/api/school/:schoolId/system/developer-access/requests/:req_id/reject`| `dev_access.rs`| Reject developer request. |
| POST | `/api/school/:schoolId/system/crud/:table` | `generic.rs` | Back-office CRUD: Add record. |
| GET | `/api/school/:schoolId/system/crud/:table` | `generic.rs` | Back-office CRUD: List records. |
| GET | `/api/school/:schoolId/system/crud/:table/:id` | `generic.rs` | Back-office CRUD: Get record. |
| PUT | `/api/school/:schoolId/system/crud/:table/:id` | `generic.rs` | Back-office CRUD: Update record. |
| DELETE| `/api/school/:schoolId/system/crud/:table/:id` | `generic.rs` | Back-office CRUD: Delete record. |
| GET | `/api/geo/countries` | `geo.rs` (legacy) | Get countries catalog. |
| GET | `/api/geo/states/:country_id` | `geo.rs` (legacy) | Get states catalog. |
| GET | `/api/geo/districts/:state_id` | `geo.rs` (legacy) | Get districts catalog. |
| GET | `/api/geo/export` | `geo.rs` (legacy) | Export geo catalog JSON. |
| POST | `/api/geo/import` | `geo.rs` (legacy) | Import geo catalog JSON. |

---

## 14. Compatibility / Backward-Compatibility Endpoints
- **Source Module:** Compatibility routers mapped in `src/domain/mod.rs` (lines 82-85)

| Method | Route | Handler Path | Description |
|--------|-------|--------------|-------------|
| GET | `/api/dashboard/:schoolId/overview` | `src/routes/dashboard.rs` | Retrieve dashboard overview (legacy). |
| GET | `/api/dashboard/:schoolId/stats` | `src/routes/dashboard.rs` | Retrieve dashboard counters (legacy). |
| GET | `/api/dashboard/:schoolId/leaves/proxy-suggestions`| `src/routes/leave.rs` | Get proxy teacher suggestions (legacy)|
| GET/POST| `/api/students/:schoolId` | `src/domain/people/students.rs`| Create/list students (legacy). |
| POST | `/api/students/:schoolId/validate` | `src/domain/people/students.rs`| Validate student parameters (legacy) |
| POST | `/api/students/:schoolId/bulk` | `src/domain/people/students.rs`| Bulk import student CSV (legacy). |
| GET | `/api/students/:schoolId/paginated` | `src/domain/people/students.rs`| Paginated students list (legacy). |
| GET | `/api/students/:schoolId/studentIds` | `src/domain/people/students.rs`| Get student IDs listing (legacy). |
| GET/PUT/DELETE| `/api/students/:schoolId/:studentId` | `src/domain/people/students.rs`| Get/update student record (legacy).|
| GET | `/api/students/:schoolId/form-status` | `src/domain/people/student_forms.rs`| Student form status checks (legacy) |
| GET | `/api/students/:schoolId/:studentId/auto-fill`| `src/domain/people/student_forms.rs`| Trigger AI form auto-fill (legacy) |
| POST | `/api/students/:schoolId/:studentId/form-complete`| `src/domain/people/student_forms.rs`| Mark form filling complete (legacy).|
| GET/POST| `/api/employees/:schoolId` | `src/domain/people/employees.rs`| Create/list employees (legacy). |
| POST | `/api/employees/:schoolId/validate` | `src/domain/people/employees.rs`| Validate employee inputs (legacy). |
| POST | `/api/employees/:schoolId/bulk` | `src/domain/people/employees.rs`| Bulk import employee CSV (legacy). |
| GET/PUT/DELETE| `/api/employees/:schoolId/:employeeId` | `src/domain/people/employees.rs`| Get/update employee record (legacy).|
| GET | `/api/employees/:schoolId/:employeeId/salary-breakdown`| `src/domain/people/emppay.rs`| Employee paycheck breakdown (legacy)|
| POST | `/api/employees/:schoolId/:employeeId/bonus`| `src/domain/people/emppay.rs`| Add paycheck bonus ledger (legacy). |
| POST | `/api/employees/:schoolId/:employeeId/aid`| `src/domain/people/emppay.rs`| Add paycheck aid ledger (legacy). |
| POST | `/api/employees/:schoolId/:employeeId/close-month`| `src/domain/people/emppay.rs`| Close monthly paycheck (legacy). |
| POST | `/api/employees/:schoolId/:employeeId/pay`| `src/domain/people/emppay.rs`| Log paycheck pay transaction (legacy)|
| POST | `/api/employees/:schoolId/:employeeId/salary`| `src/domain/people/emppay.rs`| Set paycheck contract base (legacy).|
| GET/POST| `/api/school/:schoolId/holidays` | `src/domain/attendance/attendance.rs`| List/create holidays (legacy). |
| GET | `/api/school/:schoolId/holidays/check` | `src/domain/attendance/attendance.rs`| Check holiday details status (legacy)|
| DELETE| `/api/school/:schoolId/holidays/:holidayId`| `src/domain/attendance/attendance.rs`| Revoke holiday config (legacy). |
| GET/POST| `/api/class/:schoolId/classes` | `src/routes/class_subject_compat.rs`| List/add classroom classes (legacy).|
| DELETE| `/api/class/:schoolId/classes/:id` | `src/routes/class_subject_compat.rs`| Delete classroom class (legacy). |
| GET/POST| `/api/subjects/:schoolId` | `src/routes/class_subject_compat.rs`| List/add study subjects (legacy). |
| DELETE| `/api/subjects/:schoolId/:id` | `src/routes/class_subject_compat.rs`| Delete study subject (legacy). |
| GET | `/api/students/:schoolId/class/:name` | `src/routes/students.rs`| List class students list (legacy). |
| GET | `/api/academic/:schoolId/:className/ids` | `src/routes/class_subject_compat.rs`| Get class subjects mappings (legacy)|
| GET | `/api/academic/topic/:schoolId/class/:c/subject/:s/chapter/names`| `src/routes/class_subject_compat.rs`| Get study chapters catalog (legacy)|
| POST | `/api/academic/:schoolId/generate-paper`| `src/routes/class_subject_compat.rs`| Generate mock exam papers (legacy).|
| POST | `/api/academic/:schoolId/exams` | `src/routes/class_subject_compat.rs`| Approve mock exam grading (legacy). |
| GET | `/api/students/:schoolId/students/:id/profile`| `src/routes/fees.rs` | Retrieve student profile (legacy). |
| GET/DELETE | `/api/school/:schoolId/notification` | `src/domain/communication/mod.rs`| Get/Clear school legacy notification |
| GET | `/api/global/notification` | `src/domain/communication/mod.rs`| Get global legacy notification |

