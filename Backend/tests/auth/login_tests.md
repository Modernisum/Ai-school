# Auth API Tests & Technical Documentation

This document serves as the guide for testing and running the authentication APIs of the Vidhyam School Management System.

---

## 🛠️ Issues Addressed & Improvements Made

To make the APIs robust and flexible for production, the following enhancements have been implemented:

1. **Authorization Header Fallbacks**:
   - `/api/auth/school/verify-token` and `/api/auth/school/logout` now automatically check the `Authorization: Bearer <token>` header. If the header is missing, they fall back to parsing the token from the JSON body (`{"token": "..."}`). This allows header-only requests (like in standard mobile app setups) to succeed.
2. **Device Registration Key & Role Resolving**:
   - `/api/auth/register-device` now accepts both camelCase and snake_case properties, supporting fields like `device_id`, `fcm_token`, and `device_type`.
   - If `school_id` or `user_id` are omitted in the JSON payload, the backend automatically decodes the `Authorization: Bearer <token>` header, inspects the claims, queries the database if needed, and maps the device registration to the correct user.
3. **Flexible Support Request Keys**:
   - `/api/auth/school/support` now supports flexible payloads. It accepts `schoolName`/`schoolId` for the school name, `subject`/`contactInfo` for context, and `message`/`description` for the description. This resolves compatibility issues between different frontend integration patterns.

---

## Actual Route Table

| # | Method | URL | Handler |
|---|--------|-----|---------|
| 1 | POST | `/api/auth/:userType/login` | `login_handler` |
| 2 | POST | `/api/auth/school/support` | `create_support_request` |
| 3 | POST | `/api/auth/school/verify-token` | `verify_token_handler` |
| 4 | POST | `/api/auth/school/logout` | `logout_handler` |
| 5 | POST | `/api/auth/school/set-security` | `set_security_handler` |
| 6 | POST | `/api/auth/school/verify-otp` | `verify_otp_handler` |
| 7 | POST | `/api/auth/school/forgot-password` | `forgot_password_handler` |
| 8 | POST | `/api/auth/school/change-password` | `change_password_handler` |
| 9 | POST | `/api/auth/register-device` | `register_device_handler` |

*(Storage routes are in auth domain — see [`system/storage_tests.md`](../system/storage_tests.md))*

---

## 1. School Login (valid)

Authenticates a school admin and returns a JWT token.

- **Endpoint**: `POST /api/auth/school/login`
- **Body**: `{ "schoolId": "689225", "password": "admin@123" }`
- **Expected Response**: `200 OK`

```bash
curl -s -X POST http://localhost:8080/api/auth/school/login \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"689225","password":"admin@123"}' | jq .
```

```json
{
  "success": true,
  "message": "Login successful",
  "schoolId": "689225",
  "accessToken": "eyJ...",
  "expiresIn": "1h"
}
```

---

## 2. School Login (invalid password)

- **Endpoint**: `POST /api/auth/school/login`
- **Body**: `{ "schoolId": "689225", "password": "wrong" }`
- **Expected Response**: `401 Unauthorized`

```bash
curl -s -i -X POST http://localhost:8080/api/auth/school/login \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"689225","password":"wrong"}'
```

---

## 3. School Login (rate limited)

Verifies that excessive login failures trigger the rate limiter (5 requests/minute).

- **Endpoint**: `POST /api/auth/school/login`
- **Expected Response**: `429 Too Many Requests` on the 6th attempt.

```bash
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/auth/school/login \
    -H "Content-Type: application/json" \
    -d '{"schoolId":"689225","password":"wrong"}'
done
```

---

## 4. Student Login

Performs global user verification for students using their registered phone/email identifier.

- **Endpoint**: `POST /api/auth/student/login`
- **Body**: `{ "ident": "9876543210" }`
- **Expected Response**: `200 OK` with profiles list.

```bash
curl -s -X POST http://localhost:8080/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{"ident":"9876543210"}' | jq .
```

---

## 5. Employee Login

Performs global user verification for employees using their identifier.

- **Endpoint**: `POST /api/auth/employee/login`
- **Body**: `{ "ident": "EMP001" }`
- **Expected Response**: `200 OK` with profiles list.

