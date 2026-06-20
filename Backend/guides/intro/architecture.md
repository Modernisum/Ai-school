# System Architecture & Tenant Context

Yeh guide batati hai ki kaise requests Vidhyam backend system ko traverse karti hain, Tenant Context ko kaise extract aur propagate kiya jata hai, aur Postgres database aur Redis cache ka layout kaisa hai.

---

## 1. Request Lifecycle & Layered Flow

Saari client requests Axum HTTP routes ke zariye enter hoti hain aur alag-alag layers se hote hue aage badhti hain. Yeh separation modularity ko ensure karta hai aur business logic ko transport schemas se alag rakhta hai.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client / Mobile App
    participant Domain as Domain Layer (axum)
    participant Middleware as Tenant & RLS Middleware
    participant Service as Services Layer (Rust Logic)
    participant Repo as Repository Layer (Postgres/Redis)
    database Postgres as Postgres DB

    Client->>Domain: Send GET /api/school/689225/people/students
    Domain->>Middleware: Intercept header/path parameters
    Note over Middleware: Verify X-School-ID & JWT token.<br/>Inject tenant_id into transaction context.
    Middleware->>Service: Forward request with TenantContext
    Service->>Repo: Invoke list_students(tenant_ctx)
    Repo->>Postgres: SELECT * FROM students WHERE school_id = $1
    Postgres-->>Repo: Return Rows
    Repo-->>Service: Return Vector of Student Models
    Service-->>Domain: Return Domain Models
    Domain-->>Client: Return JSON { success: true, data: [...] }
```

---

## 2. Row-Level Security (RLS) & TenantContext Propagation

Multitenancy ko database-level aur application-level controls ke zariye secure kiya jata hai:

1. **Extraction:** System do jagah par tenant context check karta hai:
   - Route path parameters (jaise `/school/:schoolId/...`)
   - HTTP headers (`X-School-ID`)
2. **Context Setup:** `rls_middleware` school ID ko validate karta hai. Yeh authentication token data (user role aur `admin_id` ke sath) extract karta hai aur `TenantContext` struct ko Axum ke `Extensions` queue mein rakh deta hai.
3. **Database Guardrails:** Jab database pools ek transaction (`tx`) spawn karte hain, toh repository layer database-level session variables initialize karti hai (jaise `app.current_school_id = school_id` set karna). Yeh ensure karta hai ki Postgres row-level security policies doosre schools ke records ko automatically filter out kar dein.

---

## 3. Database & Cache Layout

### Database (Postgres)
Primary relational database persistent structures ko store karta hai:
- `students` / `employees` - core directory tables.
- `attendance` / `attendance_qr_tokens` - check-in logs and dynamics.
- `exams` / `exam_sections` / `exam_submissions` - academic grading data.
- `responsibilities` / `tasks` / `complains` - operational duty logs.
- `referral_coupons` / `fees` / `online_transactions` - billing parameters.

### Cache & Real-Time Engine (Redis)
Redis do primary functions serve karta hai:
1. **Cache Layer:** Active sessions, temporary developer access request parameters, aur vehicles ke latest GPS coordinates store karta hai.
2. **Pub/Sub Broker:** Instant messaging aur alerts ko drive karta hai. Jab koi chat message bheja jata hai ya GPS updates post hote hain, toh yeh events ko specific channels par publish karta hai:
   - `school:{schoolId}:user:{userId}` (Peer Chat)
   - `school:{schoolId}:notifications` (Broadcast Alerts)
   - `school:{schoolId}:transport:{vehicleId}` (GPS coordinate stream)
