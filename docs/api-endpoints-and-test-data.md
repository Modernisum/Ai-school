# API Endpoints and Test Data

Complete reference for creating Students, Employees, Materials, Spaces, and Responsibilities in the AI School Management System.

## Table of Contents
- [Authentication](#authentication)
- [Students](#students)
- [Employees](#employees)
- [Materials](#materials)
- [Spaces](#spaces)
- [Responsibilities](#responsibilities)

---

## Authentication

All API requests require a valid authentication token in the header:

```
Authorization: Bearer {token}
```

Base URL pattern: `/api/school/{schoolId}/[entity]`

---

## Students

### Create Student
```
POST /api/school/{schoolId}/students
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Test Data:**
```json
{
  "className": "Class 10-A",
  "name": "Rahul Kumar",
  "gender": "male",
  "dob": "2010-05-15",
  "contact": "9876543210",
  "email": "rahul@example.com",
  "fatherName": "Ramesh Kumar",
  "motherName": "Sunita Devi",
  "addressLine1": "123 Main Street",
  "addressCountryId": "1",
  "addressStateId": "1",
  "addressDistrict": "Central",
  "addressCity": "Cityville",
  "addressPincode": "123456"
}
```

### List Students
```
GET /api/school/{schoolId}/students
GET /api/school/{schoolId}/students/class/{className}?section=A
GET /api/school/{schoolId}/students/paginated?page=1&limit=20
GET /api/school/{schoolId}/students/{studentId}
```

### cURL Example
```bash
curl -X POST http://localhost:8080/api/school/schl001/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"className":"Class 10-A","name":"Rahul Kumar","gender":"male","dob":"2010-05-15","contact":"9876543210"}'
```

---

## Employees

### Create Employee
```
POST /api/school/{schoolId}/employees
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Test Data:**
```json
{
  "name": "Priya Sharma",
  "fatherName": "Rajesh Sharma",
  "motherName": "Meera Sharma",
  "dob": "1990-03-20",
  "age": 34,
  "gender": "female",
  "category": "general",
  "employeeType": "teacher",
  "baseSalary": 45000,
  "email": "priya@school.edu",
  "phone": "9876543210",
  "education": "M.Sc. Mathematics",
  "experience": "5 years"
}
```

### List Employees
```
GET /api/school/{schoolId}/employees
GET /api/school/{schoolId}/employees/{employeeId}
```

### cURL Example
```bash
curl -X POST http://localhost:8080/api/school/schl001/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Priya Sharma","employeeType":"teacher","baseSalary":45000,"dob":"1990-03-20"}'
```

---

## Materials

### Create Material
```
POST /api/school/{schoolId}/materials
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Test Data:**
```json
{
  "materialName": "Notebook A4",
  "quantity": 100,
  "unitPrice": 50.00,
  "unit": "pieces",
  "description": "Standard A4 notebooks for students"
}
```

### List Materials
```
GET /api/school/{schoolId}/materials
GET /api/school/{schoolId}/materials/search?q=notebook
GET /api/school/{schoolId}/materials/{materialName}
```

### cURL Example
```bash
curl -X POST http://localhost:8080/api/school/schl001/materials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"materialName":"Notebook A4","quantity":100,"unitPrice":50.00}'
```

---

## Spaces

### Create Space Category
First, create a space category before creating spaces under it:

```
POST /api/school/{schoolId}/spaces/categories
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Test Data:**
```json
{
  "name": "classroom",
  "isDefault": false
}
```

**Error Response (Duplicate Category):**
```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "Space category 'classroom' already exists"
}
```

### Create Space by Category
```
POST /api/school/{schoolId}/spaces/{category}
```

**Valid Categories:** Any category created via the above endpoint (e.g., `classroom`, `kitchen`, `lab`, `library`, `office`, `sports`, `cafeteria`, `auditorium`, `storage`)

**Note:** Space categories must be created first. Attempting to create a space with a non-existent category will return an error.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Test Data:**
```json
{
  "spaceName": "Room-10A"
}
```

**Error Response (Duplicate Space):**
```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "Space with name 'Room-10A' already exists"
}
```

### List Space Categories
Returns all categories that have been created for the school:
```
GET /api/school/{schoolId}/spaces/categories
```

### List Spaces
```
GET /api/school/{schoolId}/spaces
GET /api/school/{schoolId}/spaces/categories
GET /api/school/{schoolId}/spaces/details/{spaceName}
```

### cURL Examples

Create a space category:
```bash
curl -X POST http://localhost:8080/api/school/schl001/spaces/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"classroom"}'
```

Create a space under a category:
```bash
curl -X POST http://localhost:8080/api/school/schl001/spaces/classroom \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"spaceName":"Room-10A"}'
```

Create a space under a custom category (must create category first):
```bash
# Step 1: Create category "kitchen"
curl -X POST http://localhost:8080/api/school/schl001/spaces/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"kitchen"}'

# Step 2: Create space under "kitchen"
curl -X POST http://localhost:8080/api/school/schl001/spaces/kitchen \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"spaceName":"Main Kitchen"}'
```

---

## Responsibilities

### Create Responsibility
```
POST /api/school/{schoolId}/responsibilities
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Test Data:**
```json
{
  "name": "Mathematics Teacher",
  "employeeType": "teacher",
  "spaceId": "Room-10A",
  "monthlyPrice": 5000.00,
  "dailyPrice": 200.00,
  "workLevel": "High School",
  "workPeriod": "Full Day",
  "data": {
    "subject": "Mathematics",
    "grade": "10"
  }
}
```

### Assign Responsibility to Employee
```
POST /api/school/{schoolId}/responsibilities/{responsibilityId}/bulk-assign
```

**Body:**
```json
{
  "employeeIds": ["emp001", "emp002"],
  "spaceIds": ["Room-10A"]
}
```

### List Responsibilities
```
GET /api/school/{schoolId}/responsibilities?employeeType=teacher&simple=true
GET /api/school/{schoolId}/responsibilities/paginated?page=1&limit=20
GET /api/school/{schoolId}/responsibilities/{responsibilityId}
```

### cURL Example
```bash
curl -X POST http://localhost:8080/api/school/schl001/responsibilities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Class Teacher","employeeType":"teacher","spaceId":"Room-10A","monthlyPrice":5000}'
```

---

## Quick Reference Summary

| Entity | Create Endpoint | Required Fields |
|--------|----------------|-----------------|
| Student | `POST /school/{id}/students` | className, name |
| Employee | `POST /school/{id}/employees` | name, employeeType, dob |
| Material | `POST /school/{id}/materials` | materialName, quantity |
| Space | `POST /school/{id}/spaces/{cat}` | spaceName |
| Responsibility | `POST /school/{id}/responsibilities` | name, employeeType |

---

## Bulk Operations

### Bulk Import Students
```
POST /api/school/{schoolId}/students/bulk
```
Body: `{"students": [{...}, {...}]}`

### Bulk Import Employees
```
POST /api/school/{schoolId}/employees/bulk
```
Body: `{"employees": [{...}, {...}]}`

### Bulk Import Materials
```
POST /api/school/{schoolId}/materials/bulk
```
Body: `{"materials": [{...}, {...}]}`