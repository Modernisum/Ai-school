# Login API Contract

Covers `auth::login_handler` and `auth::school_login_handler`.

Routes:

- `POST /api/auth/:userType/login`
- `POST /api/auth/school/login`

Source:

- Route registration: `rust/src/domain/auth/mod.rs:19-20`
- Handler: `rust/src/domain/auth/auth.rs:37-96`
- School login alias: `rust/src/domain/auth/auth.rs:98-102`
- Request model: `rust/src/models/auth.rs:4-11`
- Response model: `rust/src/models/auth.rs:13-30`

## `POST /api/auth/:userType/login`

### Purpose

Authenticate a student, employee, school admin, or school and return a bearer token.

### Auth

Public. No bearer token required.

### Path params

- `userType` (string, required): `student`, `employee`, `schooladmin`, or `school`.

### Request body for `student` / `employee`

```json
{
  "ident": "9876543210"
}
```

### Request body for `schooladmin` / `school`

```json
{
  "schoolId": "SCH-00021",
  "password": "mySecurePassword"
}
```

### Expected success response for student or employee

```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "jwt_token",
  "expiresIn": "<maxHours>h",
  "profiles": [
    {
      "schoolId": "SCH-00021",
      "userId": "STD-99882",
      "userType": "student",
      "name": "Jane Doe"
    }
  ]
}
```

### Expected success response for school admin or school

```json
{
  "success": true,
  "message": "Login successful",
  "schoolId": "SCH-00021",
  "schoolName": "Vidhyam High School",
  "accessToken": "jwt_token",
  "expiresIn": "1h"
}
```

### Expected error responses

Missing `ident`:

```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "Missing ident (phone/email)"
}
```

Missing `school_id`:

```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "Missing school_id"
}
```

Missing `password`:

```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "Missing password"
}
```

Invalid user type:

```json
{
  "success": false,
  "error_code": "NOT_FOUND",
  "message": "Invalid user type in login route."
}
```

Invalid credentials:

```json
{
  "success": false,
  "error_code": "UNAUTHORIZED",
  "message": "Invalid credentials"
}
```

### Important rules

- `student` and `employee` flows use `ident` only.
- `schooladmin` and `school` flows use `schoolId` and `password`.
- The student/employee token expires based on the maximum `session_duration_hours` across matched schools.
- If no school duration is found, `login_global` defaults to `24h`.
- The school admin token expires after 1 hour.
- The school name is read from the `schools` table by `schoolId`.
- School login checks billing/wallet status before issuing a token.

### Test cases

#### TC_AUTH_LOGIN_001 Student login happy path

- Type: positive
- Preconditions: A student profile exists for `ident = 9876543210`.
- Request:
  - Method: `POST`
  - Route: `/api/auth/student/login`
  - Body: `{ "ident": "9876543210" }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `accessToken` is a non-empty string, `expiresIn` is a non-empty string, `profiles` is a non-empty array.
- Database/state assertion: A user activity login log is created.

#### TC_AUTH_LOGIN_002 Employee login happy path

- Type: positive
- Preconditions: An employee profile exists for `ident = 9876543211`.
- Request:
  - Method: `POST`
  - Route: `/api/auth/employee/login`
  - Body: `{ "ident": "9876543211" }`
- Expected HTTP status: `200`
- Expected response: `profiles` contains employee profiles only.

#### TC_AUTH_LOGIN_003 School login happy path

- Type: positive
- Preconditions: School `SCH-00021` exists and password is correct.
- Request:
  - Method: `POST`
  - Route: `/api/auth/schooladmin/login`
  - Body: `{ "schoolId": "SCH-00021", "password": "mySecurePassword" }`
- Expected HTTP status: `200`
- Expected response: `schoolId`, `schoolName`, `accessToken`, and `expiresIn = "1h"` are present.

#### TC_AUTH_LOGIN_004 School login alias

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/login`
  - Body: `{ "schoolId": "SCH-00021", "password": "mySecurePassword" }`
- Expected HTTP status: `200`
- Expected response: Same as school admin login.

#### TC_AUTH_LOGIN_005 Missing ident

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/student/login`
  - Body: `{}`
- Expected HTTP status: `400`
- Expected response: `message == "Missing ident (phone/email)"`.

#### TC_AUTH_LOGIN_006 Missing school_id

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/schooladmin/login`
  - Body: `{ "password": "mySecurePassword" }`
- Expected HTTP status: `400`
- Expected response: `message == "Missing school_id"`.

#### TC_AUTH_LOGIN_007 Missing password

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/schooladmin/login`
  - Body: `{ "schoolId": "SCH-00021" }`
- Expected HTTP status: `400`
- Expected response: `message == "Missing password"`.

#### TC_AUTH_LOGIN_008 Invalid userType

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/unknown/login`
  - Body: `{ "ident": "9876543210" }`
- Expected HTTP status: `404`
- Expected response: `message == "Invalid user type in login route."`.

#### TC_AUTH_LOGIN_009 Invalid credentials

- Type: negative
- Preconditions: School exists.
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/login`
  - Body: `{ "schoolId": "SCH-00021", "password": "wrong" }`
- Expected HTTP status: `401`
- Expected response: `message == "Invalid credentials"`.

#### TC_AUTH_LOGIN_010 Identifier has no profile for selected app type

- Type: negative
- Preconditions: Identifier exists but has no `student` profile.
- Request:
  - Method: `POST`
  - Route: `/api/auth/student/login`
  - Body: `{ "ident": "9876543210" }`
- Expected HTTP status: `403`
- Expected response: Message explains that the number does not have a student profile.

## `POST /api/auth/school/login`

### Purpose

Alias for school login. It calls the same login logic as `schooladmin`/`school`.

### Request

```json
{
  "schoolId": "SCH-00021",
  "password": "mySecurePassword"
}
```

### Expected success response

```json
{
  "success": true,
  "message": "Login successful",
  "schoolId": "SCH-00021",
  "schoolName": "Vidhyam High School",
  "accessToken": "jwt_token",
  "expiresIn": "1h"
}
```

### Test cases

- `TC_AUTH_LOGIN_004`
- `TC_AUTH_LOGIN_009`
