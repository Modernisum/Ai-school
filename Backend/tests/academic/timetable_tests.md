# Academic API — Timetable Tests

## Test: Get Timetable

- **Endpoint**: `GET /api/academic/TEST001/timetable`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/academic/TEST001/timetable \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Get Timetable (filtered by class)

- **Endpoint**: `GET /api/academic/TEST001/timetable?class_name=10-A`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/academic/TEST001/timetable?class_name=10-A" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Create Timetable Entry

- **Endpoint**: `POST /api/academic/TEST001/timetable`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/academic/TEST001/timetable \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "class_name": "10-A",
    "day": "Monday",
    "period": 1,
    "subject": "Mathematics",
    "teacher_id": "EMP001",
    "room": "101"
  }' | jq .
```

---

## Test: Delete Timetable Entry

- **Endpoint**: `DELETE /api/academic/TEST001/timetable/ENTRY_ID`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/academic/TEST001/timetable/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```
