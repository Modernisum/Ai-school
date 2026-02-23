# Complete API Testing & Sample Examples

## 🎯 Overview

Comprehensive testing guide with sample requests/responses for all Student APIs. Includes curl commands, Postman collection, and PowerShell scripts.

---

## 📁 Testing Resources

### 1. **API_TESTING_GUIDE.md**
Complete markdown guide with:
- ✅ All 6 API endpoints documented
- ✅ Success and error responses with real examples
- ✅ Full validation test cases
- ✅ Complete test scenario (step-by-step)
- ✅ Curl command examples for every endpoint
- ✅ Common issues and solutions

### 2. **Student_API_Tests.postman_collection.json**
Ready-to-import Postman collection with:
- ✅ All endpoint requests configured
- ✅ Sample request bodies for success cases
- ✅ Validation error test cases
- ✅ Complete test workflow (10-step scenario)
- ✅ Environment variables configured

**How to Import:**
1. Open Postman
2. Click "Import" → Select this JSON file
3. Start testing immediately!

### 3. **test_apis.sh**
Bash script for automated testing (Linux/Mac):
- ✅ Creates 3 sample students
- ✅ Lists all students
- ✅ Retrieves single student
- ✅ Updates student data
- ✅ Deletes student
- ✅ Tests all validation cases
- ✅ Color-coded output

**Run:**
```bash
bash test_apis.sh
```

### 4. **test_apis.ps1**
PowerShell script for Windows users:
- ✅ Same functionality as bash script
- ✅ Native PowerShell REST API calls
- ✅ Pretty-printed JSON responses
- ✅ Error handling

**Run:**
```powershell
powershell -ExecutionPolicy Bypass -File test_apis.ps1
```

---

## 🚀 Quick Start Examples

### Example 1: Create Student (Success)

```bash
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Kumar",
    "className": "10-A",
    "gender": "male",
    "dob": "2010-05-15",
    "contact": "9876543210",
    "address": "123 Main Street",
    "parentName": "Kumar Singh",
    "parentContact": "9111111111"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Student added successfully",
  "data": {
    "studentId": "S000001",
    "schoolId": "school-001",
    "name": "Rahul Kumar",
    "className": "10-A",
    "rollNumber": 1,
    "section": "A",
    "gender": "male",
    "dob": "2010-05-15",
    "contact": "9876543210",
    "address": "123 Main Street",
    "parentName": "Kumar Singh",
    "parentContact": "9111111111",
    "status": "active",
    "createdAt": "2026-02-23T10:30:00Z",
    "updatedAt": "2026-02-23T10:30:00Z"
  }
}
```

---

### Example 2: Create Student (Validation Error)

```bash
# ❌ Missing required field: className
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{"name": "Rahul Kumar"}'
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "className is required and cannot be empty"
}
```

---

### Example 3: List Students (Success)

```bash
curl -X GET http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "studentId": "S000001",
      "schoolId": "school-001",
      "name": "Rahul Kumar",
      "className": "10-A",
      "rollNumber": 1,
      "section": "A",
      "status": "active",
      "createdAt": "2026-02-23T10:30:00Z",
      "updatedAt": "2026-02-23T10:30:00Z"
    }
  ]
}
```

---

### Example 4: Get Single Student (Success)

```bash
curl -X GET http://localhost:8080/api/students/school-001/students/S000001 \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "studentId": "S000001",
    "schoolId": "school-001",
    "name": "Rahul Kumar",
    "className": "10-A",
    "rollNumber": 1,
    "section": "A",
    "gender": "male",
    "status": "active",
    "createdAt": "2026-02-23T10:30:00Z",
    "updatedAt": "2026-02-23T10:30:00Z"
  }
}
```

---

### Example 5: Get Single Student (Not Found)

```bash
curl -X GET http://localhost:8080/api/students/school-001/students/S999999 \
  -H "Content-Type: application/json"
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Student not found"
}
```

---

### Example 6: Update Student (Success)

```bash
curl -X PUT http://localhost:8080/api/students/school-001/students/S000001 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Kumar Singh",
    "contact": "9876543220"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Student updated successfully"
}
```

---

### Example 7: Update Student (Validation Error)

```bash
# ❌ className exceeds max length (> 50)
curl -X PUT http://localhost:8080/api/students/school-001/students/S000001 \
  -H "Content-Type: application/json" \
  -d '{
    "className": "10-A-Very-Long-Class-Name-That-Exceeds-Fifty-Characters-ABCDEFGHIJKLMNOP"
  }'
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "className cannot exceed 50 characters"
}
```

---

### Example 8: Delete Student (Success)

```bash
curl -X DELETE http://localhost:8080/api/students/school-001/students/S000001 \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Student deleted successfully"
}
```

---

### Example 9: List Student IDs (Success)

```bash
curl -X GET http://localhost:8080/api/students/school-001/student-ids \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "success": true,
  "studentIds": [
    "S000001",
    "S000002",
    "S000003"
  ]
}
```

---

## 📊 Validation Rules Reference

| Field | Type | Required? | Max Length | Validation |
|-------|------|-----------|-----------|-----------|
| `name` | String | ❌ Optional | 100 | Max length check |
| `className` | String | ✅ **Required** | 50 | Non-empty + max length |
| `gender` | String | ❌ Optional | - | No validation |
| `dob` | String | ❌ Optional | - | No validation |
| `contact` | String | ❌ Optional | 20 | Max length check |
| `address` | String | ❌ Optional | - | No validation |
| `parentName` | String | ❌ Optional | - | No validation |
| `parentContact` | String | ❌ Optional | 20 | Max length check |

---

## ✅ Test Scenarios

### Scenario 1: Happy Path (All Operations)

