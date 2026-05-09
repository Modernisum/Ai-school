# Auth API Tests

## Test: School Login (valid)

- **Endpoint**: `POST /api/auth/school/login`
- **Body**: `{ "schoolId": "689225", "password": "admin@123" }`
- **Expected**: 200, `success: true`, `token` present

```bash
curl -s -X POST http://localhost:8080/api/auth/school/login \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"689225","password":"admin@123"}' | jq .
```

```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "schoolId": "689225",
    "schoolName": "Test School"
  }
}
```

---

## Test: School Login (invalid password)

- **Endpoint**: `POST /api/auth/school/login`
- **Body**: `{ "schoolId": "689225", "password": "wrong" }`
- **Expected**: 401, `success: false`

```bash
curl -s -X POST http://localhost:8080/api/auth/school/login \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"689225","password":"wrong"}' | jq .
```

---

## Test: School Login (rate limited)

- **Endpoint**: `POST /api/auth/school/login`
- **Body**: `{ "schoolId": "689225", "password": "wrong" }` (6 rapid requests)
- **Expected**: 429 on 6th request

```bash
for i in {1..6}; do
  echo "Request $i:"
  curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/auth/school/login \
    -H "Content-Type: application/json" \
    -d '{"schoolId":"689225","password":"wrong"}'
  echo ""
done
```

---

## Test: Student Login

- **Endpoint**: `POST /api/auth/student/login`
- **Body**: `{ "ident": "9876543210" }`
- **Expected**: 200, `profiles` list

```bash
curl -s -X POST http://localhost:8080/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{"ident":"9876543210"}' | jq .
```

---

## Test: Employee Login

- **Endpoint**: `POST /api/auth/employee/login`
- **Body**: `{ "ident": "EMP001" }`
- **Expected**: 200, `profiles` list

```bash
curl -s -X POST http://localhost:8080/api/auth/employee/login \
  -H "Content-Type: application/json" \
  -d '{"ident":"EMP001"}' | jq .
```

---

## Test: Token Refresh

- **Endpoint**: `POST /api/auth/refresh`
- **Headers**: `Authorization: Bearer $TOKEN`
- **Expected**: 200, new token

```bash
curl -s -X POST http://localhost:8080/api/auth/refresh \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
```

---

## Test: Token Refresh (expired token)

- **Endpoint**: `POST /api/auth/refresh`
- **Headers**: `Authorization: Bearer invalid_token`
- **Expected**: 401

```bash
curl -s -X POST http://localhost:8080/api/auth/refresh \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json" | jq .
```

---

## Test: Forgot Password

- **Endpoint**: `POST /api/auth/school/forgot-password`
- **Body**: `{ "schoolId": "689225" }`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/auth/school/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"689225"}' | jq .
```

---

## Test: Change Password

- **Endpoint**: `POST /api/auth/school/change-password`
- **Headers**: `Authorization: Bearer $TOKEN`
- **Body**: `{ "oldPassword": "admin@123", "newPassword": "newPass456" }`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/auth/school/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"oldPassword":"admin@123","newPassword":"newPass456"}' | jq .
```

---

## Test: Verify OTP

- **Endpoint**: `POST /api/auth/school/verify-otp`
- **Body**: `{ "schoolId": "689225", "otp": "123456" }`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/auth/school/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"689225","otp":"123456"}' | jq .
```
