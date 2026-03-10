# Fees Route Documentation

**File:** `src/routes/fees.rs`  
**Service:** `src/services/operations_service.rs`  
**Tables:** `fees`, `student_fees`, `custom_fees`, `custom_fee_records`, `referral_coupons`, `coupon_usage_log`, `audit_logs`

---

## Routes Summary

| # | Method | URL | Handler | Description |
|---|---|---|---|---|
| 1 | `POST` | `/api/fees/:school_id` | `create_school_fee` | School-level fee type banao |
| 2 | `GET` | `/api/fees/:school_id` | `get_school_fees` | School ke sabhi fee types lo |
| 3 | `GET` | `/api/fees/:school_id/pendingFees/filter?minPercentage=&className=` | `get_pending_fees` | Pending fee wale students |
| 4 | `GET` | `/api/fees/:school_id/:student_id` | `get_student_fee` | Ek student ki fee summary |
| 5 | `POST` | `/api/fees/:school_id/:student_id/pay` | `pay_fee` | Student ki fee jama karo |
| 6 | `POST` | `/api/fees/:school_id/:student_id/add` | `add_fee_to_student_route` | Student ko fee assign karo |
| 7 | `POST` | `/api/fees/:school_id/:student_id/discount` | `apply_discount` | Discount lagao |
| 8 | `POST` | `/api/fees/:school_id/custom` | `create_custom_fee` | Custom fee create karo |
| 9 | `GET` | `/api/fees/:school_id/custom` | `list_custom_fees` | Custom fees list karo |
| 10 | `DELETE` | `/api/fees/:school_id/custom/:fee_id` | `delete_custom_fee` | Custom fee delete karo |
| 11 | `POST` | `/api/fees/:school_id/custom/:fee_id/apply` | `apply_custom_fee` | Custom fee sabhi students par apply karo |
| 12 | `GET` | `/api/fees/:school_id/student/:student_id/profile` | `get_student_profile` | Student ka full fee profile |
| 13 | `POST` | `/api/fees/:school_id/coupons` | `create_coupon` | Referral coupon banao |
| 14 | `GET` | `/api/fees/:school_id/coupons` | `list_coupons` | Coupons list karo |
| 15 | `DELETE` | `/api/fees/:school_id/coupons/:coupon_id` | `delete_coupon` | Coupon delete karo |
| 16 | `POST` | `/api/fees/:school_id/coupons/:coupon_id/block` | `block_coupon` | Coupon block/unblock karo |
| 17 | `POST` | `/api/fees/:school_id/coupons/validate` | `validate_coupon` | Coupon validate karo |
| 18 | `POST` | `/api/fees/:school_id/coupons/:coupon_id/use` | `use_coupon` | Coupon use karo (discount apply) |

---

## Standard Fees (Routes 1–7)

### Route 1: Create School Fee Type
```
POST /api/fees/:school_id
Body: { "feesName": "Tuition", "feesReason": "Monthly", "feesPeriod": "monthly", "feesAmount": 2000 }

→ INSERT INTO fees (id, school_id, fees_name, fees_reason, fees_period, fees_amount)
```

### Route 2: Get All Fee Types
```
GET /api/fees/:school_id
→ SELECT * FROM fees WHERE school_id = $1
```

### Route 3: Get Pending Fees (Filtered)
```
GET /api/fees/:school_id/pendingFees/filter?minPercentage=50&className=Class-10
→ Filters students where pending_amount / total_fees > minPercentage
→ Optional class filter
```

### Route 4: Get Student Fee Summary
```
GET /api/fees/:school_id/:student_id
→ SELECT * FROM student_fees WHERE student_id = $1
```

### Route 5: Pay Fee
```
POST /api/fees/:school_id/:student_id/pay
Body: { "amount": 1500 }

Workflow:
→ student_fees → pending_amount -= amount
→ INSERT INTO audit_logs (action='pay')
```

### Route 6: Add Fee to Student
```
POST /api/fees/:school_id/:student_id/add
Body: { "amount": 2000, "feeId": "fee-uuid" }

→ student_fees.total_fees += amount
→ student_fees.pending_amount += amount
→ INSERT INTO audit_logs (action='fee')
```

### Route 7: Apply Discount
```
POST /api/fees/:school_id/:student_id/discount
Body: { "discount": 500.0 }

→ student_fees.pending_amount -= discount
```

---

## Custom Fees (Routes 8–12)

Custom fees are school-defined fees (trip fees, uniform fees, etc.) that can be batch-applied to multiple students.

### Route 8: Create Custom Fee
```
POST /api/fees/:school_id/custom
Body: {
  "feeName": "Trip Fee",
  "feeType": "one-time",
  "amount": 500,
  "scope": "class",               // "all", "class", or "student"
  "targetClasses": ["Class-10"],
  "targetStudents": [],
  "dueDate": "2026-04-30",
  "hasPenalty": true,
  "penaltyPerDay": 10,
  "description": "Annual trip"
}
→ INSERT INTO custom_fees (...)
```

### Route 9: List Custom Fees
```
GET /api/fees/:school_id/custom
→ SELECT * FROM custom_fees WHERE school_id = $1
```

### Route 10: Delete Custom Fee
```
DELETE /api/fees/:school_id/custom/:fee_id
→ DELETE FROM custom_fees WHERE school_id=$1 AND fee_id=$2
```

### Route 11: Apply Custom Fee to Students
```
POST /api/fees/:school_id/custom/:fee_id/apply
→ Finds target students by scope (all/class/student)
→ INSERT INTO custom_fee_records (school_id, fee_id, student_id, amount, status)
  for each target student
```

### Route 12: Student Full Profile
```
GET /api/fees/:school_id/student/:student_id/profile
→ Returns student data + fee summary + custom fee records
```

---

## Referral Coupons (Routes 13–18)

Coupons created by school (e.g., employee referral discounts for new admissions).

### Route 13: Create Coupon
```
POST /api/fees/:school_id/coupons
Body: {
  "couponName": "REF2024",
  "discountType": "percentage",   // "percentage" or "flat"
  "discountValue": 10,
  "maxUses": 5,
  "assignedEmployeeId": "EMP001",
  "employeeReward": 200,
  "description": "Referral bonus"
}
→ INSERT INTO referral_coupons (...)
```

### Route 14: List Coupons
```
GET /api/fees/:school_id/coupons
→ SELECT * FROM referral_coupons WHERE school_id=$1
```

### Route 15: Delete Coupon
```
DELETE /api/fees/:school_id/coupons/:coupon_id
→ DELETE FROM referral_coupons WHERE coupon_id=$1 AND school_id=$2
```

### Route 16: Block/Unblock Coupon
```
POST /api/fees/:school_id/coupons/:coupon_id/block
Body: { "blocked": true }
```

### Route 17: Validate Coupon
```
POST /api/fees/:school_id/coupons/validate
Body: { "couponName": "REF2024" }
→ Checks if coupon exists, not expired, not blocked, max_uses not reached
→ Returns coupon details if valid
```

### Route 18: Use Coupon (Apply to Student)
```
POST /api/fees/:school_id/coupons/:coupon_id/use
Body: { "studentId": "STU001", "discount": 200.0 }
→ INSERT INTO coupon_usage_log (school_id, coupon_id, student_id, discount_applied, ...)
→ Updates coupon uses count
```