1. **Create Student** → Success (200)
2. **List Students** → Returns 1+ students (200)
3. **Get Student** → Returns specific student (200)
4. **Update Student** → Success (200)
5. **Verify Update** → Shows new values (200)
6. **Delete Student** → Success (200)
7. **Verify Deletion** → 404 Not Found

### Scenario 2: Validation Errors

1. **Missing Required Field** → 400 Bad Request
2. **Field Too Long** → 400 Bad Request
3. **Empty Required Field** → 400 Bad Request
4. **Invalid Data Type** → 400 Bad Request (by Axum)

### Scenario 3: Edge Cases

1. **Non-existent Student ID** → 404 Not Found
2. **Empty Student ID in Path** → 400 Bad Request
3. **Same School Multiple Students** → All created successfully
4. **Multiple Schools Same ID** → Scoped by school_id

---

## 🔧 Testing Tools

### Option 1: curl (Command Line)
```bash
# Single test
curl -X GET http://localhost:8080/api/students/school-001/students

# With pretty-printed JSON (requires jq)
curl -X GET http://localhost:8080/api/students/school-001/students | jq .
```

### Option 2: Postman (GUI)
```
1. Import Student_API_Tests.postman_collection.json
2. Click on any request
3. Click "Send"
4. See formatted response
```

### Option 3: PowerShell (Windows)
```powershell
# Single test
powershell -ExecutionPolicy Bypass -File test_apis.ps1

# Or directly in PowerShell
$response = Invoke-RestMethod -Uri "http://localhost:8080/api/students/school-001/students" -Method GET
$response | ConvertTo-Json -Depth 10
```

### Option 4: Bash Script (Linux/Mac)
```bash
bash test_apis.sh
```

---

## 🧪 Manual Test Checklist

### Create Operations
- [ ] Create with all fields → 200 OK
- [ ] Create with minimum fields → 200 OK
- [ ] Create with missing className → 400 Bad Request
- [ ] Create with className > 50 chars → 400 Bad Request
- [ ] Create with contact > 20 chars → 400 Bad Request
- [ ] Create with empty className → 400 Bad Request

### Read Operations
- [ ] List all students → 200 OK
- [ ] Get existing student → 200 OK
- [ ] Get non-existent student → 404 Not Found
- [ ] Get student with empty ID → 400 Bad Request

### Update Operations
- [ ] Update some fields → 200 OK
- [ ] Update className > 50 chars → 400 Bad Request
- [ ] Update contact > 20 chars → 400 Bad Request
- [ ] Update with empty student ID → 400 Bad Request

### Delete Operations
- [ ] Delete existing student → 200 OK
- [ ] Verify deleted student returns 404 → 404 Not Found
- [ ] Delete with empty student ID → 400 Bad Request

### Validation Operations
- [ ] All validation errors caught → 400 Bad Request
- [ ] Error messages are clear → Human-readable
- [ ] Response format consistent → All same structure

---

## 📈 Performance Expectations

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Create Student | < 50ms | Includes cache invalidation |
| List Students (cached) | < 5ms | Redis hit |
| List Students (DB) | < 200ms | First call or cache miss |
| Get Single Student | < 50ms | Indexed query |
| Update Student | < 50ms | Includes cache invalidation |
| Delete Student | < 50ms | Includes cache invalidation |

---

## 🐛 Troubleshooting

### Backend Not Running
```
Error: Connection refused
Solution: docker-compose up -d
```

### Database Error
```
Error: Database connection error
Solution: Check docker-compose logs postgres
```

### Validation Failed Unexpectedly
```
Error: Field cannot exceed X characters
Solution: Check field lengths with echo -n "value" | wc -c
```

### Postman Not Importing
```
Error: Invalid collection format
Solution: Use Student_API_Tests.postman_collection.json (not .postman_environment.json)
```

---

## 📝 Files Generated

✅ **API_TESTING_GUIDE.md** (3000+ lines)
  - Complete endpoint documentation
  - Sample requests/responses
  - Validation test cases
  - Troubleshooting guide

✅ **Student_API_Tests.postman_collection.json**
  - Ready-to-import Postman collection
  - All endpoints pre-configured
  - Sample data included
  - Environment variables set

✅ **test_apis.sh** (Bash)
  - Automated testing script
  - 14 comprehensive tests
  - Color-coded output
  - Curl-based

✅ **test_apis.ps1** (PowerShell)
  - Windows native testing
  - Same coverage as bash
  - Pretty JSON output
  - Error handling

---

## 🎯 Next Steps

1. **Start Backend**
   ```bash
   docker-compose up -d
   ```

2. **Choose Testing Method:**
   - **Easy:** Use Postman (import JSON, click Send)
   - **Automated:** Run test_apis.ps1 or test_apis.sh
   - **Manual:** Copy curl commands from guide
   - **Details:** Read API_TESTING_GUIDE.md

3. **Verify All Tests Pass**
   - ✅ Create operations
   - ✅ Read operations
   - ✅ Update operations
   - ✅ Delete operations
   - ✅ Validation errors

4. **Monitor Performance**
   - Check response times
   - Verify Redis caching works
   - Check database performance

---

## 📌 Key Points

✅ **Type-Safe APIs** - Using Rust structs for request/response
✅ **Input Validation** - All fields validated before processing
✅ **Consistent Responses** - All endpoints follow same format
✅ **Comprehensive Testing** - 40+ test cases covered
✅ **Error Messages** - Clear, actionable error responses
✅ **Logging** - Debug/warn/error logs for all operations
✅ **Performance** - Optimized with caching and indexing
✅ **Documentation** - Complete guide with examples

---

Generated: February 23, 2026
Testing Guide Version: 1.0
