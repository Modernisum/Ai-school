# Student APIs - Complete Testing Guide

## 🚀 API Base URL

```
http://localhost:8080
```

---

## 📌 Environment Setup

### Prerequisites
- Backend running on `localhost:8080`
- PostgreSQL running on `localhost:5432`
- Redis running on `localhost:6380`
- All services healthy

### Test Data
```
school_id: "school-001"
```

---

## ✅ API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| **POST** | `/api/students/{schoolId}/students` | Create student |
| **GET** | `/api/students/{schoolId}/students` | List all students |
| **GET** | `/api/students/{schoolId}/students/{studentId}` | Get single student |
| **PUT** | `/api/students/{schoolId}/students/{studentId}` | Update student |
| **DELETE** | `/api/students/{schoolId}/students/{studentId}` | Delete student |
| **GET** | `/api/students/{schoolId}/student-ids` | Get all student IDs |

---

## 1️⃣ CREATE STUDENT (POST)

### Request

```bash
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Kumar",
    "className": "10-A",
    "gender": "male",
    "dob": "2010-05-15",
    "contact": "9876543210",
    "address": "123 Main Street, City",
    "parentName": "Kumar Singh",
    "parentContact": "9111111111"
  }'
```

### Minimal Request (Only Required Fields)

```bash
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{
    "className": "10-A"
  }'
```

### ✅ Success Response (200 OK)

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
    "address": "123 Main Street, City",
    "parentName": "Kumar Singh",
    "parentContact": "9111111111",
    "status": "active",
    "createdAt": "2026-02-23T10:30:00Z",
    "updatedAt": "2026-02-23T10:30:00Z"
  }
}
```

### ❌ Error Response (400 Bad Request)

**Case 1: Missing Required Field**
```bash
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Kumar"
  }'
```

```json
{
  "success": false,
  "message": "className is required and cannot be empty"
}
```

**Case 2: className Too Long**
```bash
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{
    "className": "10-A-Very-Long-Class-Name-That-Exceeds-Fifty-Characters-ABCDEFGHIJKLMNOP"
  }'
```

```json
{
  "success": false,
  "message": "className cannot exceed 50 characters"
}
```

**Case 3: name Too Long**
```bash
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{
    "className": "10-A",
    "name": "A very long student name that exceeds one hundred characters which is not allowed in the system XXXXXXXXXXXXXXXXXXXXXXX"
  }'
```

```json
{
  "success": false,
  "message": "name cannot exceed 100 characters"
}
```

**Case 4: contact Too Long**
```bash
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{
    "className": "10-A",
    "contact": "98765432101234567890123456"
  }'
```

```json
{
  "success": false,
  "message": "contact cannot exceed 20 characters"
}
```

---

## 2️⃣ LIST STUDENTS (GET)

### Request

```bash
curl -X GET http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json"
```

### ✅ Success Response (200 OK)

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
      "gender": "male",
      "dob": "2010-05-15",
      "contact": "9876543210",
      "address": "123 Main Street",
      "parentName": "Kumar Singh",
      "parentContact": "9111111111",
      "status": "active",
      "createdAt": "2026-02-23T10:30:00Z",
      "updatedAt": "2026-02-23T10:30:00Z"
    },
    {
      "studentId": "S000002",
      "schoolId": "school-001",
      "name": "Priya Singh",
      "className": "10-B",
      "rollNumber": 1,
      "section": "B",
      "gender": "female",
      "dob": "2010-06-20",
      "contact": "9876543211",
      "address": "456 Oak Ave",
      "parentName": "Rajesh Singh",
      "parentContact": "9222222222",
      "status": "active",
      "createdAt": "2026-02-23T10:35:00Z",
      "updatedAt": "2026-02-23T10:35:00Z"
    }
  ]
}
```

### ❌ Error Response (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Database connection error"
}
```

---

## 3️⃣ GET SINGLE STUDENT (GET)

### Request

```bash
curl -X GET http://localhost:8080/api/students/school-001/students/S000001 \
  -H "Content-Type: application/json"
```

### ✅ Success Response (200 OK)

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

### ❌ Error Response (400 Bad Request)

**Empty student_id:**
```bash
curl -X GET http://localhost:8080/api/students/school-001/students/ \
  -H "Content-Type: application/json"
