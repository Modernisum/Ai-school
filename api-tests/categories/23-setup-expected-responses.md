# Setup & Configuration APIs - Expected Responses

This document outlines the expected responses for school setup and configuration API endpoints.

## 1. GET /api/setup/:schoolId - Get Setup Details

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
    "setup_status": "completed",
    "setup_steps": [
      {
        "step": "school_info",
        "status": "completed",
        "completed_at": "2024-01-01T10:00:00Z"
      },
      {
        "step": "admin_creation",
        "status": "completed",
        "completed_at": "2024-01-01T10:05:00Z"
      },
      {
        "step": "classes_subjects",
        "status": "pending",
        "completed_at": null
      },
      {
        "step": "initial_data",
        "status": "pending",
        "completed_at": null
      }
    ],
    "completed_at": "2024-01-01T10:05:00Z",
    "next_step": "classes_subjects",
    "progress_percentage": 50
  }
}
```

**Validation Criteria:**
- Should return setup status and progress
- Should list all setup steps with completion status
- Should calculate progress percentage
- Should indicate next required step

## 2. POST /api/setup/school - Setup New School

**Expected Response:**
- **Status Code:** 201 Created on success, 400 Bad Request for invalid data
- **Content-Type:** application/json
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "message": "School setup completed successfully",
  "school_id": "SCH002",
  "school_code": "SCH002-2024",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin_credentials": {
    "admin_id": "ADM002",
    "temp_password": "admin123",
    "email": "admin@newschool.com"
  },
  "setup_summary": {
    "classes_created": 5,
    "subjects_created": 3,
    "admin_created": true,
    "initial_data_imported": false
  }
}
```

**Validation Criteria:**
- Should create school record with unique school_id
- Should generate school code based on pattern
- Should create admin user with temporary password
- Should create default classes and subjects if provided
- Should automatically log in and return access token
- Should return setup summary with counts

## Setup Validation Rules

### Required Fields for School Setup:
1. **Basic School Info:**
   - `name`: School name (3-100 chars)
   - `address`: Physical address (10-500 chars)
   - `phone`: 10-digit mobile number
   - `email`: Valid email address
   - `principal_name`: Principal's full name
   - `established_year`: 1900-current year

2. **School Configuration:**
   - `school_type`: "private", "government", "aided"
   - `board`: "CBSE", "ICSE", "State Board"
   - `medium`: "english", "hindi", "regional"
   - `password`: School admin password (min 8 chars)

3. **Academic Structure (Optional but recommended):**
   - `classes`: Array of class names/numbers ["1", "2", "3", "4", "5"]
   - `subjects`: Array of subject names ["Math", "Science", "English"]

4. **Admin Details (Optional):**
   - `admin_name`: Admin user's name
   - `admin_email`: Admin email (defaults to school email)
   - `admin_phone`: Admin phone (defaults to school phone)

## Common Error Responses

**400 Bad Request (Validation Error):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "phone": ["must be 10 digits"],
    "email": ["must be valid email address"],
    "password": ["must be at least 8 characters"]
  }
}
```

**409 Conflict (Duplicate School):**
```json
{
  "success": false,
  "message": "School with this name or email already exists"
}
```

**500 Internal Server Error (Setup Failure):**
```json
{
  "success": false,
  "message": "School setup failed: Database error",
  "rollback_performed": true
}
```

## Setup Process Flow

1. **Validate Input** - Check all required fields and formats
2. **Generate School ID** - Create unique school identifier
3. **Create School Record** - Insert into schools table
4. **Create Admin User** - Generate admin credentials
5. **Create Classes/Subjects** - If provided in request
6. **Set RLS Policies** - Configure row-level security
7. **Generate Access Token** - For immediate login
8. **Return Success Response** - With all created entities

## Post-Setup Requirements

After successful setup, the system expects:
- Admin to change temporary password on first login
- Completion of remaining setup steps via dashboard
- Import of students, employees, and other initial data
- Configuration of fee structure, timetable, etc.