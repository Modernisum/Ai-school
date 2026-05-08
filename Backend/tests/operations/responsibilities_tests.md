# Operations API — Responsibilities Tests

## Test: List Responsibilities

- **Endpoint**: `GET /api/operations/TEST001/responsibilities`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/operations/TEST001/responsibilities \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Create Responsibility

- **Endpoint**: `POST /api/operations/TEST001/responsibilities`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/operations/TEST001/responsibilities \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Library Management",
    "description": "Manage library books and records",
    "assigned_to": "EMP001",
    "status": "active",
    "deadline": "2026-06-30"
  }' | jq .
```

---

## Test: Get Responsibility Detail

- **Endpoint**: `GET /api/operations/TEST001/responsibilities/RESP_ID`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/operations/TEST001/responsibilities/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Get Employee Responsibilities

- **Endpoint**: `GET /api/operations/TEST001/employees/EMP001/responsibilities`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/operations/TEST001/employees/EMP001/responsibilities \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Bulk Assign Responsibilities

- **Endpoint**: `POST /api/operations/TEST001/responsibilities/bulk-assign`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/operations/TEST001/responsibilities/bulk-assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "responsibility_id": 1,
    "employee_ids": ["EMP001","EMP002","EMP003"]
  }' | jq .
```

---

## Test: Get Responsibility Analytics

- **Endpoint**: `GET /api/operations/TEST001/responsibilities/RESP_ID/analytics`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/operations/TEST001/responsibilities/1/analytics \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Get Utilization Metrics

- **Endpoint**: `GET /api/operations/TEST001/metrics/utilization?responsibility_id=1`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/operations/TEST001/metrics/utilization?responsibility_id=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Get Workload Metrics

- **Endpoint**: `GET /api/operations/TEST001/metrics/workload?employee_id=EMP001`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/operations/TEST001/metrics/workload?employee_id=EMP001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: List Complaints

- **Endpoint**: `GET /api/operations/TEST001/complaints`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/operations/TEST001/complaints \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Create Complaint

- **Endpoint**: `POST /api/operations/TEST001/complaints`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/operations/TEST001/complaints \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "EMP001",
    "user_role": "teacher",
    "subject": "AC not working",
    "description": "Classroom 101 AC broken since Monday",
    "priority": "medium"
  }' | jq .
```
