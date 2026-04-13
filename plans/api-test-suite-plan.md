# API Test Suite Plan for Modern School Backend

## Overview
Create comprehensive test cases for all APIs in `Backend/src/routes/router.rs` organized by category in `.bru` files (Bruno REST client format). Each category will have its own `.bru` file containing test requests for all endpoints in that category.

## Categories Identified

### Group 1: System & Health
1. **Health Checks** - `/health`, `/health/detailed`, `/health/ready`, `/health/alive`

### Group 2: Super Admin
2. **Super Admin API** - `/api/admin/*` (multiple subroutes)

### Group 3: School Management
3. **Dashboard Stats** - `/api/dashboard/:schoolId/stats`, `/api/dashboard/:schoolId/leaves/proxy-suggestions`
4. **School Notification Polling** - `/api/school/:schoolId/notification`, `/api/global/notification`
5. **School Routes** - `/api/school/:schoolId`
6. **School Holidays** - `/api/school-holidays/:schoolId/*`
7. **Setup Routes** - `/api/setup/*`

### Group 4: User Management
8. **Student Routes** - `/api/students/*`
9. **Employee Routes** - `/api/employees/*`
10. **Auth Routes** - `/api/auth/*`

### Group 5: Academic
11. **Class Routes** - `/api/class/:schoolId/classes`
12. **Exam Routes** - `/api/exams/:schoolId`, `/api/exam/ai/:schoolId/generate`
13. **Content Generation Routes** - `/api/content/:schoolId/*`
14. **Topics** - `/api/topics`

### Group 6: Operations
15. **Attendance Routes** - `/api/operations/attendance/*`, `/api/attendance/*`
16. **Fees Routes** - `/api/fees/*`
17. **Leave Routes** - `/api/leave/*`
18. **Responsibility Routes** - `/api/responsibility/*`

### Group 7: Resources
19. **Space/Material Routes** - `/api/spaces/*`
20. **Materials Routes** - `/api/materials/*`
21. **Storage Routes** - `/api/storage/*`

### Group 8: Communication
22. **Announcements** - `/api/announcements/:schoolId/:type/:userId`
23. **Events** - `/api/events/:schoolId`
24. **Chat Routes** - `/api/chat/*` (nested router)
25. **Transport Routes** - `/api/transport/*` (nested router)
26. **WebSocket Routes** - `/api/ws/*` (nested router)

### Group 9: Developer & Integration
27. **Geo Data Routes** - `/api/geo/*`
28. **Public Developer API** - `/api/v1/public/*`
29. **API Key Management** - `/api/school/:schoolId/api-keys/*`
30. **Webhook Routes** - `/api/school/:schoolId/webhooks/*`
31. **Timetable Routes** - `/api/school/:schoolId/timetable/*`
32. **OCR Routes** - `/api/ocr-routes/*`
33. **Developer Access Routes** - `/api/developer-access/*`
34. **AI Routes** - `/api/ai/*`

### Group 10: Other
35. **Complains Routes** - `/api/complains/*`
36. **Payment Routes** - `/api/payment/*` (nested router)
37. **Award** - `/api/award/:schoolId`
38. **Document Upload** - `/api/document_upload/*`
39. **Document Box** - `/api/documentbox/*`
40. **Reminder** - `/api/reminder/:schoolId`
41. **Task Routes** - `/api/task/*`

## Authentication Requirements

### 1. RLS Middleware (Most Routes)
- Requires headers: `X-School-ID`, `X-Admin-ID`, `X-Request-ID` (optional), `X-Is-Super-Admin` (optional)
- School ID is also often in path parameters

### 2. Super Admin Authentication
- Bearer token in Authorization header
- Token format: base64 encoded `username:timestamp:secret`

### 3. Public Developer API
- API key authentication via custom header or query parameter

### 4. No Authentication
- Health routes
- Auth login endpoints
- Some public routes (geo data, uploads with token)

## Test Data Structure

### Environment Variables
```json
{
  "baseUrl": "http://localhost:8080",
  "schoolId": "1",
  "adminToken": "{{LOGIN_RESPONSE:admin_token}}",
  "apiKey": "test_api_key_123",
  "studentId": "STU001",
  "employeeId": "EMP001",
  "leaveId": "LEAVE001",
  "responsibilityId": "RESP001",
  "materialName": "Textbook",
  "spaceName": "Classroom-101",
  "holidayId": "HOL001",
  "taskId": "TASK001",
  "webhookId": "WEBHOOK001",
  "configId": "CONFIG001",
  "promoId": "PROMO001",
  "couponId": "COUPON001",
  "feeId": "FEE001",
  "developerId": "DEV001",
  "requestId": "REQ001",
  "summaryId": "SUM001",
  "countryId": "1",
  "stateId": "1",
  "date": "2024-01-15",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "role": "student",
  "userId": "USER001",
  "userType": "school-admin",
  "vehicleId": "VEH001",
  "class_name": "10",
  "type": "announcement"
}
```

### Sample Request Bodies
- **CreateStudentRequest**: See `Backend/src/models/user.rs`
- **CreateEmployeeRequest**: See `Backend/src/models/user.rs`
- **LoginRequest**: `{"username": "admin", "password": "admin123"}`
- **CreateLeaveRequest**: `{"employeeId": "EMP001", "startDate": "2024-01-01", "endDate": "2024-01-05", "reason": "Sick leave"}`

## File Structure
```
api-tests/
├── environment.bru          # Master environment variables
├── categories/
│   ├── 01-health.bru
│   ├── 02-super-admin.bru
│   ├── 03-dashboard.bru
│   ├── 04-school.bru
│   ├── 05-students.bru
│   ├── 06-employees.bru
│   ├── 07-auth.bru
│   ├── 08-academic.bru
│   ├── 09-attendance.bru
│   ├── 10-fees.bru
│   ├── 11-leave.bru
│   ├── 12-responsibility.bru
│   ├── 13-spaces.bru
│   ├── 14-materials.bru
│   ├── 15-storage.bru
│   ├── 16-communication.bru
│   ├── 17-geo.bru
│   ├── 18-developer.bru
│   ├── 19-other.bru
│   └── 20-integration.bru
└── README.md
```

## Implementation Steps

1. **Create environment.bru** with all variables
2. **Create category template** with proper headers and authentication
3. **For each category**:
   - Extract all endpoints from router.rs
   - Determine HTTP method, path, and parameters
   - Create request with appropriate headers
   - Add sample request body if needed
   - Add response validation (status code, schema)
4. **Validate all .bru files** using Bruno CLI
5. **Create test execution script** to run tests sequentially
6. **Document test suite usage**

## Test Execution Plan

### Manual Testing
- Use Bruno GUI to load each collection
- Run requests sequentially
- Verify responses match expected patterns

### Automated Testing
- Use Bruno CLI (`bru run`)
- Create shell script to run all categories
- Integrate with CI/CD pipeline

## Dependencies
- Bruno REST client (installed)
- Backend server running on `localhost:8080`
- Test database with sample data

## Next Steps
1. Switch to Code mode to implement the test suite
2. Create environment.bru file
3. Create category .bru files one by one
4. Test each category against running backend
5. Document any issues found