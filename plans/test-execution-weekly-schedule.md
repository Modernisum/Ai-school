# Weekly Test Execution Schedule

## Overview
This document provides a detailed week-by-week schedule for executing API tests across all 42 categories. Each week focuses on specific phases with daily breakdowns and deliverables.

## Schedule Summary

| Week | Phase | Categories | Endpoints | Focus Area | Status |
|------|-------|------------|-----------|------------|--------|
| 1 | Phase 1 | 1-5 | 44 | Foundation & Core | ✅ COMPLETED |
| 2 | Phase 2 | 6-10 | 71 | School Management Core | ⏳ CURRENT |
| 3 | Phase 3 | 11-15 | 23 | Academic Operations | ⏳ UPCOMING |
| 4 | Phase 4 | 16-20 | 18 | Infrastructure & Integration | ⏳ UPCOMING |
| 5 | Phase 5 | 21-25 | 28 | Authentication & Security | ⏳ UPCOMING |
| 6 | Phase 6 | 26-30 | 11 | Resource Management | ⏳ UPCOMING |
| 7-8 | Phase 7 | 31 | 30+ | Advanced Responsibility | ⏳ UPCOMING |
| 9 | Phase 8 | 32-36 | Router-based | Specialized Modules | ⏳ UPCOMING |
| 10 | Phase 9 | 37-42 | 23 | Administrative Features | ⏳ UPCOMING |

## Detailed Weekly Schedule

### Week 1: Foundation & Core APIs (COMPLETED)
**Status:** ✅ 100% Complete

| Day | Category | Files Created | Endpoints Tested | Notes |
|-----|----------|---------------|------------------|-------|
| Mon | Health Checks | `01-health.bru`, `.md` | 4 | Basic health endpoints |
| Tue | Dashboard APIs | `02-dashboard.bru`, `.md` | 2 | RLS authentication |
| Wed | Super Admin APIs | `03-super-admin.bru`, `.md` | 16 | Bearer token auth |
| Thu | Student Management | `04-students.bru`, `.md` | 10 | CRUD operations |
| Fri | Attendance Management | `05-attendance.bru`, `.md` | 12 | Attendance tracking |

**Week 1 Deliverables:**
- ✅ 5 `.bru` test files
- ✅ 5 `.md` expected response files
- ✅ Environment configuration
- ✅ Validation script

### Week 2: School Management Core (COMPLETED)
**Progress:** 100% complete (5/5 categories, 71/71 endpoints)
**Target:** ✅ ALL COMPLETED

| Day | Category | Files Created | Endpoints | Status | Dependencies |
|-----|----------|---------------|-----------|--------|--------------|
| Mon | Employee Management | `06-employees.bru`, `.md` | 12 | ✅ COMPLETED | School setup |
| Tue | Leave Management | `07-leave.bru`, `.md` | 23 | ✅ COMPLETED | Employees created |
| Wed | Fee Management | `08-fees.bru`, `.md` | 20 | ✅ COMPLETED | Students created |
| Thu | Class Management | `09-class.bru`, `.md` | 8 | ✅ COMPLETED | School setup |
| Fri | Exam Management | `10-exam.bru`, `.md` | 8 | ✅ COMPLETED | Classes created |

**Week 2 Daily Breakdown:**

**Monday - Employee Management:**
- Create test school and admin (prerequisite)
- Test employee creation (POST `/api/employees/:schoolId`)
- Test employee validation (POST `/api/employees/:schoolId/validate`)
- Test bulk import (POST `/api/employees/:schoolId/bulk`)
- Test employee listing (GET `/api/employees/:schoolId`)
- Test employee retrieval (GET `/api/employees/:schoolId/:employeeId`)
- Test employee update (PUT `/api/employees/:schoolId/:employeeId`)
- Test employee deletion (DELETE `/api/employees/:schoolId/:employeeId`)
- Test salary breakdown (GET `/api/employees/:schoolId/:employeeId/salary-breakdown`)
- Test bonus addition (POST `/api/employees/:schoolId/:employeeId/bonus`)