```

```json
{
  "success": false,
  "message": "student_id cannot be empty"
}
```

### ❌ Error Response (404 Not Found)

**Non-existent student:**
```bash
curl -X GET http://localhost:8080/api/students/school-001/students/S999999 \
  -H "Content-Type: application/json"
```

```json
{
  "success": false,
  "message": "Student not found"
}
```

---

## 4️⃣ UPDATE STUDENT (PUT)

### Request

```bash
curl -X PUT http://localhost:8080/api/students/school-001/students/S000001 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Kumar Singh",
    "contact": "9876543215",
    "address": "New Address, City"
  }'
```

### ✅ Success Response (200 OK)

```json
{
  "success": true,
  "message": "Student updated successfully"
}
```

### ❌ Error Response (400 Bad Request)

**Empty student_id:**
```bash
curl -X PUT http://localhost:8080/api/students/school-001/students/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Rahul Kumar Singh"}'
```

```json
{
  "success": false,
  "message": "student_id cannot be empty"
}
```

**className Too Long:**
```bash
curl -X PUT http://localhost:8080/api/students/school-001/students/S000001 \
  -H "Content-Type: application/json" \
  -d '{
    "className": "10-A-Very-Long-Class-Name-That-Exceeds-Fifty-Characters-ABCDEFGHIJKLMNOP"
  }'
```

```json
{
  "success": false,
  "message": "className cannot exceed 50 characters"
}
```

**contact Too Long:**
```bash
curl -X PUT http://localhost:8080/api/students/school-001/students/S000001 \
  -H "Content-Type: application/json" \
  -d '{
    "contact": "98765432101234567890123"
  }'
```

```json
{
  "success": false,
  "message": "contact cannot exceed 20 characters"
}
```

---

## 5️⃣ DELETE STUDENT (DELETE)

### Request

```bash
curl -X DELETE http://localhost:8080/api/students/school-001/students/S000001 \
  -H "Content-Type: application/json"
```

### ✅ Success Response (200 OK)

```json
{
  "success": true,
  "message": "Student deleted successfully"
}
```

### ❌ Error Response (400 Bad Request)

**Empty student_id:**
```bash
curl -X DELETE http://localhost:8080/api/students/school-001/students/ \
  -H "Content-Type: application/json"
```

```json
{
  "success": false,
  "message": "student_id cannot be empty"
}
```

### ❌ Error Response (500 Internal Server Error)

**Database error during deletion:**
```json
{
  "success": false,
  "message": "Database error: student_id not found"
}
```

---

## 6️⃣ LIST STUDENT IDs (GET)

### Request

```bash
curl -X GET http://localhost:8080/api/students/school-001/student-ids \
  -H "Content-Type: application/json"
```

### ✅ Success Response (200 OK)

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

### ❌ Error Response (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Database connection failed"
}
```

---

## 🧪 Complete Test Scenario

### Step 1: Create 3 Students

```bash
# Student 1
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Kumar",
    "className": "10-A",
    "gender": "male",
    "contact": "9876543210"
  }'

# Student 2
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Singh",
    "className": "10-B",
    "gender": "female",
    "contact": "9876543211"
  }'

# Student 3
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Amit Patel",
    "className": "10-A",
    "gender": "male",
    "contact": "9876543212"
  }'
```

### Step 2: List All Students

```bash
curl -X GET http://localhost:8080/api/students/school-001/students
```

Expected: 3 students returned with IDs S000001, S000002, S000003

### Step 3: Get Specific Student

```bash
curl -X GET http://localhost:8080/api/students/school-001/students/S000001
```

Expected: Returns Rahul Kumar's details

### Step 4: Update Student

```bash
curl -X PUT http://localhost:8080/api/students/school-001/students/S000001 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Kumar Singh",
    "contact": "9876543220"
  }'
```

Expected: Success message

### Step 5: Verify Update

```bash
curl -X GET http://localhost:8080/api/students/school-001/students/S000001
```

Expected: Updated name and contact

### Step 6: Get Student IDs

```bash
curl -X GET http://localhost:8080/api/students/school-001/student-ids
```

Expected: ["S000001", "S000002", "S000003"]

### Step 7: Delete Student

```bash
curl -X DELETE http://localhost:8080/api/students/school-001/students/S000002
```

