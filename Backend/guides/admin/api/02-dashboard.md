# Dashboard API

Base path: `/admin`

---

## 1. Get Dashboard Stats

```
GET /admin/stats
```

**Auth:** Required (Bearer token)

Aggregated global statistics return karta hai: total schools, students, teachers, wallet balance, aur pichle 12 months ka monthly school registration data.

**Headers:**
| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <base64-token>` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "totals": {
      "schools": 150,
      "students": 12000,
      "teachers": 800,
      "wallet": "250000.50"
    },
    "registrations": [
      { "month": "2025-07", "count": 12 },
      { "month": "2025-08", "count": 18 },
      { "month": "2025-09", "count": 15 }
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

Server error (500):
```json
{
  "success": false,
  "message": "<error details>"
}
```

**Test Case:**
```yaml
name: "Get dashboard stats"
prerequisites:
  - Login aur token generate karein
request:
  method: GET
  url: "/admin/stats"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data.totals.schools: number
    data.totals.students: number
    data.totals.teachers: number
    data.totals.wallet: string
    data.registrations: array
```

```yaml
name: "Get dashboard stats without token"
request:
  method: GET
  url: "/admin/stats"
expect:
  status: 401
  body:
    success: false
```

---

## 2. Get Advanced Stats

```
GET /admin/stats/advanced
```

**Auth:** Required (Bearer token)

AdminService::get_admin_stats() method ke throw detailed analytics return karta hai. Exact shape service implementation par depend karta hai — isme typically school-level breakdowns, usage metrics, aur financial data hota hai.

**Headers:**
| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <base64-token>` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "activeSchools": 140,
    "blockedSchools": 5,
    "inactiveSchools": 5,
    "totalRevenue": "500000.00",
    "monthlyActiveUsers": 9500,
    "storageUsed": "45.2 GB"
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
name: "Get advanced stats"
prerequisites:
  - Login aur token generate karein
request:
  method: GET
  url: "/admin/stats/advanced"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data: object
```

---

## 3. Get Churn Radar

```
GET /admin/churn-radar
```

**Auth:** Required (Bearer token)

Saare schools ke liye churn risk signals return karta hai — isme activity patterns, wallet balance, aur usage metrics ke basis par un schools ko identify kiya jata hai jo churning ke risk par hain.

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
      "schoolId": "school-456",
      "schoolName": "St. Mary's Academy",
      "riskLevel": "high",
      "lastActive": "2026-05-01T00:00:00Z",
      "daysSinceLastActive": 51,
      "walletBalance": "15.00",
      "activeStudents": 2
    },
    {
      "schoolId": "school-789",
      "schoolName": "Greenfield High",
      "riskLevel": "medium",
      "lastActive": "2026-06-10T00:00:00Z",
      "daysSinceLastActive": 11,
      "walletBalance": "120.00",
      "activeStudents": 45
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
name: "Get churn radar"
prerequisites:
  - Login aur token generate karein
request:
  method: GET
  url: "/admin/churn-radar"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data: array
```