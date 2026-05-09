# AI API — Chat Tests

## Test: AI Query

- **Endpoint**: `POST /api/ai/689225/query`
- **Body**: `{ "query": "What is the total number of active students?" }`
- **Expected**: 200, AI response

```bash
curl -s -X POST http://localhost:8080/api/ai/689225/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{"query":"What is the total number of active students in class 10-A?"}' | jq .
```

---

## Test: AI Query (rate limited)

- **Endpoint**: `POST /api/ai/689225/query`
- **Expected**: 429 on 21st request within 1 minute

```bash
for i in {1..21}; do
  echo "Request $i:"
  curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/ai/689225/query \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-School-ID: 689225" \
    -H "Content-Type: application/json" \
    -d '{"query":"test"}'
  echo ""
done
```

---

## Test: Get AI Chat History

- **Endpoint**: `GET /api/ai/689225/history`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/ai/689225/history \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: AI Get Monitoring Dashboard

- **Endpoint**: `GET /api/ai/689225/monitoring/dashboard`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/ai/689225/monitoring/dashboard \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: AI Usage Stats

- **Endpoint**: `GET /api/ai/689225/usage`
- **Query**: `?startDate=2026-04-01&endDate=2026-04-30`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/ai/689225/usage?startDate=2026-04-01&endDate=2026-04-30" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: AI Cost Summary

- **Endpoint**: `GET /api/ai/689225/costs`
- **Query**: `?startDate=2026-04-01&endDate=2026-04-30`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/ai/689225/costs?startDate=2026-04-01&endDate=2026-04-30" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Provider Comparison

- **Endpoint**: `GET /api/ai/689225/providers/comparison`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/ai/689225/providers/comparison?startDate=2026-04-01&endDate=2026-04-30" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```
