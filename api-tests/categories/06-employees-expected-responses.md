# Employee Management APIs - Expected Responses

This document outlines the expected responses for all Employee Management API endpoints tested in `06-employees.bru`.

## Authentication Requirements
All Employee Management APIs require RLS (Row Level Security) authentication with the following headers:
- `X-School-ID`: School identifier (e.g., "test-school-123")
- `X-Admin-ID`: Admin user identifier (e.g., "admin-456")

## 1. POST /api/employees/:schoolId - Create Employee

**Endpoint**: `POST {{baseUrl}}/api/employees/{{schoolId}}`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "employee": {
    "id": "emp-123456",
    "name": "Rajesh Kumar",
    "fatherName": "Suresh Kumar",
    "motherName": "Meena Devi",
    "dob": "1985-08-15",
    "age": 39,
    "gender": "male",
    "category": "general",
    "employeeType": "teacher",
    "baseSalary": 45000.00,
    "email": "rajesh.kumar@testschool.com",
    "phone": "+919876543210",
    "alternativeContact": "+919876543211",
    "permanentAddress": "123 Main Street, Delhi",
    "temporaryAddress": "456 Park Avenue, Delhi",
    "experience": 10,
    "education": "M.Sc. Mathematics",
    "aadhaarNumber": "123456789012",
    "responsibilities": ["Class 10A Mathematics", "Exam Coordinator"],
    "bankDetails": {
      "accountNumber": "1234567890",
      "bankName": "State Bank of India",
      "ifscCode": "SBIN0001234"
    },
    "profileImageUrl": "https://example.com/profile.jpg",
    "roles": ["teacher", "exam_coordinator"],
    "createdAt": "2025-03-15T10:30:00Z",
    "updatedAt": "2025-03-15T10:30:00Z",
    "schoolId": "test-school-123",
    "createdBy": "admin-456"
  }
}
```

### Error Responses
- **HTTP 400**: Invalid request data (missing required fields, invalid email format)
- **HTTP 401**: Missing or invalid authentication headers
- **HTTP 409**: Employee with same email or Aadhaar already exists
- **HTTP 500**: Server error

## 2. POST /api/employees/:schoolId/validate - Validate Employee Data

**Endpoint**: `POST {{baseUrl}}/api/employees/{{schoolId}}/validate`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "valid": true,
  "message": "Employee data is valid",
  "warnings": []
}
```

### Validation Error Response
```json
{
  "success": false,
  "valid": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email already exists in the system"
    },
    {
      "field": "phone",
      "message": "Invalid phone number format"
    }
  ]
}
```

## 3. POST /api/employees/:schoolId/bulk - Bulk Import Employees

