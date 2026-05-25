# Finance API — Payroll Tests

Payroll endpoints are managed under the `people` module (associated with employees). All routes are nested under `/api/school/{schoolId}/people/`.

---

## Actual Route Table

| # | Endpoint | Method | Description |
|---|----------|--------|-------------|
| 1 | `/api/school/:schoolId/people/employees/:employeeId/salary` | POST | Set base salary parameters |
| 2 | `/api/school/:schoolId/people/employees/:employeeId/bonus` | POST | Add a bonus to the current month's salary |
| 3 | `/api/school/:schoolId/people/employees/:employeeId/aid` | POST | Add financial aid/allowance to the salary |
| 4 | `/api/school/:schoolId/people/employees/:employeeId/salary-breakdown` | GET | Retrieve a comprehensive monthly salary breakdown |
| 5 | `/api/school/:schoolId/people/employees/:employeeId/pay` | POST | Record a salary or advance payment |
| 6 | `/api/school/:schoolId/people/employees/:employeeId/close-month` | POST | Close the monthly payroll ledger for an employee |

---

## Test: Set Base Salary

- **Endpoint**: `POST /api/school/689225/people/employees/E0005/salary`
- **Response Code**: `200 OK`

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/people/employees/E0005/salary" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "base_salary": 50000.00
  }'
```

### JSON Response
```json
{
  "message": "Salary parameters updated",
  "success": true
}
```

---

## Test: Add Bonus

- **Endpoint**: `POST /api/school/689225/people/employees/E0005/bonus`
- **Response Code**: `200 OK`

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/people/employees/E0005/bonus" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Exemplary curriculum design",
    "amount": 3500.00
  }'
```

### JSON Response
```json
{
  "data": {
    "newBonus": 3500.0
  },
  "success": true
}
```

---

## Test: Add Aid

- **Endpoint**: `POST /api/school/689225/people/employees/E0005/aid`
- **Response Code**: `200 OK`

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/people/employees/E0005/aid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Medical aid allowance",
    "amount": 1500.00
  }'
```

### JSON Response
```json
{
  "data": {
    "newAid": 1500.0
  },
  "success": true
}
```

---

## Test: Get Salary Breakdown

- **Endpoint**: `GET /api/school/689225/people/employees/E0005/salary-breakdown`
- **Response Code**: `200 OK`

```bash
curl -s "http://localhost:8080/api/school/689225/people/employees/E0005/salary-breakdown" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225"
```

### JSON Response
```json
{
  "data": {
    "absentDays": 0.0,
    "aid": 1500.0,
    "baseSalary": 0.0,
    "bonus": 3500.0,
    "deductions": 0.0,
    "experienceComponent": 0.0,
    "experienceIncrement": 0.0,
    "experienceIncrementPercent": 0.0,
    "grossSalary": 9000.0,
    "netMonthlySalary": 9000.0,
    "spacesComponent": 4000.0,
    "tenureComponent": 0.0
  },
  "success": true
}
```

---

## Test: Record Employee Salary Payment

- **Endpoint**: `POST /api/school/689225/people/employees/E0005/pay`
- **Response Code**: `200 OK`

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/people/employees/E0005/pay" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "salary",
    "salaryId": "SAL_2026_05",
    "month": "2026-05",
    "amount": 55000.00,
    "status": "paid"
  }'
```

### JSON Response
```json
{
  "data": {
    "amount": 55000,
    "month": "2026-05",
    "salaryId": "SAL_2026_05",
    "status": "paid",
    "type": "salary"
  },
  "success": true
}
```

---

## Test: Close Month

- **Endpoint**: `POST /api/school/689225/people/employees/E0005/close-month`
- **Response Code**: `200 OK`

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/people/employees/E0005/close-month" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225"
```

### JSON Response
```json
{
  "message": "Month closed successfully",
  "success": true
}
```
