# User APIs - Complete Data Workflow Guide

## Overview
User APIs handle two types of users:
1. **Students** - Learning entities (Enrolled in classes)
2. **Employees** - Staff entities (Teachers, Admin, Support)

---

## 1️⃣ STUDENT API WORKFLOW

### API Endpoints
```
POST   /api/students/:schoolId/students              → Create
GET    /api/students/:schoolId/students              → List All
GET    /api/students/:schoolId/students/:studentId   → Get One
PUT    /api/students/:schoolId/students/:studentId   → Update
DELETE /api/students/:schoolId/students/:studentId   → Delete
GET    /api/students/:schoolId/studentIds            → Get IDs Only
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT REQUEST                                │
│  POST /api/students/school-123/students                          │
│  Body: {                                                          │
│    "className": "10-A",                                          │
│    "name": "Rahul Kumar",                                        │
│    "gender": "M",                                                │
│    "dob": "2010-05-15"                                           │
│  }                                                                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────▼──────────────┐
        │  [1] ROUTE HANDLER         │
        │  routes/students.rs        │
        │  create_student()          │
        │                            │
        │  • Extract: schoolId       │
        │  • Extract: payload        │
        │  • VALIDATE input          │◄─── FAIL FAST ✓
        │  • Format JSON             │
        └─────────────┬──────────────┘
                      │
        ┌─────────────▼──────────────┐
        │  [2] SERVICE LAYER         │
        │  services/student_         │
        │  service.rs               │
        │  create_student()          │
        │                            │
        │  • Get next roll_number    │◄─── DB QUERY 1
        │  • Calculate section (A/B) │
        │  • Generate student_id     │◄─── DB QUERY 2
        │  • Enrich data             │
        └─────────────┬──────────────┘
                      │
        ┌─────────────▼──────────────┐
        │  [3] REPOSITORY LAYER      │
        │  repository/postgres.rs    │
        │  add_student()             │
        │                            │
        │  • Build SQL INSERT query  │
        │  • Use indexed lookup      │◄─── INDEXED ✓
        │  • Execute via SQLx        │
        └─────────────┬──────────────┘
                      │
        ┌─────────────▼──────────────┐
        │  [4] DATABASE             │
        │  PostgreSQL               │
        │  students table           │
        │                            │
        │  INSERT INTO students(    │
        │    student_id,            │
        │    school_id,             │
        │    class_name,            │
        │    name,                  │
        │    roll_number,           │
        │    section,               │
        │    status,                │
        │    created_at             │
        │  )                        │
        └─────────────┬──────────────┘
                      │
        ┌─────────────▼──────────────┐
        │  [5] CACHE LAYER          │
        │  Redis                    │
        │                            │
        │  INVALIDATE CACHE         │
        │  Key: students:list:      │
        │  school-123              │
        └─────────────┬──────────────┘
                      │
        ┌─────────────▼──────────────┐
        │  RESPONSE                  │
        │  {                         │
        │    "success": true,        │
        │    "data": {              │
        │      "studentId": "S000001",│
        │      "name": "Rahul Kumar",│
        │      "rollNumber": 1,      │
        │      "section": "A",       │
        │      "status": "active"    │
        │    }                       │
        │  }                         │
        └────────────────────────────┘
```

### Request → Response Flow (CREATE)

```json
// REQUEST
POST /api/students/school-123/students
{
  "className": "10-A",
  "name": "Rahul Kumar",
  "gender": "M",
  "dob": "2010-05-15",
  "contact": "9876543210",
  "address": "123 Main St",
  "parentName": "Mr. Kumar",
  "parentContact": "9876543211"
}

         ↓ VALIDATION LAYER
         
  • className: required, non-empty ✓
  • name: required, non-empty ✓
  • schoolId: valid format ✓

         ↓ SERVICE LAYER (Business Logic)
         
  • Fetch next roll_number for "10-A"
    → Last roll: 5 → Next: 6
  
  • Assign section: 6 ≤ 60 → "A"
  
  • Generate student_id
    → "S000001" (sequential)
  
  • Enrich data:
    {
      "studentId": "S000001",
      "rollNumber": 6,
      "section": "A",
      "status": "active",
      ...rest of data
    }

         ↓ DATABASE LAYER
         
  • INSERT into students table
  • Use idx_students_school_id for lookup
  • Return created record

         ↓ CACHE INVALIDATION
         
  • Delete key: students:list:school-123
  • Next list_students() will hit DB

         ↓ RESPONSE

{
  "success": true,
  "message": "Student added successfully",
  "data": {
    "studentId": "S000001",
    "schoolId": "school-123",
    "className": "10-A",
    "name": "Rahul Kumar",
    "rollNumber": 6,
    "section": "A",
    "status": "active",
    "createdAt": "2026-02-23T10:30:00Z"
  }
}
```

