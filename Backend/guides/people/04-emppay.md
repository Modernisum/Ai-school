# Employee Payroll API Contract

Covers `emppay::set_base_salary`, `emppay::get_salary_breakdown`, `emppay::add_bonus`, `emppay::add_aid`, `emppay::auto_close_month`, `emppay::record_salary_payment`.

All routes are nested under:
- **New:** `/api/school/:schoolId/people/employees/:employeeId/...`
- **Legacy:** `/api/employees/:schoolId/:employeeId/...`

---

## `POST /api/school/:schoolId/people/employees/:employeeId/salary`

- Handler: `rust/src/domain/people/emppay.rs::set_base_salary`
- Purpose: Set or update the base salary parameters for an employee's contract.
- Auth/Tenant: Requires `TenantContext`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `employeeId`: employee identifier.

Body:

```json
{
  "baseSalary": 48000.0
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Salary parameters updated"
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<service error>"
}
```

### Test cases

#### Set base salary for existing employee

- Type: positive
- Preconditions: Employee `EMP-00281` exists in `SCH-001`.
- Request: `POST /api/school/SCH-001/people/employees/EMP-00281/salary`
- Body: `{ "baseSalary": 48000.0 }`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "message": "Salary parameters updated" }`
- Database/state assertion: Employee's base salary is updated.

#### Set salary for non-existent employee

- Type: negative
- Request: `POST /api/school/SCH-001/people/employees/NONEXIST/salary`
- Expected HTTP status: `500`
- Expected response: `{ "success": false, "message": "<error>" }`

#### Set negative salary

- Type: boundary
- Body: `{ "baseSalary": -1000.0 }`
- Expected HTTP status: `500` (or `200` if service layer doesn't validate)
- Expected response: `{ "success": false, "message": "<validation error>" }` or `{ "success": true }`

---

## `GET /api/school/:schoolId/people/employees/:employeeId/salary-breakdown`

- Handler: `rust/src/domain/people/emppay.rs::get_salary_breakdown`
- Purpose: Get the monthly salary breakdown including base salary, pending bonuses, pending allowances, and closed paycheck history.
- Auth/Tenant: Uses `schoolId` and `employeeId` path values.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "employeeId": "EMP-00281",
    "baseSalary": 45000.0,
    "pendingBonus": 0.0,
    "pendingAid": 0.0,
    "closedPaychecks": [
      {
        "paycheckId": "PCK-001",
        "month": 5,
        "year": 2026,
        "baseSalary": 45000.0,
        "bonuses": 5000.0,
        "allowances": 1200.0,
        "deductions": 500.0,
        "netPay": 50700.0,
        "status": "paid"
      }
    ]
  }
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<service error>"
}
```

### Test cases

#### Get breakdown for employee with history

- Type: positive
- Preconditions: Employee has closed paychecks.
- Request: `GET /api/school/SCH-001/people/employees/EMP-00281/salary-breakdown`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": { "closedPaychecks": [...], ... } }`

#### Get breakdown for employee with no history

- Type: positive
- Preconditions: Employee has no closed paychecks, no pending bonuses/aid.
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": { "pendingBonus": 0.0, "pendingAid": 0.0, "closedPaychecks": [] } }`

#### Get breakdown for non-existent employee

- Type: negative
- Request: `GET /api/school/SCH-001/people/employees/NONEXIST/salary-breakdown`
- Expected HTTP status: `500`
- Expected response: `{ "success": false, "message": "<error>" }`

---

## `POST /api/school/:schoolId/people/employees/:employeeId/bonus`

- Handler: `rust/src/domain/people/emppay.rs::add_bonus`
- Purpose: Add a bonus amount to the employee's pending paycheck ledger.
- Auth/Tenant: Requires `TenantContext`.

### Request

Body:

```json
{
  "amount": 5000.0,
  "reason": "Exemplary curriculum coverage performance"
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "bonusId": "BON-001",
    "amount": 5000.0,
    "reason": "Exemplary curriculum coverage performance"
  }
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<service error>"
}
```

### Important rules

- Paycheck adjustment APIs (Bonus, Aid) should verify that the ledger status for the month is NOT already set to `closed` or `paid` before editing balances.

### Test cases

#### Add bonus to active employee

- Type: positive
- Preconditions: Employee `EMP-00281` exists, no closed paycheck for current month.
- Request: `POST /api/school/SCH-001/people/employees/EMP-00281/bonus`
- Body: `{ "amount": 5000.0, "reason": "Performance bonus" }`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": { "amount": 5000.0, ... } }`

