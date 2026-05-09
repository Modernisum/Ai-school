# Finance API — Coupons Tests

## Test: List Coupons

- **Endpoint**: `GET /api/finance/689225/coupons`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/finance/689225/coupons" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Create Coupon

- **Endpoint**: `POST /api/finance/689225/coupons`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/finance/689225/coupons \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SAVE20",
    "discount_type": "percentage",
    "discount_value": 20,
    "max_uses": 100,
    "expires_at": "2026-12-31",
    "min_amount": 5000
  }' | jq .
```

---

## Test: Validate Coupon

- **Endpoint**: `POST /api/finance/689225/coupons/validate`
- **Body**: `{ "code": "SAVE20", "amount": 15000 }`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/finance/689225/coupons/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{"code":"SAVE20","amount":15000}' | jq .
```

---

## Test: Delete Coupon

- **Endpoint**: `DELETE /api/finance/689225/coupons/COUPON_ID`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/finance/689225/coupons/SAVE20 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```
