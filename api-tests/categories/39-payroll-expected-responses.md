# Employee Payroll APIs - Expected Responses

## Authentication Requirements
- **X-School-ID**: Required for all endpoints
- **X-Admin-ID**: Required for all endpoints
- **Permissions**: HR or payroll admin role required for write operations

## 1. POST /api/payroll/:schoolId/:employeeId/set-base-salary - Set Base Salary

### Request Body
```json
{
  "baseSalary": 50000,
  "currency": "INR",
  "effectiveFrom": "2024-04-01",
  "payGrade": "PG-5",
  "allowances": {
    "housing": 10000,
    "transport": 5000,
    "medical": 3000
  }
}
```

### Successful Response (200 OK)
```json
{
  "success": true,
  "message": "Salary parameters updated"
}
```

## 2. GET /api/payroll/:schoolId/:employeeId/salary-breakdown - Get Salary Breakdown

### Successful Response (200 OK)
```json
{
  "success": true,
  "data": {
    "employeeId": "EMP001",
    "employeeName": "John Doe",
    "baseSalary": 50000,
    "currency": "INR",
    "payGrade": "PG-5",
    "allowances": {
      "housing": 10000,
      "transport": 5000,
      "medical": 3000,
      "total": 18000
    },
    "deductions": {
      "tax": 5000,
      "providentFund": 3000,
      "insurance": 1000,
      "total": 9000
    },
    "bonuses": [
      {
        "id": "BON001",
        "amount": 5000,
        "reason": "Performance Bonus",
        "date": "2024-03-15"
      }
    ],
    "aids": [
      {
        "id": "AID001",
        "amount": 2000,
        "reason": "Medical Emergency",
        "date": "2024-03-10"
      }
    ],
    "netSalary": 59000,
    "paymentStatus": "pending",
    "lastPaymentDate": "2024-03-01",
    "currentMonth": {
      "month": "April 2024",
      "workingDays": 22,
      "presentDays": 20,
      "leaveDays": 2
    }
  }
}
```

## 3. POST /api/payroll/:schoolId/:employeeId/add-bonus - Add Bonus

### Request Body
```json
{
  "amount": 7500,
  "reason": "Exceptional Performance Q1",
  "effectiveMonth": "2024-04",
  "taxable": true,
  "notes": "Awarded for exceeding quarterly targets"
}
```

### Successful Response (200 OK)
```json
{
  "success": true,
  "data": {
    "bonusId": "bon-1234567890",
    "employeeId": "EMP001",
    "amount": 7500,
    "reason": "Exceptional Performance Q1",
    "effectiveMonth": "2024-04",
    "addedBy": "admin123",
    "addedAt": "2024-03-15T11:30:00Z"
  }
}
```

## 4. POST /api/payroll/:schoolId/:employeeId/add-aid - Add Aid

### Request Body
```json
{
  "amount": 3000,
  "reason": "Family Emergency Support",
  "aidType": "emergency",
  "repayable": false,
  "notes": "Provided for urgent family medical needs"
}
```

### Successful Response (200 OK)
```json
{
  "success": true,
  "data": {
    "aidId": "aid-1234567890",
    "employeeId": "EMP001",
    "amount": 3000,
    "reason": "Family Emergency Support",
    "aidType": "emergency",
    "addedBy": "admin123",
    "addedAt": "2024-03-15T11:45:00Z"
  }
}
```

## 5. POST /api/payroll/:schoolId/:employeeId/auto-close-month - Auto Close Month

### Successful Response (200 OK)
```json
{
  "success": true,
  "message": "Month closed successfully",
  "data": {
    "month": "March 2024",
    "closedAt": "2024-04-01T00:00:00Z",
    "totalEmployees": 45,
    "totalSalary": 2250000,
    "processedBy": "system"
  }
}
```

## Error Responses

### 400 Bad Request (Validation Error)
```json
{
  "success": false,
  "message": "Invalid salary amount: must be positive number"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Employee not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Month already closed for employee"
}
```

## Testing Notes
1. **Currency**: Default is INR, but system supports multiple currencies
2. **Effective Dates**: Salary changes are effective from specified date
3. **Tax Calculations**: Bonuses may be taxable based on configuration
4. **Month Closing**: Can only be done once per month per employee
5. **Audit Trail**: All payroll changes are logged for audit purposes

## Performance Expectations
- Salary calculations: < 200ms per employee
- Month closing: < 5 seconds for 100 employees
- Report generation: < 10 seconds for monthly payroll report

## Security Considerations
1. Salary data is highly sensitive - strict access controls required
2. Only HR administrators can modify payroll data
3. Employees can only view their own salary information
4. All payroll changes require dual authorization for amounts above threshold

## Compliance Requirements
1. Tax calculations must comply with local regulations
2. Audit trail must be maintained for 7 years
3. Salary slips must include all mandatory disclosures
4. Data encryption required for sensitive financial information