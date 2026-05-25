# Router — Independent Routes

> These routes are defined directly in `src/routes/router.rs` and are NOT nested under `/school/:schoolId/resources/`.
> Some are covered by other domain test folders; this file documents them all in one place.

---

## Full Route Table

```
Prefix: /api
├── /auth/*                         → domain::auth             (tests/auth/)
├── /admin/*                        → domain::admin            (tests/admin/)
├── /school/:schoolId
│   ├── /people/*                   → domain::people           (tests/people/)
│   ├── /academic/*                 → domain::academic         (tests/academic/)
│   ├── /finance/*                  → domain::finance          (tests/finance/)
│   ├── /attendance/*               → domain::attendance       (tests/attendance/)
│   ├── /leave/*                    → domain::leave            (tests/leave/)
│   ├── /resources/*                → domain::resources        ← COVERED (resource_api_tests.rs + .md files)
│   ├── /comm/*                     → domain::communication
│   ├── /operations/*               → domain::operations       (tests/operations/)
│   ├── /ai/*                       → domain::ai               (tests/ai/)
│   ├── /ocr/*                      → domain::ocr
│   └── /system/*                   → domain::system
├── /geo/countries                  → routes::geo::get_countries
├── /geo/states/:country_id         → routes::geo::get_states
├── /geo/districts/:state_id        → routes::geo::get_districts
├── /geo/export                     → routes::geo::export_geo_json
├── /geo/import                     → routes::geo::import_geo_json
├── /setup/school                   → routes::setup::setup_school_handler
├── /setup/:schoolId                → routes::setup::get_setup
├── /school/:schoolId/notification  → super_admin::routes (GET + DELETE)
├── /global/notification            → super_admin::routes (GET)
├── /school/:schoolId/holidays      → routes::attendance (GET + POST)
├── /school/:schoolId/holidays/check→ routes::attendance::check_school_holiday
├── /school/:schoolId/holidays/:id  → routes::attendance::delete_school_holiday
├── /class/:schoolId/classes        → routes::class_subject_compat (GET + POST)
├── /class/:schoolId/classes/:id    → routes::class_subject_compat (DELETE)
├── /subjects/:schoolId             → routes::class_subject_compat (GET + POST)
├── /subjects/:schoolId/:id         → routes::class_subject_compat (DELETE)
├── /students/:schoolId/class/:name → routes::students::list_students_by_class
├── /academic/:schoolId/:className/ids         → class_subject_compat
├── /academic/topic/:schoolId/class/:c/subject/:s/chapter/names → class_subject_compat
├── /academic/:schoolId/generate-paper         → class_subject_compat
├── /academic/:schoolId/exams                  → class_subject_compat
│
Prefix: (root)
├── GET /                              → "Modern School Management Backend"
├── GET /health                        → routes::health::unified_health_check
├── GET /api/dashboard/:schoolId/overview        → routes::dashboard
├── GET /api/dashboard/:schoolId/stats           → routes::dashboard
├── GET /api/dashboard/:schoolId/leaves/proxy-suggestions → routes::leave
├── GET /api/students/:schoolId/students/:id/profile → routes::fees
├── /api/cms/*                         → domain::cms::public_routes
└── /uploads/*                         → ServeDir (static files)
```

---

## 1. Health Check

- **Endpoint**: `GET /health`
- **Handler**: `routes::health::unified_health_check` (`src/routes/health.rs`)
- **Purpose**: Returns overall system status (DB, Redis, storage, uptime)
- **Auth**: None (RLS runs but has no effect)
- **Rate limit**: Not limited (before `/api` prefix)

### Action Check ✅
- **Worth it?** ✅ Yes — essential for monitoring/uptime
- **Covers**: DB connectivity (SELECT 1), Redis ping, storage writability, pool metrics, memory, uptime

```bash
curl -s "http://localhost:8080/health" | jq .
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "uptime": 3600
}
```

---

## 2. Root

- **Endpoint**: `GET /`
- **Handler**: Inline `|| async { "Modern School Management Backend (Rust/Axum)" }`
- **Purpose**: Simple text response identifying the server

```bash
curl -s "http://localhost:8080/"
```

---

## 3. Dashboard Overview

- **Endpoint**: `GET /api/dashboard/{schoolId}/overview`
- **Handler**: `routes::dashboard::get_dashboard_overview` (`src/routes/dashboard.rs`)
- **Method**: GET

### Action Check ✅
- **Worth it?** ✅ Yes — main dashboard data source

```bash
curl -s "http://localhost:8080/api/dashboard/689225/overview" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## 4. Dashboard Stats

- **Endpoint**: `GET /api/dashboard/{schoolId}/stats`
- **Handler**: `routes::dashboard::get_dashboard_stats` (`src/routes/dashboard.rs`)

```bash
curl -s "http://localhost:8080/api/dashboard/689225/stats" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## 5. Proxy Suggestions (Leave)

- **Endpoint**: `GET /api/dashboard/{schoolId}/leaves/proxy-suggestions`
- **Handler**: `routes::leave::get_proxy_suggestions` (`src/routes/leave.rs`)

```bash
curl -s "http://localhost:8080/api/dashboard/689225/leaves/proxy-suggestions" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## 6. Setup Routes

### POST /api/setup/school
- **Handler**: `routes::setup::setup_school_handler` (`src/routes/setup.rs`)
- **Purpose**: Initial school setup / onboarding
- **Auth**: No tenant context needed

```bash
curl -s -X POST "http://localhost:8080/api/setup/school" \
  -H "Content-Type: application/json" \
  -d '{
    "schoolName": "Test School",
    "adminEmail": "admin@school.com",
    "adminPhone": "+911234567890"
  }' | jq .
