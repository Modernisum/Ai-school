# Fee Management APIs - Expected Responses

## Authentication Requirements
- **Auth Type:** RLS (Row Level Security)
- **Required Headers:** `X-School-ID`, `X-Admin-ID`
- **Base URL:** `/api/fees/:schoolId`

## 1. POST /api/fees/:schoolId - Create School Fee

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "feeId": "fee_123456",
    "feeName": "Tuition Fee",
    "amount": 5000.00,
    "dueDate": "2025-03-31",
    "feeType": "regular",
    "description": "Monthly tuition fee for all students",
    "applicableClasses": ["Class 10", "Class 11", "Class 12"],
    "discountPercentage": 10.0,
    "createdAt": "2025-01-15T10:30:00Z",
    "createdBy": "admin_001"
  }
}
```

### Error Responses
- **HTTP 400:** Invalid fee data (missing required fields)
- **HTTP 401:** Missing or invalid authentication headers
- **HTTP 409:** Fee with same name already exists
- **HTTP 500:** Server error

## 2. GET /api/fees/:schoolId - Get School Fees

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "feeId": "fee_123456",
      "feeName": "Tuition Fee",
      "amount": 5000.00,
      "dueDate": "2025-03-31",
      "feeType": "regular",
      "description": "Monthly tuition fee for all students",
      "applicableClasses": ["Class 10", "Class 11", "Class 12"],
      "discountPercentage": 10.0,
      "totalStudents": 150,
      "collectedAmount": 450000.00,
      "pendingAmount": 300000.00
    },
    {
      "feeId": "fee_789012",
      "feeName": "Library Fee",
      "amount": 500.00,
      "dueDate": "2025-06-30",
      "feeType": "annual",
      "description": "Annual library membership",
      "applicableClasses": ["All"],
      "discountPercentage": 0.0,
      "totalStudents": 150,
      "collectedAmount": 75000.00,
      "pendingAmount": 0.00
    }
  ]
}
```

## 3. GET /api/fees/:schoolId/pending - Get Pending Fees

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "totalPending": 45,
    "totalAmount": 300000.00,
    "students": [
      {
        "studentId": "stu_001",
        "studentName": "John Doe",
        "className": "Class 10",
        "totalFee": 5000.00,
        "paidAmount": 2500.00,
        "pendingAmount": 2500.00,
        "pendingPercentage": 50.0,
        "dueDate": "2025-03-31"
      },
      {
        "studentId": "stu_002",
        "studentName": "Jane Smith",
        "className": "Class 11",
        "totalFee": 5000.00,
        "paidAmount": 1000.00,
        "pendingAmount": 4000.00,
        "pendingPercentage": 80.0,
        "dueDate": "2025-03-31"
      }
    ]
  }
}
```

## 4. GET /api/fees/:schoolId/student/:studentId - Get Student Fee Details

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "studentId": "stu_001",
    "studentName": "John Doe",
    "className": "Class 10",
    "totalFees": 5500.00,
    "paidAmount": 3000.00,
    "pendingAmount": 2500.00,
    "discountApplied": 500.00,
    "feeBreakdown": [
      {
        "feeId": "fee_123456",
        "feeName": "Tuition Fee",
        "amount": 5000.00,
        "paid": 2500.00,
        "pending": 2500.00,
        "dueDate": "2025-03-31",
        "status": "partially_paid"
      },
      {
        "feeId": "fee_789012",
        "feeName": "Library Fee",
        "amount": 500.00,
        "paid": 500.00,
        "pending": 0.00,
        "dueDate": "2025-06-30",
        "status": "paid"
      }
    ],
    "paymentHistory": [
      {
        "paymentId": "pay_001",
        "date": "2025-01-10",
        "amount": 1500.00,
        "method": "cash",
        "transactionId": "TXN-001",
        "notes": "First installment"
      }
    ]
  }
}
```

## 5. POST /api/fees/:schoolId/student/:studentId/pay - Pay Student Fee

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_002",
    "studentId": "stu_001",
    "amount": 4500.00,
    "paymentMethod": "cash",
    "transactionId": "TXN-002",
    "previousBalance": 2500.00,
    "newBalance": 0.00,
    "paymentDate": "2025-01-20T14:30:00Z",
    "processedBy": "admin_001"
  }
}
```

## 6. POST /api/fees/:schoolId/student/:studentId/add - Add Fee to Student

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "feeAssignmentId": "assign_001",
    "studentId": "stu_001",
    "feeId": "fee_123456",
    "amount": 1000.00,
    "description": "Library fee",
    "addedAt": "2025-01-15T11:00:00Z",
    "addedBy": "admin_001",
    "newTotalFee": 6500.00
  }
}
```

## 7. POST /api/fees/:schoolId/student/:studentId/discount - Apply Discount

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "discountId": "disc_001",
    "studentId": "stu_001",
    "discountAmount": 500.00,
    "reason": "Merit scholarship",
    "appliedAt": "2025-01-15T11:30:00Z",
    "appliedBy": "admin_001",
    "newTotalFee": 6000.00
  }
}
```

## 8. POST /api/fees/:schoolId/custom - Create Custom Fee

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "customFeeId": "custom_001",
    "feeName": "Sports Equipment Fee",
    "amount": 1500.00,
    "description": "Annual sports equipment maintenance",
    "applicableTo": "selected_students",
    "studentIds": ["stu_001"],
    "createdAt": "2025-01-15T12:00:00Z",
    "createdBy": "admin_001"
  }
}
```

