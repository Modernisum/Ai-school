# Authentication APIs - Expected Responses

This document outlines the expected responses for each authentication API endpoint.

## 1. POST /api/auth/:userType/login - User Login

**Endpoint:** `/api/auth/student/login`, `/api/auth/employee/login`, `/api/auth/schooladmin/login`, `/api/auth/school/login`

**Expected Response:**
- **Status Code:** 200 OK on success, 401 Unauthorized on invalid credentials
- **Content-Type:** application/json
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "school_id": "SCH001",
  "password_temp": null,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": "1h",
  "profiles": null
}
```

**Validation Criteria:**
- `success` should be `true` for valid credentials
- `access_token` should be a non-empty JWT string
- `school_id` should match the authenticated school
- Status code 401 for invalid credentials with `success: false`

## 2. POST /api/auth/school/verify-token - Verify Token

**Expected Response:**
- **Status Code:** 200 OK for valid token, 401 Unauthorized for invalid/expired token
- **Content-Type:** application/json
- **Response Body Structure (Valid Token):**
```json
{
  "success": true,
  "message": "Token is valid",
  "school_id": "SCH001",
  "user_type": "school-admin",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

**Validation Criteria:**
- `success` should be `true` for valid tokens
- Should return school_id and user_type from token payload
- Invalid tokens should return 401 with `success: false`

## 3. POST /api/auth/school/logout - Logout

**Expected Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Validation Criteria:**
- Should invalidate the provided token
- Should return success confirmation

## 4. POST /api/auth/school/set-security - Set Security Question

**Expected Response:**
- **Status Code:** 200 OK on success, 400 Bad Request for invalid data
- **Content-Type:** application/json
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "message": "Security question set successfully"
}
```

**Validation Criteria:**
- Should require school_id in headers
- Should store security question and hashed answer
- Should return success confirmation

## 5. POST /api/auth/school/verify-otp - Verify OTP

**Expected Response:**
- **Status Code:** 200 OK for valid OTP, 400 Bad Request for invalid/expired OTP
- **Content-Type:** application/json
- **Response Body Structure (Valid OTP):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "temporary_token": "temp_token_abc123"
}
```

**Validation Criteria:**
- Valid OTP should return temporary token for password reset
- Invalid OTP should return error message

## 6. POST /api/auth/school/forgot-password - Forgot Password

**Expected Response:**
- **Status Code:** 200 OK on success, 400 Bad Request for incorrect security answer
- **Content-Type:** application/json
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "message": "OTP sent to registered email/phone",
  "otp_id": "otp_123456"
}
```

**Validation Criteria:**
- Should validate security answer
- Should generate and send OTP
- Should return OTP reference ID

## 7. POST /api/auth/school/change-password - Change Password

**Expected Response:**
- **Status Code:** 200 OK on success, 400 Bad Request for invalid old password
- **Content-Type:** application/json
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Validation Criteria:**
- Should verify old password matches
- Should hash and store new password
- Should invalidate existing sessions if required

## 8. POST /api/auth/register-device - Register Device for Push Notifications

**Expected Response:**
- **Status Code:** 200 OK on success, 400 Bad Request for invalid data
- **Content-Type:** application/json
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "device_id": "device_abc123"
}
```

**Validation Criteria:**
- Should store device token for user/school
- Should support multiple platforms (android, ios, web)
- Should return device registration ID

## 9. POST /api/auth/school/support - Create Support Request

**Expected Response:**
- **Status Code:** 200 OK on success, 400 Bad Request for missing fields
- **Content-Type:** application/json
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "message": "Support request created successfully",
  "request_id": "SRQ_123456",
  "priority": "high"
}
```

**Validation Criteria:**
- Should require school_id, subject, description, priority
- Should create support ticket in system
- Should return request ID for tracking

## Common Error Responses

All endpoints may return the following error responses:

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Missing required fields: school_id, password"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error"
}