**Endpoint**: `POST {{baseUrl}}/api/employees/{{schoolId}}/bulk`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Bulk import completed",
  "data": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "importedEmployees": [
      {
        "name": "Amit Patel",
        "email": "amit.patel@testschool.com",
        "employeeId": "emp-123457",
        "status": "created"
      },
      {
        "name": "Sunita Reddy",
        "email": "sunita.reddy@testschool.com",
        "employeeId": "emp-123458",
        "status": "created"
      },
      {
        "name": "Rahul Verma",
        "email": "rahul.verma@testschool.com",
        "employeeId": "emp-123459",
        "status": "created"
      }
    ],
    "errors": []
  }
}
```

### Partial Success Response
```json
{
  "success": true,
  "message": "Bulk import partially completed",
  "data": {
    "total": 3,
    "successful": 2,
    "failed": 1,
    "importedEmployees": [
      {
        "name": "Amit Patel",
        "email": "amit.patel@testschool.com",
        "employeeId": "emp-123457",
        "status": "created"
      },
      {
        "name": "Sunita Reddy",
        "email": "sunita.reddy@testschool.com",
        "employeeId": "emp-123458",
        "status": "created"
      }
    ],
    "errors": [
      {
        "row": 3,
        "name": "Rahul Verma",
        "error": "Email already exists in the system"
      }
    ]
  }
}
```

## 4. GET /api/employees/:schoolId - List Employees

**Endpoint**: `GET {{baseUrl}}/api/employees/{{schoolId}}`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "employees": [
    {
      "id": "emp-123456",
      "name": "Rajesh Kumar",
      "employeeType": "teacher",
      "email": "rajesh.kumar@testschool.com",
      "phone": "+919876543210",
      "baseSalary": 45000.00,
      "department": "Mathematics",
      "status": "active",
      "createdAt": "2025-03-15T10:30:00Z"
    },
    {
      "id": "emp-123457",
      "name": "Amit Patel",
      "employeeType": "teacher",
      "email": "amit.patel@testschool.com",
      "phone": "+919876543213",
      "baseSalary": 42000.00,
      "department": "Science",
      "status": "active",
      "createdAt": "2025-03-15T10:35:00Z"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

## 5. GET /api/employees/:schoolId/:employeeId - Get Employee

**Endpoint**: `GET {{baseUrl}}/api/employees/{{schoolId}}/{{employeeId}}`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "employee": {
    "id": "emp-123456",
    "name": "Rajesh Kumar",
    "fatherName": "Suresh Kumar",
    "motherName": "Meena Devi",
    "dob": "1985-08-15",
    "age": 39,
    "gender": "male",
    "category": "general",
    "employeeType": "teacher",
    "baseSalary": 45000.00,
    "email": "rajesh.kumar@testschool.com",
    "phone": "+919876543210",
    "alternativeContact": "+919876543211",
    "permanentAddress": "123 Main Street, Delhi",
    "temporaryAddress": "456 Park Avenue, Delhi",
    "experience": 10,
    "education": "M.Sc. Mathematics",
    "aadhaarNumber": "123456789012",
    "responsibilities": ["Class 10A Mathematics", "Exam Coordinator"],
    "bankDetails": {
      "accountNumber": "1234567890",
      "bankName": "State Bank of India",
      "ifscCode": "SBIN0001234"
    },
    "profileImageUrl": "https://example.com/profile.jpg",
    "roles": ["teacher", "exam_coordinator"],
    "status": "active",
    "createdAt": "2025-03-15T10:30:00Z",
    "updatedAt": "2025-03-15T10:30:00Z",
    "schoolId": "test-school-123",
    "createdBy": "admin-456",
    "attendanceStats": {
      "presentDays": 45,
      "absentDays": 2,
      "leaveDays": 3
    }
  }
}
```

### Error Response (Employee Not Found)
```json
{
  "success": false,
  "message": "Employee not found"
}
```

## 6. PUT /api/employees/:schoolId/:employeeId - Update Employee

**Endpoint**: `PUT {{baseUrl}}/api/employees/{{schoolId}}/{{employeeId}}`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "employee": {
    "id": "emp-123456",
    "name": "Rajesh Kumar Updated",
    "employeeType": "senior_teacher",
    "baseSalary": 50000.00,
    "experience": 12,
    "education": "M.Sc. Mathematics, B.Ed.",
    "responsibilities": ["Class 10A Mathematics", "Exam Coordinator", "Department Head"],
    "roles": ["senior_teacher", "exam_coordinator", "department_head"],
    "updatedAt": "2025-03-16T14:20:00Z"
  }
}
```

## 7. DELETE /api/employees/:schoolId/:employeeId - Delete Employee

**Endpoint**: `DELETE {{baseUrl}}/api/employees/{{schoolId}}/{{employeeId}}`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Employee deleted successfully",
  "employeeId": "emp-123456"
}
```

## 8. GET /api/employees/:schoolId/:employeeId/salary-breakdown - Get Salary Breakdown

**Endpoint**: `GET {{baseUrl}}/api/employees/{{schoolId}}/{{employeeId}}/salary-breakdown`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "salaryBreakdown": {
    "employeeId": "emp-123456",
    "employeeName": "Rajesh Kumar",
    "month": "2025-03",
    "baseSalary": 45000.00,
    "allowances": [
      {
        "type": "HRA",
        "amount": 9000.00,
        "percentage": 20
      },
      {
        "type": "DA",
        "amount": 6750.00,
        "percentage": 15
      },
      {
        "type": "Medical",
        "amount": 2250.00,
        "percentage": 5
      }
    ],
    "deductions": [
      {
        "type": "PF",
        "amount": 5400.00,
        "percentage": 12
      },
      {
        "type": "Professional Tax",
        "amount": 200.00,
        "fixed": true
      }
    ],
    "bonuses": [
      {
        "type": "Performance",
        "amount": 5000.00,
        "reason": "Excellent teaching performance",
        "month": "2025-02"
      }
    ],
    "totalEarnings": 63000.00,
    "totalDeductions": 5600.00,
    "netSalary": 57400.00,
    "paymentStatus": "pending",
    "payslipGenerated": false
  }
}
```

## 9. POST /api/employees/:schoolId/:employeeId/bonus - Add Bonus

**Endpoint**: `POST {{baseUrl}}/api/employees/{{schoolId}}/{{employeeId}}/bonus`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Bonus added successfully",
  "bonus": {
    "id": "bonus-789",
    "employeeId": "emp-123456",
    "amount": 5000.00,
    "reason": "Performance bonus for excellent teaching",
    "month": "2025-03",
    "description": "Awarded for outstanding student performance in board exams",
    "createdAt": "2025-03-16T15:30:00Z",
    "createdBy": "admin-456"
  }
}
```

