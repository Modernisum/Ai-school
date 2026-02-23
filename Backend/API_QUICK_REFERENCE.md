# 🚀 API Testing - Quick Reference Card

## 📍 Base URL
```
http://localhost:8080
```

---

## 🔗 All Endpoints at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                      STUDENT API ENDPOINTS                       │
├─────────────┬──────────┬──────────────────────────────┬──────────┤
│   METHOD    │   PATH   │        DESCRIPTION           │ RESPONSE │
├─────────────┼──────────┼──────────────────────────────┼──────────┤
│   POST      │ /api/    │ Create new student           │ 200 OK   │
│             │students/ │                              │ 400 Err  │
│             │{schoolId}│                              │          │
│             │/students │                              │          │
├─────────────┼──────────┼──────────────────────────────┼──────────┤
│   GET       │ /api/    │ List all students for school │ 200 OK   │
│             │students/ │                              │ 500 Err  │
│             │{schoolId}│                              │          │
│             │/students │                              │          │
├─────────────┼──────────┼──────────────────────────────┼──────────┤
│   GET       │ /api/    │ Get specific student by ID   │ 200 OK   │
│             │students/ │                              │ 404 Err  │
│             │{schoolId}│                              │ 400 Err  │
│             │/students/│                              │          │
│             │{studentId}                              │          │
├─────────────┼──────────┼──────────────────────────────┼──────────┤
│   PUT       │ /api/    │ Update student data          │ 200 OK   │
│             │students/ │                              │ 400 Err  │
│             │{schoolId}│                              │          │
│             │/students/│                              │          │
│             │{studentId}                              │          │
├─────────────┼──────────┼──────────────────────────────┼──────────┤
│   DELETE    │ /api/    │ Delete student               │ 200 OK   │
│             │students/ │                              │ 400 Err  │
│             │{schoolId}│                              │          │
│             │/students/│                              │          │
│             │{studentId}                              │          │
├─────────────┼──────────┼──────────────────────────────┼──────────┤
│   GET       │ /api/    │ Get all student IDs for      │ 200 OK   │
│             │students/ │ school                       │ 500 Err  │
│             │{schoolId}│                              │          │
│             │/student- │                              │          │
│             │ids       │                              │          │
└─────────────┴──────────┴──────────────────────────────┴──────────┘
```

---

## ⚡ One-Liner Examples

### Create Student
```bash
curl -X POST http://localhost:8080/api/students/school-001/students -H "Content-Type: application/json" -d '{"className":"10-A","name":"Rahul"}'
```

### List Students
```bash
curl -X GET http://localhost:8080/api/students/school-001/students
```

### Get Student
```bash
curl -X GET http://localhost:8080/api/students/school-001/students/S000001
```

### Update Student
```bash
curl -X PUT http://localhost:8080/api/students/school-001/students/S000001 -H "Content-Type: application/json" -d '{"name":"Rahul Singh"}'
```

### Delete Student
```bash
curl -X DELETE http://localhost:8080/api/students/school-001/students/S000001
```

### List Student IDs
```bash
curl -X GET http://localhost:8080/api/students/school-001/student-ids
```

---

## 📋 Request Body Format

### CreateStudentRequest
```json
{
  "name": "Rahul Kumar",              // Optional (String, max 100)
  "className": "10-A",                // Required (String, max 50)
  "gender": "male",                   // Optional (String)
  "dob": "2010-05-15",                // Optional (String)
  "contact": "9876543210",            // Optional (String, max 20)
  "address": "123 Main St",           // Optional (String)
  "parentName": "Kumar Singh",        // Optional (String)
  "parentContact": "9111111111"       // Optional (String, max 20)
}
```

### UpdateStudentRequest
```json
{
  "name": "Rahul Singh",              // Optional
  "className": "10-B",                // Optional
  "gender": "male",                   // Optional
  "dob": "2010-05-15",                // Optional
  "contact": "9876543220",            // Optional
  "address": "456 Oak Ave",           // Optional
  "parentName": "Kumar Singh",        // Optional
  "parentContact": "9111111112"       // Optional
}
```

---

## ✅ Success Responses

### 200 OK - Object Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* student object */ }
}
```

### 200 OK - Array Response
```json
{
  "success": true,
  "data": [ /* array of students */ ]
}
```

### 200 OK - Delete Response
```json
{
  "success": true,
  "message": "Student deleted successfully"
}
```

---

## ❌ Error Responses

### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "message": "className is required and cannot be empty"
}
```

### 400 Bad Request - Field Too Long
```json
{
  "success": false,
  "message": "className cannot exceed 50 characters"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Student not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Database connection error"
}
```

---

## 🧪 Quick Test Sequence

```bash
# 1. Create
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{"className":"10-A","name":"Rahul Kumar"}'
# Expected: 200 OK with studentId S000001

# 2. List
curl -X GET http://localhost:8080/api/students/school-001/students
# Expected: 200 OK with array of students

# 3. Get
curl -X GET http://localhost:8080/api/students/school-001/students/S000001
# Expected: 200 OK with student details

# 4. Update
curl -X PUT http://localhost:8080/api/students/school-001/students/S000001 \
  -H "Content-Type: application/json" \
  -d '{"name":"Rahul Singh"}'
# Expected: 200 OK with success message

# 5. Delete
curl -X DELETE http://localhost:8080/api/students/school-001/students/S000001
# Expected: 200 OK with success message

# 6. Verify Deletion
curl -X GET http://localhost:8080/api/students/school-001/students/S000001
# Expected: 404 Not Found
```

---

## 🎯 HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| **200** | OK | Request successful |
| **400** | Bad Request | Validation error or invalid input |
| **404** | Not Found | Student doesn't exist |
| **500** | Server Error | Database or server error |

---

## 🚨 Common Validation Errors

| Error | Solution |
|-------|----------|
| `className is required` | Add `className` field |
| `className cannot exceed 50 characters` | Shorten className |
| `contact cannot exceed 20 characters` | Use shorter phone number |
| `name cannot exceed 100 characters` | Shorten name |
| `student_id cannot be empty` | Provide valid student ID in URL |

---

## 🛠️ Testing Methods

### Method 1: curl (Fastest)
```bash
curl -X GET http://localhost:8080/api/students/school-001/students
```

### Method 2: Postman (Easiest GUI)
1. Import `Student_API_Tests.postman_collection.json`
2. Click any request → Send

### Method 3: PowerShell (Windows)
```powershell
powershell -ExecutionPolicy Bypass -File test_apis.ps1
```

### Method 4: Bash Script (Linux/Mac)
```bash
bash test_apis.sh
```

---

## 📊 Response Structure Template

```json
{
  "success": true/false,                    // Operation status
  "message": "Optional message",            // Optional
  "data": {} / [] / null,                   // Response payload
  "studentIds": []                          // For ID endpoint only
}
```

---

## 🎓 Field Validation Rules

| Field | Required | Type | Max Length | Notes |
|-------|----------|------|-----------|-------|
| className | ✅ Yes | String | 50 | Cannot be empty |
| name | ❌ No | String | 100 | - |
| gender | ❌ No | String | - | - |
| dob | ❌ No | String | - | - |
| contact | ❌ No | String | 20 | Phone format |
| address | ❌ No | String | - | - |
| parentName | ❌ No | String | - | - |
| parentContact | ❌ No | String | 20 | Phone format |

---

## 💡 Pro Tips

1. **Use jq for pretty JSON:**
   ```bash
   curl -X GET http://localhost:8080/api/students/school-001/students | jq .
   ```

2. **Save response to file:**
   ```bash
   curl -X GET http://localhost:8080/api/students/school-001/students > students.json
   ```

3. **Get just the data:**
   ```bash
   curl -s http://localhost:8080/api/students/school-001/students | jq '.data'
   ```

4. **Count students:**
   ```bash
   curl -s http://localhost:8080/api/students/school-001/students | jq '.data | length'
   ```

5. **View student IDs only:**
   ```bash
   curl -s http://localhost:8080/api/students/school-001/student-ids | jq '.studentIds'
   ```

---

## 📚 Documentation

- **Full Guide:** `API_TESTING_GUIDE.md` (3000+ lines)
- **Postman Collection:** `Student_API_Tests.postman_collection.json`
- **Testing Scripts:** `test_apis.ps1` | `test_apis.sh`
- **Summary:** `TESTING_SUMMARY.md`

---

## 🔗 Related Files

- **Models:** `Backend/src/models/user.rs`
- **Routes:** `Backend/src/routes/students.rs`
- **Services:** `Backend/src/services/student_service.rs`
- **Database:** `Backend/migrations/202602180000_init.sql`

---

**Last Updated:** February 23, 2026  
**Version:** 1.0  
**Status:** ✅ Complete & Tested
