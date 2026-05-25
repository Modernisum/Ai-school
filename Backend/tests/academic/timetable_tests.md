# Academic API — Timetable Tests

> Base URL: `/api/school/{schoolId}/academic/timetable`

---

## Actual Route Table

| # | Endpoint | Method | Handler |
|---|----------|--------|---------|
| 1 | `/api/school/:schoolId/academic/timetable/generate` | POST | `generate_timetable` |
| 2 | `/api/school/:schoolId/academic/timetable/` | GET | `list_timetables` |
| 3 | `/api/school/:schoolId/academic/timetable/:configId` | GET | `get_timetable` |
| 4 | `/api/school/:schoolId/academic/timetable/:configId/approve` | POST | `approve_timetable` |
| 5 | `/api/school/:schoolId/academic/timetable/:configId` | DELETE | `delete_timetable` |
| 6 | `/api/school/:schoolId/academic/timetable-substitute/:spaceId/:responsibilityId/:day/:period` | GET | `suggest_substitute` |

---

## Test: Get Timetable

- **Endpoint**: `GET /api/school/689225/academic/timetable/`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/school/689225/academic/timetable/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Get Timetable (filtered by Space)

- **Endpoint**: `GET /api/school/689225/academic/timetable/?space_id=class-1-b-6892`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/school/689225/academic/timetable/?space_id=class-1-b-6892" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Generate Timetable

- **Endpoint**: `POST /api/school/689225/academic/timetable/generate`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/school/689225/academic/timetable/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "spaceId": "class-1-b-6892",
    "day": 1,
    "period": 1,
    "responsibilityId": "math-teaching-001",
    "teacherId": "EMP001"
  }' | jq .
```

---

## Test: Suggest Substitute

- **Endpoint**: `GET /api/school/689225/academic/timetable-substitute/:spaceId/:responsibilityId/:day/:period`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/school/689225/academic/timetable-substitute/class-1-b-6892/math-teaching-001/1/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```