**Tuesday - Leave Management:**
- Create test employees (prerequisite)
- Test leave creation (POST `/api/leave/:schoolId`)
- Test leave listing (GET `/api/leave/:schoolId`)
- Test leave approval/rejection (POST `/api/leave/:schoolId/:leaveId/approve|reject`)
- Test leave extension/reduction
- Test leave balance (GET `/api/leave/:schoolId/balance/:employeeId`)
- Test conditional approval workflows
- Test responsibility coverage assignment
- Test workload assessment

**Wednesday - Fee Management:**
- Create test students (prerequisite)
- Test school fee setup (POST `/api/fees/:schoolId`)
- Test student fee management
- Test fee payment processing
- Test discount application
- Test coupon management
- Test fee reminder generation
- Test pending fees filtering

**Thursday - Class Management:**
- Test class creation (POST `/api/class/:schoolId/classes`)
- Test class listing (GET `/api/class/:schoolId/classes`)
- Test subject management
- Test class-student association

**Friday - Exam Management:**
- Test exam creation (POST `/api/exams/:schoolId`)
- Test exam listing (GET `/api/exams/:schoolId`)
- Test AI exam generation (POST `/api/exam/ai/:schoolId/generate`)
- Test exam question management

**Week 2 Deliverables:**
- 5 new `.bru` test files
- 5 new `.md` expected response files
- Updated test data setup scripts
- Phase 2 completion report

### Week 3: Academic Operations ✅ COMPLETED
**Target:** Complete Phase 3 (5 categories, 32 endpoints) ✅ ACHIEVED

| Day | Category | Files Created | Endpoints | Status |
|-----|----------|-----------------|-----------|----------|
| Mon | Timetable Management | `11-timetable.bru`, `.md` | 5 | ✅ Complete |
| Tue | Complaint Management | `12-complaints.bru`, `.md` | 5 | ✅ Complete |
| Wed | Notification APIs | `13-notifications.bru`, `.md` | 9 | ✅ Complete |
| Thu | AI & Content Generation | `14-ai-content.bru`, `.md` | 10 | ✅ Complete |
| Fri | OCR Processing | `15-ocr.bru`, `.md` | 3 | ✅ Complete |

**Week 3 Focus:**
- Academic scheduling and planning ✅
- Student/teacher issue tracking ✅
- System notifications ✅
- AI-powered content creation ✅
- Document processing ✅

**Week 3 Deliverables:**
- 5 new `.bru` test files (32 endpoints total)
- 5 new `.md` expected response files
- Updated validation script for formdata support
- Phase 3 completion report

### Week 4: Infrastructure & Integration ✅ COMPLETED
**Target:** Complete Phase 4 (5 categories, 18 endpoints) ✅ ACHIEVED

| Day | Category | Files Created | Endpoints | Status |
|-----|----------|-----------------|-----------|----------|
| Mon | Geo & Location APIs | `16-geo.bru`, `16-geo-expected-responses.md` | 5 | ✅ COMPLETED |
| Tue | Storage & Upload APIs | `17-storage.bru`, `17-storage-expected-responses.md` | 4 | ✅ COMPLETED |
| Wed | API Key Management | `18-api-keys.bru`, `18-api-keys-expected-responses.md` | 3 | ✅ COMPLETED |
| Thu | Webhook Management | `19-webhooks.bru`, `19-webhooks-expected-responses.md` | 4 | ✅ COMPLETED |
| Fri | Public Developer API | `20-public-api.bru`, `20-public-api-expected-responses.md` | 2 | ✅ COMPLETED |

**Week 4 Accomplishments:**
- ✅ Location-based services (5 geo APIs tested)
- ✅ File upload and management with multipart form-data
- ✅ API key generation, listing, and revocation
- ✅ Webhook registration, listing, deletion, and log retrieval
- ✅ Public API access with scope-based authorization
- ✅ All 18 endpoints validated with Bruno test files
- ✅ Expected response documentation completed for all 5 categories

### Week 5: Authentication & Security
**Target:** Complete Phase 5 (5 categories, 28 endpoints)

| Day | Category | Files to Create | Endpoints | Priority |
|-----|----------|-----------------|-----------|----------|
| Mon | Authentication APIs | `21-auth.bru`, `.md` | 9 | HIGH |
| Tue | School Self-Management | `22-school-self.bru`, `.md` | 3 | HIGH |
| Wed | Setup & Configuration | `23-setup.bru`, `.md` | 2 | HIGH |
| Thu | Task Management | `24-tasks.bru`, `.md` | 4 | MEDIUM |
| Fri | Space & Material Management | `25-spaces.bru`, `.md` | 10 | MEDIUM |