#### Add bonus when month already closed

- Type: negative
- Preconditions: Current month's paycheck already closed.
- Expected HTTP status: `500`
- Expected response: `{ "success": false, "message": "<closed month error>" }`

#### Add zero bonus

- Type: boundary
- Body: `{ "amount": 0.0, "reason": "No bonus" }`
- Expected HTTP status: `200` or `500` depending on service validation.

---

## `POST /api/school/:schoolId/people/employees/:employeeId/aid`

- Handler: `rust/src/domain/people/emppay.rs::add_aid`
- Purpose: Add a financial allowance/aid to the employee's pending paycheck ledger.
- Auth/Tenant: Requires `TenantContext`.

### Request

Body:

```json
{
  "amount": 1200.0,
  "reason": "Travel reimbursement allowance"
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "aidId": "AID-001",
    "amount": 1200.0,
    "reason": "Travel reimbursement allowance"
  }
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<service error>"
}
```

### Test cases

#### Add aid to active employee

- Type: positive
- Preconditions: Employee `EMP-00281` exists, no closed paycheck for current month.
- Request: `POST /api/school/SCH-001/people/employees/EMP-00281/aid`
- Body: `{ "amount": 1200.0, "reason": "Travel reimbursement" }`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": { "amount": 1200.0, ... } }`

#### Add aid when month already closed

- Type: negative
- Preconditions: Current month's paycheck already closed.
- Expected HTTP status: `500`
- Expected response: `{ "success": false, "message": "<closed month error>" }`

---

## `POST /api/school/:schoolId/people/employees/:employeeId/close-month`

- Handler: `rust/src/domain/people/emppay.rs::auto_close_month`
- Purpose: Close the monthly payroll ledger for the employee. Locks paycheck values and prepares data for bank transfers.
- Auth/Tenant: Requires `TenantContext`.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Month closed successfully"
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<service error>"
}
```

### Important rules

- The service calculates: `netPay = baseSalary + bonuses + allowances - deductions`.
- After closing, no further bonuses/aid can be added for that month.

### Test cases

#### Close month with pending bonuses and aid

- Type: positive
- Preconditions: Employee has `5000` bonus and `1200` aid pending. Base salary is `45000`.
- Request: `POST /api/school/SCH-001/people/employees/EMP-00281/close-month`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "message": "Month closed successfully" }`
- Database/state assertion: Paycheck is created with `netPay = 51200`, `status = "closed"`.

#### Close month that is already closed

- Type: idempotency
- Preconditions: Month already closed.
- Expected HTTP status: `500` (or `200` if idempotent)
- Expected response: `{ "success": false, "message": "<already closed error>" }`

#### Close month for non-existent employee

- Type: negative
- Expected HTTP status: `500`
- Expected response: `{ "success": false, "message": "<error>" }`

---

## `POST /api/school/:schoolId/people/employees/:employeeId/pay`

- Handler: `rust/src/domain/people/emppay.rs::record_salary_payment`
- Purpose: Record a salary payment transaction against a closed paycheck, marking it as paid.
- Auth/Tenant: Requires `TenantContext`.

### Request

Body:

```json
{
  "paycheckId": "PCK-001",
  "paymentMode": "bank_transfer",
  "referenceNumber": "TXN-7761829"
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "paymentId": "PAY-001",
    "paycheckId": "PCK-001",
    "paymentMode": "bank_transfer",
    "referenceNumber": "TXN-7761829",
    "status": "paid"
  }
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<service error>"
}
```

### Test cases

#### Record payment for closed paycheck

- Type: positive
- Preconditions: Paycheck `PCK-001` is in `closed` status.
- Request: `POST /api/school/SCH-001/people/employees/EMP-00281/pay`
- Body: `{ "paycheckId": "PCK-001", "paymentMode": "bank_transfer", "referenceNumber": "TXN-7761829" }`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": { "status": "paid", ... } }`
- Database/state assertion: Paycheck status changes to `paid`.

#### Record payment for already paid paycheck

- Type: negative
- Preconditions: Paycheck `PCK-001` is already `paid`.
- Expected HTTP status: `500`
- Expected response: `{ "success": false, "message": "<already paid error>" }`

#### Record payment for non-existent paycheck

- Type: negative
- Body: `{ "paycheckId": "NONEXIST", "paymentMode": "cash" }`
- Expected HTTP status: `500`
- Expected response: `{ "success": false, "message": "<error>" }`