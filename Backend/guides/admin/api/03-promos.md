# Promos API

Base path: `/admin`

---

## 1. List Promo Codes

```
GET /admin/promos
```

**Auth:** Required (Bearer token)

System me registered saare promo codes return karta hai.

**Headers:**
| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <base64-token>` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "WELCOME50",
      "creditAmount": "50.00",
      "freeDays": 30,
      "discountPercentage": "0.00",
      "maxUses": 100,
      "usedCount": 23,
      "expiresAt": "2026-12-31T23:59:59Z",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

**Error Responses:**

Unauthorized (401):
```json
{
  "success": false,
  "message": "Missing admin token"
}
```

**Test Case:**
```yaml
name: "List promo codes"
prerequisites:
  - Login aur token generate karein
request:
  method: GET
  url: "/admin/promos"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data: array
```

---

## 2. Create Promo Code

```
POST /admin/promos
```

**Auth:** Required (Bearer token)

Ek naya promo code create karta hai jisme optional wallet credit, free days, aur discount percentage include kiye ja sakte hain.

**Request Body:**
```json
{
  "code": "LAUNCH2026",
  "creditAmount": "100.00",
  "freeDays": 60,
  "discountPercentage": "10.00",
  "maxUses": 50,
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `code` | string | Yes | — | Unique promo code |
| `creditAmount` | string | No | `"0"` | Wallet credit amount (decimal string) |
| `freeDays` | integer | No | `0` | Free subscription days |
| `discountPercentage` | string | No | `"0.00"` | Discount percentage (decimal string) |
| `maxUses` | integer | No | `1` | Maximum number of redemptions |
| `expiresAt` | string | No | `null` | Expiry date (ISO 8601), omit karne par koi expiry nahi hogi |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "LAUNCH2026",
    "creditAmount": "100.00",
    "freeDays": 60,
    "discountPercentage": "10.00",
    "maxUses": 50,
    "usedCount": 0,
    "expiresAt": "2026-12-31T23:59:59Z",
    "isActive": true
  }
}
```

**Error Responses:**

Empty code (400):
```json
{
  "success": false,
  "message": "Promo code must not be empty"
}
```

Invalid credit amount (400):
```json
{
  "success": false,
  "message": "Invalid credit amount format"
}
```

**Test Case:**
```yaml
name: "Create promo code"
prerequisites:
  - Login aur token generate karein
request:
  method: POST
  url: "/admin/promos"
  headers:
    Authorization: "Bearer <token>"
  body:
    code: "LAUNCH2026"
    creditAmount: "100.00"
    freeDays: 60
    discountPercentage: "10.00"
    maxUses: 50
    expiresAt: "2026-12-31T23:59:59Z"
expect:
  status: 200
  body:
    success: true
    data.code: "LAUNCH2026"
```

```yaml
name: "Create promo code empty code"
request:
  method: POST
  url: "/admin/promos"
  headers:
    Authorization: "Bearer <token>"
  body:
    code: ""
    creditAmount: "100.00"
expect:
  status: 400
  body:
    success: false
    message: "Promo code must not be empty"
```

---

## 3. Get Promo Usage

```
GET /admin/promos/:promoId/usage
```

**Auth:** Required (Bearer token)

Kisi specific promo code ki usage details return karta hai, jisme yeh bhi include hota hai ki kin schools ne ise redeem kiya hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `promoId` | integer | Promo code ID |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "promoId": 1,
    "code": "LAUNCH2026",
    "totalUses": 15,
    "maxUses": 50,
    "redemptions": [
      {
        "schoolId": "school-123",
        "schoolName": "Springfield Elementary",
        "redeemedAt": "2026-03-15T10:30:00Z"
      }
    ]
  }
}
```

**Error Responses:**

Unauthorized (401):
```json
{
  "success": false,
  "message": "Missing admin token"
}
```

**Test Case:**
```yaml
name: "Get promo usage"
prerequisites:
  - Login aur token generate karein
  - ID 1 ke sath promo code create karein
request:
  method: GET
  url: "/admin/promos/1/usage"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data.promoId: 1
```

---

## 4. Apply Promo to School

```
POST /admin/schools/:schoolId/apply-promo
```

**Auth:** Required (Bearer token)

Manually ek promo code ko specific school par apply karta hai. School ko promo benefits (wallet credit, free days, discount) turant mil jate hain.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Request Body:**
```json
{
  "code": "LAUNCH2026"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "applied": true,
    "creditAmount": "100.00",
    "freeDays": 60,
    "message": "Promo code applied successfully"
  }
}
```

**Error Responses:**

Empty code (400):
```json
{
  "success": false,
  "message": "Promo code required"
}
```

Already redeemed / expired (500):
```json
{
  "success": false,
  "message": "Promo code already redeemed or expired"
}
```

**Test Case:**
```yaml
name: "Apply promo to school"
prerequisites:
  - Login aur token generate karein
  - Promo code "LAUNCH2026" create karein
  - School "school-123" exist karta hai
request:
  method: POST
  url: "/admin/schools/school-123/apply-promo"
  headers:
    Authorization: "Bearer <token>"
  body:
    code: "LAUNCH2026"
expect:
  status: 200
  body:
    success: true
    data.applied: true
```

```yaml
name: "Apply promo empty code"
request:
  method: POST
  url: "/admin/schools/school-123/apply-promo"
  headers:
    Authorization: "Bearer <token>"
  body:
    code: ""
expect:
  status: 400
  body:
    success: false
    message: "Promo code required"
```