## 9. GET /api/fees/:schoolId/custom - List Custom Fees

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "customFeeId": "custom_001",
      "feeName": "Sports Equipment Fee",
      "amount": 1500.00,
      "description": "Annual sports equipment maintenance",
      "applicableTo": "selected_students",
      "studentCount": 1,
      "createdAt": "2025-01-15T12:00:00Z",
      "status": "active"
    }
  ]
}
```

## 10. DELETE /api/fees/:schoolId/custom/:feeId - Delete Custom Fee

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Deleted"
}
```

## 11. POST /api/fees/:schoolId/custom/:feeId/apply - Apply Custom Fee

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "appliedCount": 1,
    "totalAmount": 1500.00,
    "students": ["stu_001"]
  }
}
```

## 12. GET /api/fees/:schoolId/student/:studentId/profile - Get Student Profile

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "studentId": "stu_001",
    "studentName": "John Doe",
    "className": "Class 10",
    "contact": "john.doe@example.com",
    "parentName": "Mr. Doe",
    "totalFees": 6000.00,
    "paidAmount": 3000.00,
    "pendingAmount": 3000.00,
    "discounts": 500.00,
    "lastPaymentDate": "2025-01-10",
    "nextDueDate": "2025-03-31"
  }
}
```

## 13. POST /api/fees/:schoolId/coupons - Create Coupon

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "couponId": "coupon_001",
    "couponName": "WELCOME2025",
    "discountAmount": 1000.00,
    "validUntil": "2025-12-31",
    "maxUses": 100,
    "usedCount": 0,
    "description": "Welcome discount for new admissions",
    "createdAt": "2025-01-15T13:00:00Z",
    "createdBy": "admin_001",
    "status": "active"
  }
}
```

## 14. GET /api/fees/:schoolId/coupons - List Coupons

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "couponId": "coupon_001",
      "couponName": "WELCOME2025",
      "discountAmount": 1000.00,
      "validUntil": "2025-12-31",
      "maxUses": 100,
      "usedCount": 5,
      "description": "Welcome discount for new admissions",
      "createdAt": "2025-01-15T13:00:00Z",
      "status": "active"
    }
  ]
}
```

## 15. DELETE /api/fees/:schoolId/coupons/:couponId - Delete Coupon

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Deleted"
}
```

## 16. POST /api/fees/:schoolId/coupons/:couponId/block - Block Coupon

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Blocked"
}
```

## 17. POST /api/fees/:schoolId/coupons/validate - Validate Coupon

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "couponId": "coupon_001",
    "couponName": "WELCOME2025",
    "discountAmount": 1000.00,
    "validUntil": "2025-12-31",
    "remainingUses": 95,
    "isValid": true,
    "message": "Coupon is valid"
  }
}
```

### Error Response (HTTP 404)
```json
{
  "success": false,
  "message": "Coupon not found"
}
```

## 18. POST /api/fees/:schoolId/coupons/:couponId/use - Use Coupon

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "usageId": "usage_001",
    "couponId": "coupon_001",
    "studentId": "stu_001",
    "discountApplied": 1000.00,
    "usedAt": "2025-01-15T14:00:00Z",
    "usedBy": "admin_001",
    "newTotalFee": 5000.00
  }
}
```

## 19. POST /api/fees/:schoolId/student/:studentId/reminder - Generate Fee Reminder

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "reminderId": "rem_001",
    "studentId": "stu_001",
    "amountDue": 3000.00,
    "dueDate": "2025-03-31",
    "generatedAt": "2025-01-15T15:00:00Z",
    "sentTo": ["parent@example.com"],
    "message": "Fee reminder generated and sent successfully"
  }
}
```

## 20. GET /api/fees/:schoolId/student/:studentId/summary - Get Student Fee Summary

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "studentId": "stu_001",
    "totalFeesAssigned": 6000.00,
    "totalPaid": 3000.00,
    "totalPending": 3000.00,
    "totalDiscounts": 500.00,
    "paymentProgress": 50.0,
    "nextDueDate": "2025-03-31",
    "overdueAmount": 0.00,
    "feeCategories": {
      "tuition": 5000.00,
      "library": 500.00,
      "sports": 1500.00
    }
  }
}
```

## Common Error Responses

### Authentication Error (HTTP 401)
```json
{
  "success": false,
  "message": "Unauthorized: Missing or invalid school/admin headers"
}
```

### Validation Error (HTTP 400)
```json
{
  "success": false,
  "message": "Validation failed: [specific error details]",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be greater than 0"
    }
  ]
}
```

### Resource Not Found (HTTP 404)
```json
{
  "success": false,
  "message": "Student not found"
}
```

### Conflict Error (HTTP 409)
```json
{
  "success": false,
  "message": "Fee with same name already exists"
}
```

### Insufficient Balance (HTTP 422)
```json
{
  "success": false,
  "message": "Insufficient fee balance"
}
```

### Server Error (HTTP 500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Test Data Dependencies
1. **School Setup:** School must be created and active
2. **Student Data:** At least one student must exist for fee assignment
3. **Fee Templates:** Some fee templates may need to exist
4. **Admin Access:** Valid admin credentials with fee management permissions

## Testing Notes
1. **Order Matters:** Create fees before assigning to students
2. **Payment Flow:** Test payment → discount → reminder flow
3. **Validation:** Test edge cases like negative amounts, past due dates
4. **Security:** Verify RLS enforcement across schools
5. **Bulk Operations:** Consider testing bulk fee assignments