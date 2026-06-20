# Support Request API Contract

Covers `admin::create_support_request`.

Route:

- `POST /api/auth/school/support`

Source:

- Route registration: `rust/src/domain/auth/mod.rs:22`
- Handler: `rust/src/domain/admin/support.rs:11-44`

## `POST /api/auth/school/support`

### Purpose

Allows a user to submit an onboarding, login, or school support request.

### Auth

Public according to RLS middleware: `rust/src/middleware/rls.rs:43-48`.

### Request body

Preferred school id form:

```json
{
  "schoolId": "SCH-00021",
  "description": "Onboarding failed during setup."
}
```

Preferred school name form:

```json
{
  "schoolName": "Vidhyam High School",
  "message": "Login is failing for school admin."
}
```

### Accepted field mapping

- `schoolName` or `schoolId` is used as the school identifier/name.
- `contactInfo` or `subject` is used as contact info.
- `message` or `description` is used as the support message.

### Expected success response

```json
{
  "success": true,
  "data": "Support request submitted"
}
```

### Expected error response

```json
{
  "success": false,
  "message": "schoolName (or schoolId) and message (or description) are required"
}
```

### Important rules

- Either `schoolName` or `schoolId` must be present.
- Either `message` or `description` must be present.
- Empty strings are treated as missing.
- The handler delegates to the admin support service.

### Test cases

#### TC_AUTH_SUPPORT_001 Submit support with schoolId and description

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/support`
  - Body: `{ "schoolId": "SCH-00021", "description": "Onboarding failed." }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data == "Support request submitted"`.

#### TC_AUTH_SUPPORT_002 Submit support with schoolName and message

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/support`
  - Body: `{ "schoolName": "Vidhyam High School", "message": "Login issue." }`
- Expected HTTP status: `200`

#### TC_AUTH_SUPPORT_003 Missing school field

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/support`
  - Body: `{ "description": "Onboarding failed." }`
- Expected HTTP status: `400`
- Expected response: Documented required-field error.

#### TC_AUTH_SUPPORT_004 Missing message field

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/support`
  - Body: `{ "schoolId": "SCH-00021" }`
- Expected HTTP status: `400`
