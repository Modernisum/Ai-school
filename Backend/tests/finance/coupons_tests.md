# Finance API — Referral Coupons Tests

All routes are nested under `/api/school/{schoolId}/finance/`.

---

## Actual Route Table

| # | Endpoint | Method | Description |
|---|----------|--------|-------------|
| 1 | `/api/school/:schoolId/finance/coupons` | GET | List all discount/referral coupons |
| 2 | `/api/school/:schoolId/finance/coupons` | POST | Create a new referral/discount coupon |
| 3 | `/api/school/:schoolId/finance/coupons/validate` | POST | Validate a coupon code for applicability |
| 4 | `/api/school/:schoolId/finance/coupons/:couponId/use` | POST | Use/redeem a coupon for a student |
| 5 | `/api/school/:schoolId/finance/coupons/:couponId/block` | PUT | Toggle block/unblock status of a coupon |
| 6 | `/api/school/:schoolId/finance/coupons/:couponId` | DELETE | Delete/remove a coupon |

---

## Test: Create Coupon

- **Endpoint**: `POST /api/school/689225/finance/coupons`
- **Response Code**: `200 OK`

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/finance/coupons" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SAVE20",
    "discount_type": "percentage",
    "discount_value": 20,
    "max_uses": 50,
    "expires_at": "2026-12-31",
    "min_amount": 5000
  }'
```

### JSON Response
```json
{
  "data": {
    "code": "SAVE20",
    "couponId": "CPN1779722072895",
    "couponName": "SAVE20",
    "discountType": "percentage",
    "discountValue": 20.0,
    "discount_type": "percentage",
    "discount_value": 20,
    "expires_at": "2026-12-31",
    "max_uses": 50,
    "min_amount": 5000
  },
  "success": true
}
```

---

## Test: List Coupons

- **Endpoint**: `GET /api/school/689225/finance/coupons`
- **Response Code**: `200 OK`

```bash
curl -s "http://localhost:8080/api/school/689225/finance/coupons" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225"
```

### JSON Response
```json
{
  "data": [
    {
      "couponId": "CPN1779722072895",
      "couponName": "SAVE20",
      "data": {
        "code": "SAVE20",
        "discount_type": "percentage",
        "discount_value": 20,
        "expires_at": "2026-12-31",
        "max_uses": 50,
        "min_amount": 5000
      },
      "discountType": "percentage",
      "discountValue": 20.0,
      "isBlocked": false
    }
  ],
  "success": true
}
```

---

## Test: Validate Coupon

- **Endpoint**: `POST /api/school/689225/finance/coupons/validate`
- **Response Code**: `200 OK`

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/finance/coupons/validate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SAVE20",
    "amount": 15000
  }'
```

### JSON Response
```json
{
  "data": {
    "couponId": "CPN1779722072895",
    "couponName": "SAVE20",
    "discountType": "percentage",
    "discountValue": 20.0
  },
  "success": true
}
```

---

## Test: Use Coupon

- **Endpoint**: `POST /api/school/689225/finance/coupons/SAVE20/use`
- **Response Code**: `200 OK`

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/finance/coupons/SAVE20/use" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "S000009",
    "amount": 15000
  }'
```

### JSON Response
```json
{
  "data": {
    "couponId": "SAVE20",
    "discount": 15000.0,
    "status": "used",
    "studentId": "S000009"
  },
  "success": true
}
```

---

## Test: Block Coupon

- **Endpoint**: `PUT /api/school/689225/finance/coupons/SAVE20/block`
- **Response Code**: `200 OK`

```bash
curl -s -X PUT "http://localhost:8080/api/school/689225/finance/coupons/SAVE20/block" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "blocked": true
  }'
```

### JSON Response
```json
{
  "message": "Blocked",
  "success": true
}
```

---

## Test: Delete Coupon

- **Endpoint**: `DELETE /api/school/689225/finance/coupons/SAVE20`
- **Response Code**: `200 OK`

```bash
curl -s -X DELETE "http://localhost:8080/api/school/689225/finance/coupons/SAVE20" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225"
```

### JSON Response
```json
{
  "message": "Deleted",
  "success": true
}
```