**Week 5 Focus:**
- User authentication flows
- School self-service operations
- System setup and configuration
- Task automation and AI reorganization
- Physical space and material management

### Week 6: Resource Management
**Target:** Complete Phase 6 (5 categories, 11 endpoints)

| Day | Category | Files to Create | Endpoints | Priority |
|-----|----------|-----------------|-----------|----------|
| Mon | Academic Materials | `26-materials.bru`, `.md` | 6 | MEDIUM |
| Tue | Awards Management | `27-awards.bru`, `.md` | 1 | LOW |
| Wed | Document Upload | `28-document-upload.bru`, `.md` | 2 | MEDIUM |
| Thu | Document Box | `29-documentbox.bru`, `.md` | 1 | LOW |
| Fri | Reminder Management | `30-reminders.bru`, `.md` | 1 | LOW |

**Week 6 Focus:**
- Teaching material management
- Student award tracking
- Document storage and retrieval
- System reminders

### Weeks 7-8: Advanced Responsibility System
**Target:** Complete Phase 7 (1 category, 30+ endpoints)

| Week | Sub-category | Files to Create | Endpoints | Focus |
|------|--------------|-----------------|-----------|-------|
| 7.1 | Basic CRUD | `31-responsibility-crud.bru` | 8 | Create, read, update, delete |
| 7.2 | Analytics | `31-responsibility-analytics.bru` | 6 | Metrics and analytics |
| 7.3 | Reporting | `31-responsibility-reports.bru` | 8 | Report generation |
| 8.1 | Bulk Operations | `31-responsibility-bulk.bru` | 6 | Bulk assignments |
| 8.2 | History & Versioning | `31-responsibility-history.bru` | 6 | Audit and rollback |

**Weeks 7-8 Focus:**
- Comprehensive responsibility management
- Analytics and reporting
- PDF export functionality
- Bulk operations and version control

### Week 9: Specialized Modules
**Target:** Complete Phase 8 (5 categories)

| Day | Category | Files to Create | Endpoints | Priority |
|-----|----------|-----------------|-----------|----------|
| Mon | Payment Processing | `32-payment.bru`, `.md` | Router | LOW |
| Tue | Chat System | `33-chat.bru`, `.md` | Router | LOW |
| Wed | Transport Management | `34-transport.bru`, `.md` | Router | LOW |
| Thu | WebSocket APIs | `35-websocket.bru`, `.md` | Router | LOW |
| Fri | Events Management | `36-events.bru`, `.md` | 1 | LOW |

**Week 9 Focus:**
- Payment gateway integration
- Real-time chat functionality
- Transport route management
- WebSocket communication
- Event creation and management

### Week 10: Administrative Features
**Target:** Complete Phase 9 (6 categories, 23 endpoints)

| Day | Category | Files to Create | Endpoints | Priority |
|-----|----------|-----------------|-----------|----------|
| Mon | Announcements | `37-announcements.bru`, `.md` | 1 | MEDIUM |
| Tue | Recovery & Audit | `38-recovery.bru`, `.md` | 4 | MEDIUM |
| Wed | Employee Payroll | `39-payroll.bru`, `.md` | 5 | MEDIUM |
| Thu | Developer Access | `40-developer-access.bru`, `.md` | 9 | MEDIUM |
| Fri | School Holidays | `41-holidays.bru`, `.md` | 4 | MEDIUM |
| Fri | Static Files | `42-static-files.bru`, `.md` | N/A | LOW |

**Week 10 Focus:**
- System announcements
- Audit logging and recovery
- Payroll processing
- Developer access control
- Holiday management
- File serving

## Daily Workflow

### Morning Session (2 hours)
1. **Review** (15 min)
   - Check previous day's progress
   - Review any failed tests
   - Update progress tracking

2. **Setup** (15 min)
   - Start backend server if needed
   - Verify test environment
   - Prepare test data

3. **Test Creation** (60 min)
   - Create `.bru` file for current category
   - Add all endpoints with proper authentication
   - Include error cases and edge cases

4. **Documentation** (30 min)
   - Create `.md` file with expected responses
   - Document authentication requirements
   - Note any dependencies

