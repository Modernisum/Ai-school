# School Self-Management APIs - Expected Responses

This document outlines the expected responses for school self-management API endpoints.

## 1. GET /api/school/:schoolId/details - Get School Details

**Expected Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Response Body Structure:**
```json
{
  "success": true,
  "data": {
    "school_id": "SCH001",
    "name": "Test School",
    "address": "123 Test Street",
    "phone": "9876543210",
    "email": "test@school.com",
    "principal_name": "Test Principal",
    "established_year": 2000,
    "school_type": "private",
    "board": "CBSE",
    "medium": "english",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Validation Criteria:**
- Should return school details for authenticated school
- Should respect RLS (only return data for the school in the token)
- Should include basic school information

## 2. PUT /api/school/:schoolId - Update School Self

**Expected Response:**
- **Status Code:** 200 OK on success, 400 Bad Request for invalid data
- **Content-Type:** application/json
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "message": "School updated successfully",
  "updated_fields": ["name", "address", "phone"]
}
```

**Validation Criteria:**
- Should update only allowed fields (name, address, phone, email, principal_name, established_year)
- Should not allow updating sensitive fields like school_id, status
- Should return list of updated fields
- Should validate phone/email format

## 3. PATCH /api/school/:schoolId/password - Change Password Self

**Expected Response:**
- **Status Code:** 200 OK on success, 400 Bad Request for invalid password
- **Content-Type:** application/json
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Validation Criteria:**
- Should verify newPassword and confirmPassword match
- Should enforce password strength rules
- Should update password hash in database
- Should optionally invalidate existing sessions

## Common Error Responses

**401 Unauthorized (Missing/Invalid Headers):**
```json
{
  "success": false,
  "message": "Unauthorized: School ID or Admin ID missing/invalid"
}
```

**403 Forbidden (RLS Violation):**
```json
{
  "success": false,
  "message": "Forbidden: You can only access your own school data"
}
```

**400 Bad Request (Validation Error):**
```json
{
  "success": false,
  "message": "Validation error: Phone number must be 10 digits",
  "errors": {
    "phone": ["must be 10 digits"]
  }
}
```

**404 Not Found (School Not Found):**
```json
{
  "success": false,
  "message": "School not found"
}
```

## Data Validation Rules

1. **Phone Number:** Must be 10 digits, valid Indian mobile number
2. **Email:** Must be valid email format
3. **School Name:** 3-100 characters, no special symbols
4. **Address:** 10-500 characters
5. **Principal Name:** 3-100 characters, letters and spaces only
6. **Established Year:** 1900-current year
7. **Password:** Minimum 8 characters, at least one uppercase, one lowercase, one number