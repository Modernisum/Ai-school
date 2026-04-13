# Payment Processing APIs - Expected Responses

## Authentication Requirements
- **RLS Required:** Yes
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Webhook Authentication:** `x-razorpay-signature` header for webhook verification

## 1. POST /api/payment/:schoolId/create-order - Create Payment Order

### Request
```json
{
  "amount": 5000.0,
  "currency": "INR",
  "student_id": "STU001",
  "fee_type": "regular",
  "fee_id": "FEE2025Q1"
}
```

### Success Response (200 OK)
```json
{
  "orderId": "order_9A33XWu170gOr1",
  "amount": 5000.0,
  "currency": "INR"
}
```

### Error Responses
#### 400 Bad Request (Gateway Rejected)
```json
{
  "error": "Gateway rejected order creation"
}
```

#### 500 Internal Server Error (Gateway Not Configured)
```json
{
  "error": "Payment gateway not configured"
}
```

#### 500 Internal Server Error (Failed to Save Transaction)
```json
{
  "error": "Failed to save transaction"
}
```

#### 500 Internal Server Error (Failed to Parse Response)
```json
{
  "error": "Failed to parse gateway response"
}
```

#### 500 Internal Server Error (Gateway Connection Failed)
```json
{
  "error": "Failed to contact payment gateway"
}
```

## 2. POST /api/payment/webhook - Razorpay Webhook

### Request Headers
```
x-razorpay-signature: <signature>
Content-Type: application/json
```

### Request Body
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_29QQoUBi66xm2f",
        "order_id": "order_9A33XWu170gOr1",
        "amount": 500000,
        "currency": "INR",
        "status": "captured"
      }
    }
  }
}
```

### Success Response (200 OK)
```
"OK"
```

### Error Responses
#### 400 Bad Request (Missing Signature)
```
"Missing signature"
```

#### 400 Bad Request (Invalid Signature)
```
"Invalid signature"
```

#### 500 Internal Server Error (Invalid MAC Setup)
```
"Invalid MAC setup"
```

## Validation Criteria
1. **Create Order:** Should return order details with amount and currency
2. **Webhook:** Should verify signature and return 200 OK
3. **Error Handling:** Proper error messages for missing configuration, gateway failures, and validation errors
4. **Security:** Webhook signature verification must be validated

## Testing Notes
- Payment gateway requires `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` environment variables
- Webhook requires `RAZORPAY_WEBHOOK_SECRET` environment variable
- Test with both successful and failed payment scenarios
- Verify transaction is saved to database after successful order creation