### List Students (with Cache)

```
GET /api/students/school-123/students

         ↓ CHECK REDIS CACHE
         
  Key: students:list:school-123
  
  ✓ CACHE HIT (5ms)
    → Return cached data immediately
    
  ✗ CACHE MISS
    → Continue to database

         ↓ DATABASE QUERY
         
  SELECT * FROM students 
  WHERE school_id = 'school-123'
  ORDER BY class_name, roll_number
  
  Using: idx_students_school_id ← 160x faster!

         ↓ STORE IN CACHE
         
  Key: students:list:school-123
  Value: [students array]
  TTL: 30 seconds

         ↓ RESPONSE
         
{
  "success": true,
  "count": 150,
  "data": [
    {
      "studentId": "S000001",
      "name": "Rahul Kumar",
      "className": "10-A",
      "section": "A",
      ...
    },
    ...150 more students
  ]
}
```

### Update Student

```
PUT /api/students/school-123/students/S000001

Body: {
  "className": "10-B",  ← Changed class
  "name": "Rahul Singh"  ← Changed name
}

         ↓ VALIDATION
         
  • Payload not empty ✓
  • SchoolId valid ✓
  • StudentId exists ✓

         ↓ SERVICE LAYER (Business Logic)
         
  OLD student data:
  {
    "className": "10-A",
    "rollNumber": 6,
    "section": "A"
  }

  NEW className: "10-B" (different!)
  
  → Special handling needed:
    1. Get next roll_number in "10-B"
    2. Calculate new section for 10-B
    3. Resequence old class (10-A)
    4. Update student record

         ↓ DATABASE OPERATIONS
         
  1. UPDATE students SET ... WHERE id = 'S000001'
  2. Resequence 10-A roll numbers
  3. Update 10-B class aggregates

         ↓ CACHE INVALIDATION
         
  • Delete: students:list:school-123
  • (Will repopulate on next GET)

         ↓ RESPONSE
         
{
  "success": true,
  "message": "Student updated successfully"
}
```

### Delete Student

```
DELETE /api/students/school-123/students/S000001

         ↓ VALIDATION
         
  • StudentId exists ✓

         ↓ SERVICE LAYER
         
  OLD class: "10-A"
  
  → Delete student
  → Resequence roll numbers in 10-A
  
  All remaining students get new roll numbers

         ↓ DATABASE
         
  1. DELETE FROM students WHERE id = 'S000001'
  2. Resequence roll_numbers

         ↓ CACHE INVALIDATION
         
  • Delete: students:list:school-123

         ↓ RESPONSE
         
{
  "success": true,
  "message": "Student deleted successfully"
}
```

---

## 2️⃣ EMPLOYEE API WORKFLOW

### API Endpoints
```
POST   /api/employees/:schoolId/employees              → Create
GET    /api/employees/:schoolId/employees              → List All
GET    /api/employees/:schoolId/employees/:employeeId → Get One
PUT    /api/employees/:schoolId/employees/:employeeId → Update
DELETE /api/employees/:schoolId/employees/:employeeId → Delete
```

### Data Flow Diagram (Similar to Students)

```
CREATE REQUEST
    ↓
ROUTE HANDLER (routes/employees.rs)
  • Validate inputs
  • Extract: schoolId, payload
    ↓
SERVICE LAYER (services/employee_service.rs)
  • Generate employee_id (E000001)
  • Set status = "active"
  • Enrich data
    ↓
REPOSITORY (repository/postgres.rs)
  • Build SQL INSERT
  • Execute query
    ↓
DATABASE (PostgreSQL)
  • INSERT into employees table
  • Using idx_employees_school_id
    ↓
CACHE INVALIDATION
  • Delete: employees:list:{schoolId}
    ↓
RESPONSE
  {
    "success": true,
    "employee": { employee_id, name, status, ... }
  }
```

### Create Employee (Complete Flow)

