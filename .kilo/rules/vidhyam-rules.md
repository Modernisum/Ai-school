# 🛡️ VIDHYAM — Company Development Rules

> **Project:** Vidhyam School Management System
> **Platforms:** React Frontend · Rust Backend · Flutter Mobile · SuperAdmin
> **Purpose:** हर mode switch पर AI agent को बताना कि क्या करना है और क्या नहीं

---

## 🚨 RULE 0 — सबसे पहले यह पढ़ो (ALL MODES)

**हर mode (Code/Ask/Plan/Debug) में switch होते ही यह rules apply होंगे:**

```
❌ NEVER:
- Hardcoded secrets, URLs, passwords, API keys
- schoolId के बिना कोई API query
- Auth check के बिना कोई page/screen
- Raw SQL concatenate (Rust में unwrap/expect बिना handle)
- Existing patterns को ignore करना

✅ ALWAYS:
- .env / environment variables use करो secrets के लिए
- baseApi.js (React), api_service.dart (Flutter), baseApi (Rust) use करो
- School isolation: हर query में schoolId filter mandatory
- ProtectedRoute (React) / Auth check (Flutter) / JWT middleware (Rust)
- Existing codebase patterns follow करो — नया pattern introduce मत करो
```

---

## 🔵 SECTION 1: CODE Mode Rules (जब Code Mode में switch हो)

> **तुम्हारी भूमिका:** Developer — code लिखो, files create/edit करो

```
📂 FILE STRUCTURE — यही follow करो:

React Frontend (Vidhyam / SuperAdmin):
├── src/features/{feature}/
│   ├── api/
│   │   ├── {feature}Api.js       ← RTK Query slice
│   │   └── {feature}Api.test.js  ← Test file (MUST exist)
│   ├── components/
│   │   └── {Component}.jsx
│   │   └── {Component}.test.jsx
│   ├── pages/
│   │   └── {Page}.jsx
│   │   └── {Page}.test.jsx
│   └── index.js                  ← Module router

Rust Backend:
├── src/
│   ├── repository/
│   │   ├── traits/               ← DO NOT MODIFY (core interface - modular)
│   │   │   ├── mod.rs
│   │   │   ├── auth.rs
│   │   │   ├── student.rs
│   │   │   ├── employee.rs
│   │   │   ├── academic.rs
│   │   │   ├── attendance.rs
│   │   │   ├── fee.rs
│   │   │   ├── coupon.rs
│   │   │   ├── payroll.rs
│   │   │   ├── transaction.rs
│   │   │   ├── resource.rs
│   │   │   ├── auxiliary/
│   │   │   │   ├── award.rs
│   │   │   │   ├── complain.rs
│   │   │   │   ├── reminder.rs
│   │   │   │   ├── document_box.rs
│   │   │   │   └── school.rs
│   │   │   ├── responsibility.rs
│   │   │   ├── task.rs
│   │   │   ├── leave.rs
│   │   │   ├── analytics.rs
│   │   │   ├── audit.rs
│   │   │   ├── global_user.rs
│   │   │   ├── notification.rs
│   │   │   ├── storage.rs
│   │   │   └── grading.rs
│   │   ├── {feature}_repo.rs     ← Individual repo implementations (e.g., responsibility_repo.rs)
│   │   ├── misc_repo.rs          ← Contains multiple repo implementations
│   │   ├── postgres.rs           ← Database connection
│   │   ├── base.rs               ← Base repository
│   │   ├── query_builder.rs      ← Query building utilities
│   │   └── mod.rs                ← Exports all repositories
│   ├── routes/
│   │   └── {feature}.rs          ← Route handlers (e.g., responsibility.rs)
│   ├── services/
│   │   ├── {feature}_service.rs  ← Business logic layer (e.g., responsibility_service.rs)
│   │   └── traits/
│   │       ├── mod.rs
│   │       └── {feature}.rs      ← Service traits (e.g., responsibility.rs)
│   ├── models/
│   │   └── mod.rs
│   └── middleware/
│       ├── rls.rs                ← Row-level security (extracts schoolId from headers)
│       ├── rate_limit.rs
│       ├── rate_limiter.rs
│       └── responsibility_permissions.rs

Flutter Mobile (Chatra / Employee):
├── lib/
│   ├── core/network/api_service.dart  ← DO NOT MODIFY (central API)
│   ├── features/{feature}/
│   │   ├── bloc/{feature}_bloc.dart
│   │   ├── bloc/{feature}_event.dart
│   │   ├── bloc/{feature}_state.dart
│   │   ├── widgets/{widget}.dart
│   │   ├── screens/{screen}.dart
│   │   └── {feature}_test.dart
│   └── routes/app_router.dart          ← DO NOT MODIFY (navigation)
```