### Afternoon Session (2 hours)
1. **Test Execution** (60 min)
   - Run all tests in Bruno
   - Record actual responses
   - Compare with expected responses

2. **Validation** (30 min)
   - Validate syntax of created files
   - Check for missing dependencies
   - Update environment variables if needed

3. **Reporting** (30 min)
   - Update progress tracking
   - Document issues found
   - Plan for next day

## Test Execution Checklist

### Before Starting Each Category
- [ ] Backend server is running
- [ ] Test database has clean state
- [ ] Required test data is created
- [ ] Authentication tokens are valid
- [ ] Environment variables are set

### During Test Creation
- [ ] All endpoints in category are covered
- [ ] Proper authentication headers are set
- [ ] Request bodies include valid test data
- [ ] Error cases are considered
- [ ] Edge cases are tested

### After Test Execution
- [ ] All tests pass or failures are documented
- [ ] Response validation is complete
- [ ] `.md` file is updated with actual responses
- [ ] Progress tracking is updated
- [ ] Issues are logged for follow-up

## Quality Gates

### Daily Quality Checks
1. **Syntax Validation:** All `.bru` files must pass `validate-bru-files.js`
2. **Documentation:** Each endpoint must have expected response documentation
3. **Coverage:** All endpoints in the category must be tested
4. **Authentication:** Proper auth for each endpoint type

### Weekly Quality Gates
1. **Phase Completion:** All categories in phase must be completed
2. **Integration Testing:** Cross-category dependencies must work
3. **Regression Testing:** Previous phases must still pass
4. **Performance:** Tests should complete within reasonable time

### Monthly Milestones
1. **Month 1:** Complete Phases 1-4 (20 categories, ~156 endpoints)
2. **Month 2:** Complete Phases 5-7 (16 categories, ~69+ endpoints)
3. **Month 3:** Complete Phases 8-9 (11 categories, ~23+ endpoints)

## Risk Mitigation Schedule

### High-Risk Periods
- **Week 2:** Complex dependencies between categories
  - Mitigation: Create comprehensive test data setup scripts
- **Weeks 7-8:** Large responsibility system
  - Mitigation: Break into sub-categories, allocate extra time
- **Week 5:** Mixed authentication types
  - Mitigation: Create auth helper functions

### Contingency Time
- Add 1 buffer day every 2 weeks
- Reserve Friday afternoons for catch-up
- Have backup test data for critical paths

## Progress Tracking

### Daily Tracking
- Update `test-suite-progress.md` with daily accomplishments
- Track endpoints tested vs total
- Note any blocking issues

### Weekly Reporting
- Generate weekly summary report
- Calculate test coverage percentage
- Identify areas needing improvement

### Monthly Review
- Review overall progress against schedule
- Adjust timeline if needed
- Celebrate milestones achieved

## Success Metrics

### Quantitative Metrics
- **Test Coverage:** % of endpoints tested
- **Pass Rate:** % of tests passing
- **Documentation Coverage:** % of endpoints documented
- **Time to Complete:** Actual vs planned schedule

### Qualitative Metrics
- **Test Reliability:** Tests produce consistent results
- **Documentation Quality:** Clear, accurate expected responses
- **Ease of Use:** Tests are easy to run and understand
- **Maintainability:** Tests are easy to update as APIs change

## Next Week Preparation (Week 2)

### Monday Preparation (Employee Management)
1. Ensure school is created via `/api/setup/school`
2. Ensure admin user exists via `/api/auth/school/login`
3. Prepare sample employee data (names, roles, departments)
4. Set up environment variables for RLS authentication

### Test Data Requirements
```json
{
  "schoolId": "{{schoolId}}",
  "adminId": "{{adminId}}",
  "employeeData": {
    "name": "Test Employee",
    "email": "employee@test.com",
    "role": "teacher",
    "department": "mathematics"
  }
}
```

### Expected Outcomes by End of Week 2
- Complete testing of all 71 endpoints in Phase 2
- Have working test data creation scripts
- Establish pattern for complex test scenarios
- Document any API issues or improvements needed

This detailed schedule provides a clear roadmap for systematically testing all APIs over 10 weeks, with daily tasks, quality gates, and risk mitigation strategies.