Expected: Success message

### Step 8: Verify Deletion

```bash
curl -X GET http://localhost:8080/api/students/school-001/students/S000002
```

Expected: "Student not found" error

### Step 9: List Remaining Students

```bash
curl -X GET http://localhost:8080/api/students/school-001/students
```

Expected: 2 students returned (S000001, S000003)

---

## 🔍 Validation Test Cases

### Test: Required Field Missing

```bash
# ❌ SHOULD FAIL - no className
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe"}'
```

Expected: 400 Bad Request
```json
{"success": false, "message": "className is required and cannot be empty"}
```

---

### Test: Field Length Validation

```bash
# ❌ SHOULD FAIL - className too long (> 50)
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{
    "className": "Class-Name-That-Is-Extremely-Long-And-Exceeds-The-Maximum-Allowed-Length-XXXXXXXXX"
  }'
```

Expected: 400 Bad Request
```json
{"success": false, "message": "className cannot exceed 50 characters"}
```

---

### Test: Phone Number Format

```bash
# ❌ SHOULD FAIL - contact too long (> 20)
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{
    "className": "10-A",
    "contact": "9876543210123456789012345"
  }'
```

Expected: 400 Bad Request
```json
{"success": false, "message": "contact cannot exceed 20 characters"}
```

---

### Test: Empty String Fields

```bash
# ❌ SHOULD FAIL - className is empty string
curl -X POST http://localhost:8080/api/students/school-001/students \
  -H "Content-Type: application/json" \
  -d '{
    "className": ""
  }'
```

Expected: 400 Bad Request
```json
{"success": false, "message": "className is required and cannot be empty"}
```

---

### Test: Update with Invalid Data

```bash
# ❌ SHOULD FAIL - className too long in update
curl -X PUT http://localhost:8080/api/students/school-001/students/S000001 \
  -H "Content-Type: application/json" \
  -d '{
    "className": "Very-Long-Class-Name-That-Exceeds-Fifty-Character-Limit-XXXXXXX"
  }'
```

Expected: 400 Bad Request
```json
{"success": false, "message": "className cannot exceed 50 characters"}
```

---

## 📊 Response Status Codes

| Status | Meaning | Example |
|--------|---------|---------|
| **200** | Success | Student created, updated, or retrieved |
| **400** | Bad Request | Validation error, missing field, invalid data |
| **404** | Not Found | Student ID doesn't exist |
| **500** | Server Error | Database connection error |

---

## 🛠️ Helpful curl Flags

```bash
# Pretty print JSON response
curl -X GET http://localhost:8080/api/students/school-001/students | jq .

# Save response to file
curl -X GET http://localhost:8080/api/students/school-001/students > students.json

# Show response headers
curl -i -X GET http://localhost:8080/api/students/school-001/students

# Show verbose output (headers + body)
curl -v -X GET http://localhost:8080/api/students/school-001/students
```

---

## 🔗 Related Files

- **Models:** [Backend/src/models/user.rs](Backend/src/models/user.rs)
- **Routes:** [Backend/src/routes/students.rs](Backend/src/routes/students.rs)
- **Services:** [Backend/src/services/student_service.rs](Backend/src/services/student_service.rs)
- **Database:** [Backend/migrations/202602180000_init.sql](Backend/migrations/202602180000_init.sql)

---

## ✨ Testing Tips

1. **Use Postman** for easier testing (import collection below)
2. **Check logs** with `docker-compose logs backend` for debugging
3. **Test validation** by intentionally sending invalid data
4. **Monitor Redis cache** with `redis-cli` to verify caching works
5. **Check database** with `psql` to verify data persistence

---

## 🚨 Common Issues & Solutions

### Issue: Connection Refused

```
curl: (7) Failed to connect to localhost port 8080
```

**Solution:** Ensure backend is running
```bash
docker-compose ps
docker-compose up -d
```

### Issue: Database Error

```json
{"success": false, "message": "Database connection error"}
```

**Solution:** Check PostgreSQL is running
```bash
docker-compose logs postgres
```

### Issue: Validation Error on Valid Data

```json
{"success": false, "message": "className cannot exceed 50 characters"}
```

**Solution:** Check field length - use `wc -c` to count characters
```bash
echo -n "10-A" | wc -c  # Should be 4
```