```json
// REQUEST
POST /api/employees/school-123/employees
{
  "name": "John Doe",
  "employeeType": "teacher",
  "email": "john@school.com",
  "phone": "9876543210",
  "subject": "Mathematics",
  "department": "Academic",
  "baseSalary": 50000,
  "address": "456 Park Ave"
}

         ↓ VALIDATION
         
  • name: required, non-empty ✓
  • employeeType: valid enum ✓
  • schoolId: valid format ✓

         ↓ SERVICE LAYER
         
  • Generate employee_id
    → "E000001" (sequential)
  
  • Set default status: "active"
  
  • Prepare insert data:
    {
      "employeeId": "E000001",
      "schoolId": "school-123",
      "name": "John Doe",
      "type": "teacher",
      "email": "john@school.com",
      "phone": "9876543210",
      "subject": "Mathematics",
      "department": "Academic",
      "baseSalary": 50000,
      "address": "456 Park Ave",
      "status": "active",
      "createdAt": NOW()
    }

         ↓ DATABASE
         
  INSERT INTO employees(
    employee_id, school_id, name, type, 
    email, phone, subject, department, 
    base_salary, address, status, created_at
  ) VALUES (...)

         ↓ CACHE INVALIDATION
         
  • Delete: employees:list:school-123
  • (Will repopulate on next GET)

         ↓ RESPONSE

{
  "success": true,
  "employee": {
    "employeeId": "E000001",
    "schoolId": "school-123",
    "name": "John Doe",
    "employeeType": "teacher",
    "email": "john@school.com",
    "phone": "9876543210",
    "subject": "Mathematics",
    "department": "Academic",
    "baseSalary": 50000,
    "address": "456 Park Ave",
    "status": "active",
    "createdAt": "2026-02-23T10:30:00Z"
  }
}
```

### List Employees (with Cache)

```
GET /api/employees/school-123/employees

         ↓ CHECK REDIS
         
  Key: employees:list:school-123
  
  ✓ HIT (5ms)       → Return cached
  ✗ MISS            → Query DB

         ↓ DATABASE
         
  SELECT * FROM employees 
  WHERE school_id = 'school-123'
  ORDER BY employee_type, name
  
  Indexes: idx_employees_school_id ✓

         ↓ CACHE (30s TTL)
         
  Key: employees:list:school-123

         ↓ RESPONSE
         
{
  "success": true,
  "count": 45,
  "employees": [
    { "employeeId": "E000001", "name": "John Doe", ... },
    { "employeeId": "E000002", "name": "Jane Smith", ... },
    ...45 employees
  ]
}
```

---

## 3️⃣ ARCHITECTURE COMPARISON

### Students vs Employees

| Aspect | Students | Employees |
|--------|----------|-----------|
| **ID Pattern** | S000001 | E000001 |
| **Key Field** | rollNumber + section | employeeType |
| **Status Values** | active, inactive | active, inactive, on_leave |
| **Special Logic** | Resequence on move/delete | None |
| **Cache Key** | students:list:{schoolId} | employees:list:{schoolId} |
| **Indexes** | school_id, student_id, class_name | school_id, employee_id, employee_type |

---

## 4️⃣ DATA LAYER ARCHITECTURE

### Repository Pattern

```rust
// TRAIT (Interface)
trait StudentRepository {
    async fn add_student(school_id, data) → Result<Value>
    async fn get_students(school_id) → Result<Vec<Value>>
    async fn get_student(school_id, student_id) → Result<Option<Value>>
    async fn update_student(school_id, student_id, data) → Result<()>
    async fn delete_student(school_id, student_id) → Result<()>
}

// IMPLEMENTATION (PostgreSQL)
struct PostgresStudentRepository {
    client: Arc<DbClient>
}

impl StudentRepository for PostgresStudentRepository {
    async fn add_student(...) {
        sqlx::query("INSERT INTO students...")
            .bind(school_id)
            .bind(data)
            .execute(&self.client.pool)
    }
    ...
}
```

### Three-Layer Architecture

```
┌─────────────────────────────┐
│   ROUTE HANDLERS            │  ← HTTP Endpoints
│   (routes/students.rs)      │  ← Input Validation
└────────────┬────────────────┘
             │
┌────────────▼────────────────┐
│   SERVICES                  │  ← Business Logic
│   (services/student_)       │  ← Cache Management
│   (service.rs)              │  ← ID Generation
└────────────┬────────────────┘
             │
┌────────────▼────────────────┐
│   REPOSITORIES              │  ← Data Access
│   (repository/postgres.rs)  │  ← SQL Queries
│   (repository/traits.rs)    │  ← Interface Definition
└────────────┬────────────────┘
             │
┌────────────▼────────────────┐
│   DATABASE                  │  ← PostgreSQL
│   (migrations/)             │  ← Indexes
│   (db.rs - Connection Pool) │  ← Connection Management
└─────────────────────────────┘
```