## 10. POST /api/employees/:schoolId/:employeeId/aid - Add Financial Aid

**Endpoint**: `POST {{baseUrl}}/api/employees/{{schoolId}}/{{employeeId}}/aid`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Financial aid added successfully",
  "aid": {
    "id": "aid-456",
    "employeeId": "emp-123456",
    "amount": 10000.00,
    "reason": "Medical emergency assistance",
    "description": "Financial aid for employee's medical treatment",
    "status": "approved",
    "createdAt": "2025-03-16T16:00:00Z",
    "approvedBy": "admin-456"
  }
}
```

## 11. POST /api/employees/:schoolId/:employeeId/close-month - Auto Close Month

**Endpoint**: `POST {{baseUrl}}/api/employees/{{schoolId}}/{{employeeId}}/close-month`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Month closed successfully",
  "month": "2025-03",
  "actions": {
    "salaryProcessed": true,
    "payslipGenerated": true,
    "attendanceClosed": true,
    "bonusesApplied": true,
    "deductionsApplied": true
  },
  "summary": {
    "baseSalary": 45000.00,
    "totalAdditions": 5000.00,
    "totalDeductions": 5600.00,
    "netSalary": 44400.00,
    "payslipId": "payslip-2025-03-emp-123456"
  }
}
```

## 12. POST /api/employees/:schoolId/employees/:employeeId/salary - Set Base Salary

**Endpoint**: `POST {{baseUrl}}/api/employees/{{schoolId}}/employees/{{employeeId}}/salary`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Base salary updated successfully",
  "salaryUpdate": {
    "employeeId": "emp-123456",
    "oldSalary": 45000.00,
    "newSalary": 55000.00,
    "effectiveFrom": "2025-04-01",
    "reason": "Promotion to senior teacher",
    "updatedAt": "2025-03-16T17:00:00Z",
    "updatedBy": "admin-456"
  }
}
```

## Common Error Responses

### Authentication Error (HTTP 401)
```json
{
  "success": false,
  "message": "Unauthorized: Missing or invalid authentication headers"
}
```

### Validation Error (HTTP 400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "phone",
      "message": "Phone number must be 10 digits"
    }
  ]
}
```

### Resource Not Found (HTTP 404)
```json
{
  "success": false,
  "message": "Employee not found"
}
```

### Conflict Error (HTTP 409)
```json
{
  "success": false,
  "message": "Employee with email 'rajesh.kumar@testschool.com' already exists"
}
```

### Server Error (HTTP 500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Test Data Dependencies

For successful testing of Employee Management APIs, ensure the following test data exists:

1. **School ID**: `{{schoolId}}` (e.g., "test-school-123")
2. **Admin ID**: `{{adminId}}` (e.g., "admin-456")
3. **Employee IDs**: Created during test execution (will be stored in environment variables)
4. **Valid Aadhaar numbers**: Unique 12-digit numbers
5. **Valid email addresses**: Unique email addresses for each employee

## Testing Notes

1. **Order of Operations**: 
   - First create an employee (test 1)
   - Use the returned employee ID for subsequent tests (tests 5-12)
   - Clean up by deleting the employee (test 7) if needed

2. **Data Consistency**:
   - Email addresses must be unique across all employees
   - Aadhaar numbers must be unique
   - Phone numbers should follow Indian format (+91XXXXXXXXXX)

3. **Performance Expectations**:
   - List operations should return within 2 seconds
   - Bulk imports should handle 100+ records efficiently
   - Salary calculations should be accurate to 2 decimal places

4. **Edge Cases to Test**:
   - Creating employee with duplicate email
   - Updating non-existent employee
   - Bulk import with mixed valid/invalid data
   - Salary calculations with negative values
   - Date validation for DOB (future dates should be rejected)