### Code Mode Specific Rules:

**React:**
```javascript
// ✅ RTK Query pattern (follow existing responsibilityApi.js)
export const featureApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFeatureList: builder.query({
      query: ({ schoolId, params }) => ({
        url: `/feature/${schoolId}`,
        params
      }),
      providesTags: ['FeatureName'],
    }),
    createFeature: builder.mutation({
      query: ({ schoolId, ...body }) => ({
        url: `/feature/${schoolId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FeatureName'],
    }),
  }),
});

// ✅ Page component pattern (follow existing ResponsibilityAnalytics.jsx)
import PageHeader from '../../../components/ui/PageHeader';
import KPIWidget, { KPITile } from '../../../components/ui/KPIWidget';
import { toast } from 'react-toastify';

// ✅ Lazy loading (follow App.jsx pattern)
const FeaturePage = createLazyRoute(() => import('./pages/FeaturePage'));
```

**Rust:**
```rust
// ✅ Repository pattern (follow traits/mod.rs, misc_repo.rs)
pub trait ResponsibilityRepository: Send + Sync {
    async fn get_responsibilities(&self, school_id: &str, employee_type: Option<String>) -> Result<JsonList, AppError>;
    // ... other methods
}

// ✅ Service pattern (follow responsibility_service.rs, services/traits/responsibility.rs)
#[async_trait]
pub trait ResponsibilityService: Send + Sync {
    async fn list_responsibilities(&self, school_id: &str, employee_type: Option<String>) -> AppResult<Vec<Value>>;
    async fn create_responsibility(&self, school_id: &str, admin_id: &str, data: Value) -> AppResult<Value>;
    // ... other methods
}

// ✅ Handler pattern (follow routes/responsibility.rs - direct route functions)
pub async fn list_responsibilities(
    State(state): State<AppState>,
    Path(school_id): Path<String>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let emp_type = params.get("employeeType").cloned();
    let simple = params.get("simple").map(|v| v == "true").unwrap_or(false);
    let paginated = params.get("paginated").map(|v| v == "true").unwrap_or(false);
    
    if paginated {
        let page = params.get("page").and_then(|v| v.parse::<i32>().ok()).unwrap_or(1);
        let limit = params.get("limit").and_then(|v| v.parse::<i32>().ok()).unwrap_or(20);
        
        match state.services.responsibility.list_responsibilities_paginated(&school_id, emp_type, page, limit).await {
            Ok(result) => {
                let mut response = json!({"success": true});
                if let Some(data) = result.get("data") {
                    response["data"] = data.clone();
                }
                if let Some(pagination) = result.get("pagination") {
                    response["pagination"] = pagination.clone();
                }
                Json(response).into_response()
            },
            Err(e) => (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"success": false, "message": e.to_string()})),
            ).into_response(),
        }
    } else {
        // ... rest of implementation (follow existing file)
    }
}

// ✅ Use ? operator, NOT unwrap
let result = some_function().await?; // ✅
let result = some_function().await.unwrap(); // ❌ NEVER in production

