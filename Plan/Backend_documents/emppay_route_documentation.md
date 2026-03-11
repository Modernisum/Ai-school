# Employee Payroll (EmpPay) Route Documentation

**File:** `src/routes/emppay.rs`  
**Service:** `src/services/operations_service.rs` (Logic handled by salary/payroll methods)  
**Repository:** `src/repository/postgres.rs` → `update_employee_salary_params`, etc.  
**Database Tables:** `employee_salaries`, `salaries`, `employee_payments`

---

## Routes Summary

| Method | URL | Handler | Description |
|---|---|---|---|
| `POST` | `/api/payroll/:school_id/employees/:employee_id` | `set_base_salary` | Base salary aur params set karo |
| `GET` | `/api/employees/:school_id/:employee_id/salary-breakdown` | `get_salary_breakdown` | Month-wise breakdown lo |
| `POST` | `/api/employees/:school_id/:employee_id/bonus` | `add_bonus` | Bonus add karo |
| `POST` | `/api/employees/:school_id/:employee_id/aid` | `add_aid` | Financial aid/advance add karo |

---

## Route 1: Set Base Salary

### `POST /api/payroll/:school_id/employees/:employee_id`

**Body Example:**
```json
{
  "baseSalary": 30000,
  "allowances": { "HRA": 2000 },
  "deductions": { "PF": 1000 }
}
```

---

## Route 2: Get Salary Breakdown

### `GET /api/payroll/:school_id/:employee_id/breakdown`

**Response Example:**
```json
{
  "success": true,
  "data": {
    "base": 30000,
    "bonuses": [500],
    "deductions": [200],
    "netPayable": 30300
  }
}
```

---

## Financial Logic

- **Bonus:** `add_bonus` handler extra payment record banata hai.
- **Aid:** `add_aid` handler advance payment record banata hai jo future salary se deduct ho sakta hai (business logic dependent).
- **Parameters:** `set_base_salary` parameters set karta hai jo har month payroll generate karte waqt use hote hain.