---

## 5️⃣ REQUEST LIFECYCLE EXAMPLE

### Student Create Request Complete Flow

```
TIME    COMPONENT              ACTION                      DB OPS
────────────────────────────────────────────────────────────────
  T0    Client                 Send POST request
        
  T1    main.rs               Receive & route            
        Router matches         /api/students/...

  T2    routes/students.rs    Validate inputs            
        create_student()       ✓ className, name, etc
        
  T3    services/student_     Generate IDs              
        service.rs            • Get next roll_number    DB[1]
        create_student()       • Get student_id          DB[2]

  T4    repository/postgres   Prepare SQL query
        .rs                   INSERT students table

  T5    db.rs                 Execute via SQLx
        DbClient.pool         

  T6    PostgreSQL            Commit transaction        DB[3]
        students table        Row inserted

  T7    services/student_     Invalidate cache
        service.rs            Delete Redis key

  T8    routes/students.rs    Format response
        
  T9    Client                Receive response          3 DB ops
                              in ~150ms                 (optimized)
```

---

## 6️⃣ PERFORMANCE METRICS

### Database Query Performance

| Operation | Query | Time Before | Time After | Index |
|-----------|-------|-------------|-----------|-------|
| Create | INSERT | 50ms | 40ms | N/A |
| List All | SELECT * WHERE school_id | 800ms | 5ms (cache) | ✓ idx_students_school_id |
| Get One | SELECT * WHERE student_id | 80ms | 5ms | ✓ idx_students_student_id |
| Update | UPDATE WHERE id | 60ms | 50ms | ✓ idx_students_student_id |
| Delete | DELETE WHERE id | 70ms | 60ms | ✓ idx_students_student_id |

### Cache Performance

| Scenario | Time | Hit/Miss | Notes |
|----------|------|----------|-------|
| List (cached) | 5ms | HIT | Redis memory |
| List (uncached) | 200ms | MISS | DB query + cache write |
| List consistency | 30s | TTL | Auto-refresh |

---

## 7️⃣ ERROR HANDLING FLOW

```
REQUEST RECEIVED
    ↓
VALIDATION LAYER
    ├─ Empty inputs? → 400 Bad Request
    ├─ Invalid format? → 400 Bad Request
    └─ Valid ✓
        ↓
SERVICE LAYER
    ├─ DB not available? → 500 Internal Server Error
    ├─ Student not found? → 404 Not Found
    └─ Success ✓
        ↓
RESPONSE
    {
      "success": true,
      "data": {...}
    }
```

### Error Response Examples

```json
// Validation Error (400)
{
  "success": false,
  "message": "Student name cannot be empty"
}

// Not Found (404)
{
  "success": false,
  "message": "Student not found"
}

// Server Error (500)
{
  "success": false,
  "message": "Database connection failed"
}
```

---

## 8️⃣ CACHE INVALIDATION STRATEGY

```
WRITE OPERATION (Create/Update/Delete)
    ↓
Database Updated
    ↓
Cache Key Deleted
    Key: {resource}:list:{schoolId}
    ↓
Next READ Operation
    ↓
Cache Miss
    ↓
Database Query
    ↓
Result Cached (30s TTL)
    ↓
Subsequent READs (within 30s)
    ↓
Cache Hit ⚡
```

---

## Summary: User API Data Workflow

### Key Points:

1. **Two User Types**: Students (academic) & Employees (staff)

2. **Layers**:
   - Route → Validation
   - Service → Business Logic
   - Repository → Database
   - Cache → Performance

3. **Performance**:
   - Validation: fail fast (10ms)
   - Database: indexed lookups (5-80ms)
   - Cache: 40x faster (5ms vs 200ms)

4. **Reliability**:
   - Input validation
   - Error handling
   - Cache consistency
   - Transaction safety

5. **Scalability**:
   - Indexes for 10k+ records
   - Redis caching
   - Connection pooling
   - Async operations

Samjh gaya concept? Koi specific API detail chahiye? 🚀
