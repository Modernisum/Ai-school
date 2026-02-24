# Super Admin Panel — Implementation Plan

## What This Builds

A **completely separate Super Admin portal** (new Vite project at `SuperAdmin/`) with its own login,
separate from the school's main app. It calls a new `/api/admin/*` protected backend API 
to manage all registered schools.

> [!IMPORTANT]
> **Amendment 1 — Setup page migrated:** The "New School Setup" form is removed from the main
> school app and lives **only inside the SuperAdmin portal**. The existing backend `/api/setup/school`
> is reused as-is.
> 
> **Amendment 2 — Backup & Security:** Full data export [(JSON)](file:///home/shivnk/.gemini/antigravity/playground/deep-helix/Ai-school/Admin/src/App.js#32-68) and import from local file
> added for each school and for all schools combined.

---

## Database Schema — New Columns Needed

We need to add a few columns to the `schools` table and ensure the [tokens](file:///home/shivnk/.gemini/antigravity/playground/deep-helix/Ai-school/Backend/src/repository/postgres.rs#101-107) table supports session management:

```sql
-- Add status columns to schools table
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',       -- 'active' | 'blocked' | 'inactive'
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS session_duration_hours INTEGER NOT NULL DEFAULT 24, -- custom session time per school
  ADD COLUMN IF NOT EXISTS notification JSONB DEFAULT NULL;                     -- pending notification to show school

-- Super admin credentials table (for super admin login)
CREATE TABLE IF NOT EXISTS super_admin (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
-- Seed default super admin (password: admin123 - must change in prod)
INSERT INTO super_admin (username, password_hash)
VALUES ('superadmin', '$2b$12$...') ON CONFLICT DO NOTHING;
```

---

## Backend — New API Endpoints

All under `/api/admin/*` prefix, protected by a super-admin auth middleware (Bearer token).

### Admin Auth
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/admin/login` | Super admin login → returns JWT |
| `POST` | `/api/admin/verify` | Verify super admin token |

### School Management
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/schools` | **List all schools** with ID, name, status, created_at, session time, password hash |
| `GET` | `/api/admin/schools/:schoolId` | Get single school full detail |
| `PUT` | `/api/admin/schools/:schoolId` | Edit school details (name, address, board, etc.) |
| `DELETE` | `/api/admin/schools/:schoolId` | Delete school + all related data |
| `PATCH` | `/api/admin/schools/:schoolId/status` | Set status: `active / blocked / inactive` |
| `PATCH` | `/api/admin/schools/:schoolId/password` | Change school admin password |
| `PATCH` | `/api/admin/schools/:schoolId/session` | Set session duration (hours) |
| `DELETE` | `/api/admin/schools/:schoolId/sessions` | Expire all active sessions (logout) |
| `GET` | `/api/admin/schools/:schoolId/sessions` | Monitor active sessions + expiry time |
| `POST` | `/api/admin/schools/:schoolId/notify` | Send a notification to a school (stores in DB, cleared on dismiss) |
| `DELETE` | `/api/admin/schools/:schoolId/notify` | Clear/dismiss a school's notification |

### Backup & Restore (NEW)
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/schools/:schoolId/export` | Export **one school's** complete data as downloadable JSON |
| `GET` | `/api/admin/schools/export/all` | Export **all schools'** complete data as one JSON file |
| `POST` | `/api/admin/schools/:schoolId/import` | Import / restore a school's data from uploaded JSON file |

> The export includes: school details, all students, all employees, classes, fees, attendance, documents — everything from all related tables joined by [school_id](file:///home/shivnk/.gemini/antigravity/playground/deep-helix/Ai-school/Backend/src/repository/postgres.rs#123-136).

### School Registration
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/setup/school` | *(existing)* — Called from SuperAdmin portal to add a new school |

---

## New Files — Backend

### `src/routes/admin.rs` [NEW]
All route handlers for admin operations + export/import handlers.

### `src/services/admin_service.rs` [NEW]
Service layer: DB queries for all admin operations + data export aggregation.

### [src/routes/mod.rs](file:///home/shivnk/.gemini/antigravity/playground/deep-helix/Ai-school/Backend/src/routes/mod.rs) [MODIFY]
Add `pub mod admin;`

### [src/main.rs](file:///home/shivnk/.gemini/antigravity/playground/deep-helix/Ai-school/Backend/src/main.rs) [MODIFY]
Register all admin routes under `/api/admin`.

### [src/db.rs](file:///home/shivnk/.gemini/antigravity/playground/deep-helix/Ai-school/Backend/src/db.rs) [MODIFY]
Add `ALTER TABLE` migrations to add `status`, `is_blocked`, `session_duration_hours`, `notification` columns.

---

## New Files — Super Admin Frontend

A **new standalone Vite + React app** at:
```
/home/shivnk/.gemini/antigravity/playground/deep-helix/Ai-school/SuperAdmin/
```

### Pages
| Page | Description |
|---|---|
| `/` Login | Super admin login form |
| `/dashboard` | Stats overview: total schools, active, blocked, new this month |
| `/schools` | Main schools list with search, filter by status/date, sort by age |
| `/schools/:id` | School detail & edit page |
| `/schools/:id/sessions` | Session monitor for a specific school |
| `/setup` | **Add new school** (setup form migrated here from the main app) |
| `/backup` | **Backup & Restore** — export any school / all schools, import from file |

### Key UI Features
- **Schools Table**: school name, ID, password (masked toggleable), registered date, status badge, session duration, actions
- **Filter Bar**: by status, by date range (new/old), search by name/ID
- **Quick Actions per row**: Block 🚫 | Expire Session 🔑 | Notify 🔔 | Edit ✏️ | Export ⬇️ | Delete 🗑️
- **Session Monitor**: shows token expiry countdowns per school
- **Notification Modal**: stored in `schools.notification` jsonb, shown on school dashboard until dismissed
- **Add School**: setup form lives here now (removed from main school app)
- **Backup Page**:
  - Export single school → downloads `school_<id>_backup.json`
  - Export all schools → downloads `all_schools_backup_<date>.json`
  - Import: file picker → validates JSON → calls `/import` endpoint → confirms restore

---

## Implementation Order

1. **[DB]** Add schema columns + `super_admin` table in [db.rs](file:///home/shivnk/.gemini/antigravity/playground/deep-helix/Ai-school/Backend/src/db.rs)
2. **[Backend]** Write `admin_service.rs` — all queries including export aggregation across all tables
3. **[Backend]** Write `admin.rs` route handlers (list, block, password, session, notify, export, import)
4. **[Backend]** Register routes in [main.rs](file:///home/shivnk/.gemini/antigravity/playground/deep-helix/Ai-school/Backend/src/main.rs) with super admin JWT middleware
5. **[Frontend]** Create `SuperAdmin/` Vite app scaffold
6. **[Frontend]** Login → Dashboard → Schools list → School detail → Session monitor
7. **[Frontend]** Setup page (migrated from main school app)
8. **[Frontend]** Backup page: export single / export all / import file picker
8. **[Frontend]** Wire all API calls to the backend endpoints

---

## Verification Plan

### Automated Tests (via curl)
```bash
# Login as super admin
curl -X POST http://localhost:8080/api/admin/login -d '{"username":"superadmin","password":"admin123"}'

# List all schools
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/admin/schools

# Block a school
curl -X PATCH -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/admin/schools/S000001/status \
  -d '{"status":"blocked"}'
```

### Manual Verification
1. Open SuperAdmin portal → login works
2. Schools list shows all registered schools with correct details
3. Block a school → school's login fails immediately
4. Send notification → school sees modal on next load
5. Expire session → school is logged out immediately