```bash
curl -s -X POST http://localhost:8080/api/auth/employee/login \
  -H "Content-Type: application/json" \
  -d '{"ident":"EMP001"}' | jq .
```

---

## 6. Verify Token

Checks if the provided JWT is valid and not expired. Supports both Header and Body.

- **Endpoint**: `POST /api/auth/school/verify-token`
- **Headers**: `Authorization: Bearer $TOKEN` (Recommended) OR **Body**: `{"token": "$TOKEN"}`
- **Expected Response**: `200 OK`

```bash
curl -s -X POST http://localhost:8080/api/auth/school/verify-token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
```

---

## 7. Logout

Invalidates/revokes the session token. Supports both Header and Body.

- **Endpoint**: `POST /api/auth/school/logout`
- **Headers**: `Authorization: Bearer $TOKEN` (Recommended) OR **Body**: `{"token": "$TOKEN"}`
- **Expected Response**: `200 OK`

```bash
curl -s -X POST http://localhost:8080/api/auth/school/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
```

---

## 8. Set Security Question

Sets a security question and hashes the answer for subsequent password recovery.

- **Endpoint**: `POST /api/auth/school/set-security`
- **Headers**: `Authorization: Bearer $TOKEN`
- **Body**: `{ "schoolId": "689225", "question": "What is your pet name?", "answer": "Buddy" }`
- **Expected Response**: `200 OK`

```bash
curl -s -X POST http://localhost:8080/api/auth/school/set-security \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"689225","question":"What is your pet name?","answer":"Buddy"}' | jq .
```

---

## 9. Forgot Password

Generates and returns an 8-digit temporary password if the security answer matches the stored hash.

- **Endpoint**: `POST /api/auth/school/forgot-password`
- **Body**: `{ "schoolId": "689225", "answer": "Buddy" }`
- **Expected Response**: `200 OK` with `tempPassword`.

```bash
curl -s -X POST http://localhost:8080/api/auth/school/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"689225","answer":"Buddy"}' | jq .
```

---

## 10. Change Password

Updates the password, setting `password_temp` to false.

- **Endpoint**: `POST /api/auth/school/change-password`
- **Headers**: `Authorization: Bearer $TOKEN`
- **Body**: `{ "schoolId": "689225", "oldPassword": "admin@123", "newPassword": "newPass456" }`
- **Expected Response**: `200 OK`

```bash
curl -s -X POST http://localhost:8080/api/auth/school/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"689225","oldPassword":"admin@123","newPassword":"newPass456"}' | jq .
```

---

## 11. Verify OTP

Verifies OTP against the identity token.

- **Endpoint**: `POST /api/auth/school/verify-otp`
- **Body**: `{ "idToken": "$TOKEN" }` OR `{ "otp": "$TOKEN" }`
- **Expected Response**: `200 OK`

```bash
curl -s -X POST http://localhost:8080/api/auth/school/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"idToken":"$TOKEN"}' | jq .
```

---

## 12. Register Device

Registers an FCM token for push notifications. Automatically resolves user identity (school ID and user ID) from the JWT token passed in the `Authorization` header if missing from the JSON payload.

- **Endpoint**: `POST /api/auth/register-device`
- **Headers**: `Authorization: Bearer $TOKEN`
- **Body**: `{ "device_id": "DEVICE001", "device_type": "mobile", "fcm_token": "fcm_abc123" }`
- **Expected Response**: `200 OK`

```bash
curl -s -X POST http://localhost:8080/api/auth/register-device \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"device_id":"DEVICE001","device_type":"mobile","fcm_token":"fcm_abc123"}' | jq .
```

---

## 13. Create Support Request

Creates a new support ticket. Supports flexible fields matching both legacy and newer client setups.

- **Endpoint**: `POST /api/auth/school/support`
- **Body**: `{ "schoolId": "689225", "subject": "Issue with login", "description": "Cannot login after password reset" }`
- **Expected Response**: `200 OK`

```bash
curl -s -X POST http://localhost:8080/api/auth/school/support \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"689225","subject":"Issue with login","description":"Cannot login after password reset"}' | jq .
```