```

### GET /api/setup/{schoolId}
- **Handler**: `routes::setup::get_setup`
- **Purpose**: Get setup status for a school

```bash
curl -s "http://localhost:8080/api/setup/689225" | jq .
```

---

## 7. Geo Routes

### GET /api/geo/countries
### GET /api/geo/states/{countryId}
### GET /api/geo/districts/{stateId}
### GET /api/geo/export
### POST /api/geo/import

- **Handlers**: `src/routes/geo.rs`
- **Purpose**: Static geographic data (countries, states, districts)

```bash
curl -s "http://localhost:8080/api/geo/countries" | jq .
curl -s "http://localhost:8080/api/geo/states/101" | jq .
curl -s "http://localhost:8080/api/geo/districts/1" | jq .
```

---

## 8. School Notification

- **Endpoint**: `GET /api/school/{schoolId}/notification`
- **Endpoint**: `DELETE /api/school/{schoolId}/notification`
- **Handler**: `super_admin::routes` (`src/super_admin/routes.rs`)

```bash
curl -s "http://localhost:8080/api/school/689225/notification" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## 9. Global Notification

- **Endpoint**: `GET /api/global/notification`
- **Handler**: `super_admin::routes::get_global_notification`

```bash
curl -s "http://localhost:8080/api/global/notification" | jq .
```

---

## 10. Holidays

- **Endpoint**: `GET /api/school/{schoolId}/holidays` → list holidays
- **Endpoint**: `POST /api/school/{schoolId}/holidays` → create holiday
- **Endpoint**: `GET /api/school/{schoolId}/holidays/check` → check if date is holiday
- **Endpoint**: `DELETE /api/school/{schoolId}/holidays/{holidayId}` → delete holiday
- **Handlers**: `src/routes/attendance.rs`

```bash
# List
curl -s "http://localhost:8080/api/school/689225/holidays" \
  -H "X-School-ID: 689225" | jq .

# Create
curl -s -X POST "http://localhost:8080/api/school/689225/holidays" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-08-15", "name": "Independence Day"}' | jq .

# Check
curl -s "http://localhost:8080/api/school/689225/holidays/check?date=2026-08-15" \
  -H "X-School-ID: 689225" | jq .
```

---

## 11. Compat Routes (Classes, Subjects, Students, Academic)

These are backward-compat routes that duplicate functionality from the main domain modules.

### Classes
```bash
# List classes
curl -s "http://localhost:8080/api/class/689225/classes" | jq .
# Add class
curl -s -X POST "http://localhost:8080/api/class/689225/classes" \
  -H "Content-Type: application/json" \
  -d '{"name": "Class 10-A"}' | jq .
# Delete class
curl -s -X DELETE "http://localhost:8080/api/class/689225/classes/1" | jq .
```

### Subjects
```bash
# List
curl -s "http://localhost:8080/api/subjects/689225" | jq .
# Add
curl -s -X POST "http://localhost:8080/api/subjects/689225" \
  -H "Content-Type: application/json" \
  -d '{"name": "Physics"}' | jq .
```

### Students by class
```bash
curl -s "http://localhost:8080/api/students/689225/class/Class%2010-A" | jq .
```

### Academic compat
```bash
# Subjects by class
curl -s "http://localhost:8080/api/academic/689225/Class%2010-A/ids" | jq .
# Chapters by subject
curl -s "http://localhost:8080/api/academic/topic/689225/class/Class%2010-A/subject/Physics/chapter/names" | jq .
```

---

## 12. Legacy Student Profile

- **Endpoint**: `GET /api/students/{schoolId}/students/{studentId}/profile`
- **Handler**: `routes::fees::get_student_profile` (`src/routes/fees.rs`)
- **Purpose**: Legacy compat — being deprecated

```bash
curl -s "http://localhost:8080/api/students/689225/students/STU001/profile" \
  -H "X-School-ID: 689225" | jq .
```

---

## 13. CMS Public Routes

- **Prefix**: `/api/cms/*`
- **Handler**: `domain::cms::public_routes`
- **Purpose**: Content management system (public-facing)

---

## 14. Static File Serving

- **Prefix**: `/uploads/*`
- **Handler**: `tower_http::services::ServeDir`
- **Purpose**: Serves uploaded files from `UPLOAD_DIR` (default `./uploads`)
- **Auth**: Requires `UPLOAD_TOKEN` env var via `Authorization: Bearer <token>` or `?token=` query param

```bash
# If UPLOAD_TOKEN is set:
curl -s "http://localhost:8080/uploads/some-file.pdf" \
  -H "Authorization: Bearer <upload-token>" -o file.pdf
```

---

## ⚠️ All Issues Found (Action Check Summary)

| # | Route | Issue | Severity | Fix |
|---|-------|-------|----------|-----|
| 1 | `/api/class/...` | Duplicate of academic domain routes | Low | Remove when frontend migrates |
| 2 | `/api/subjects/...` | Duplicate of academic domain routes | Low | Remove when frontend migrates |
| 3 | `/api/students/:schoolId/students/:studentId/profile` | Nested `:schoolId/students/:studentId` is confusing | Medium | Deprecate and remove |
| 4 | `/api/academic/:schoolId/generate-paper` | Inconsistent URL pattern | Low | Move under `/api/school/:schoolId/` |
| 5 | `/uploads/*` auth | Uses query param `?token=` which leaks in logs | Medium | Require `Authorization` header only |
| 6 | `/api/academic/:schoolId/exams` | Single route for "approve exam" — naming misleading | Low | Rename to `/exams/approve` |