// ✅ RLS Middleware pattern (follow middleware/rls.rs)
pub async fn rls_middleware(
    State(_state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Extract school_id from headers (MUST BE PRESENT)
    let school_id = request.headers()
        .get("X-School-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| StatusCode::BAD_REQUEST)?; // School ID required
    
    // ... rest of implementation
}
```

**Flutter:**
```dart
// ✅ BLoC pattern (follow dashboard_bloc.dart)
class ResponsibilityBloc extends Bloc<ResponsibilityEvent, ResponsibilityState> {
  final ApiService apiService;
  ResponsibilityBloc(this.apiService) : super(ResponsibilityInitial()) {
    on<LoadResponsibilities>(_onLoad);
  }
}

// ✅ API call through api_service.dart with schoolId header
Future<Response> getResponsibilities({
  required String schoolId,
}) async {
  return await _dio.get(
    '/responsibility/$schoolId',
    options: Options(headers: {'x-school-id': schoolId}),
  );
}
```

---

## 🟡 SECTION 2: ASK Mode Rules (जब Ask Mode में switch हो)

> **तुम्हारी भूमिका:** Assistant — जवाब दो, explain करो, guide करो

```
📋 ASK MODE काम कैसे करें:

1. कोई code बदलने की बात हो → "Code Mode में switch करो" बोलो
2. Codebase के बारे में question → Existing files, patterns, file paths cite करो
3. Planning सवाल → "Plan Mode में switch करो" suggest करो
4. Testing सवाल → "Debug Mode में switch करो" suggest करो

✅ DO:
- विशेषज्ञ की तरह जवाब दो
- File paths बताओ (e.g., "frontend/Vidhyam/src/features/...")
- Existing code examples दो
- Rules reference करो (.kilo/rules/vidhyam-rules.md)

❌ DON'T:
- Direct code change नहीं — "Code Mode में switch करो"
- Guess मत करो — अगर पता नहीं तो बोलो "Need to check codebase"
```

---

## 🟢 SECTION 3: PLAN Mode Rules (जब Plan Mode में switch हो)

> **तुम्हारी भूमिका:** Planner — plans लिखो, architecture decide करो

```
📋 PLAN MODE काम कैसे करें:

1. हर plan .kilo/plans/ में save करो
2. Plans में reference करो:
   - Which rules apply (vidhyam-rules.md section #)
   - Which files will be affected
   - Cross-platform impact (React + Rust + Flutter)

📝 PLAN TEMPLATE:
```markdown
# Plan: {Feature Name}
> Date: YYYY-MM-DD
> Mode: Plan (will switch to Code for implementation)

## Scope
- What: [description]
- Where: [files/locations affected]
- Platforms: [React / Rust / Flutter / All]

## Rules Reference
- Security: vidhyam-rules.md Section 1 (Critical)
- Pattern: vidhyam-rules.md Section 2.{platform}
- Testing: vidhyam-rules.md Section 5 (Debug)

## Steps
1. [Step 1]
2. [Step 2]
...

## Files to Create/Modify
- [file path 1]
- [file path 2]

## Testing Plan
- [test cases]
```

3. Plan complete होने पर: "Code Mode में switch करो, plan implement करो"
```

---

## 🔴 SECTION 4: DEBUG Mode Rules (जब Debug Mode में switch हो)

> **तुम्हारी भूमिका:** Test Guardian — test करो, verify करो, block करो

```
📋 DEBUG MODE काम कैसे करें:

1. AUTO-RUN TESTS:
   - Rust:  cargo test, cargo clippy, cargo fmt --check
   - React:  npm test, npm run lint, npm run typecheck
   - Flutter: flutter test, flutter analyze, flutter format --check

2. COVERAGE CHECK:
   - Rust:   ≥ 80% line coverage
   - React:  ≥ 70% branch coverage
   - Flutter: ≥ 75% statement coverage

3. BLOCK if:
   - ❌ Any test fails
   - ❌ Coverage below threshold
   - ❌ New code has no test
   - ❌ Lint errors found

4. REPORT:
   - Test results (pass/fail)
   - Coverage percentage
   - Issues found with file paths
   - Suggest fixes

5. CLEAR to deploy only when:
   - ✅ All tests pass
   - ✅ Coverage meets threshold
   - ✅ No lint errors
   - ✅ Code formatted correctly
```

---

## 🟠 SECTION 5: Platform Quick Reference

### React Frontend (Vidhyam / SuperAdmin)
```
API:       RTK Query via baseApi.injectEndpoints()
Icons:     lucide-react
State:     RTK Query > Redux slices > useState
Routing:   react-router-dom v7, lazy load
Styling:   Tailwind CSS via className
Notify:    react-toastify (toast.info/success/error)
Forms:     react-hook-form + zod
```

### Rust Backend
```
DB:        PostgreSQL via sqlx
Pattern:   Repository trait + async handlers
Auth:      JWT middleware
Errors:    Custom AppError + ? operator
Migrations: SQL files in Backend/migrations/
```

### Flutter Mobile (Chatra + Employee)
```
API:       api_service.dart with Dio + interceptors
State:     BLoC pattern
Routing:   app_router.dart
HTTP:      Headers must include x-school-id
Auth:      Check auth state before building UI
```

---

## 📋 Section Index (Quick Lookup)

| Section | Mode | Purpose |
|---------|------|---------|
| Rule 0 | ALL | Critical don'ts and must-dos |
| Section 1 | Code | File structure + code patterns |
| Section 2 | Ask | How to answer questions |
| Section 3 | Plan | How to write plans |
| Section 4 | Debug | Testing + coverage rules |
| Section 5 | ALL | Platform quick reference |

---

## 📌 CEO Reminder

```
Session Start → "Read .kilo/rules/vidhyam-rules.md"
During Work   → Follow the section for your current mode
Switch Mode   → Read the new mode's section above
Session End   → Write summary in .kilo/sessions.md
```