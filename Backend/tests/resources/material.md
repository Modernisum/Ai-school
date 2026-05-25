# Resources API — Material Tests

> Base URL: `/api/school/{schoolId}/resources/materials`
> Auth: `X-School-ID` + `X-Admin-ID` headers (RLS middleware)
> Test school: `689225`

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│  routes/materials.rs              HTTP Handlers                   │
│  (src/routes/materials.rs)       Parse request, call service      │
├───────────────────────────────────────────────────────────────────┤
│  services/traits/resource.rs     ResourceService Trait            │
├───────────────────────────────────────────────────────────────────┤
│  services/resource/mod.rs        PostgresResourceService impl     │
│  services/resource/material.rs   MaterialOperations (materials)   │
│  services/material_monitor.rs    MaterialMonitor (shortage)       │
├───────────────────────────────────────────────────────────────────┤
│  repository/traits/resource.rs   ResourceRepository Trait         │
├───────────────────────────────────────────────────────────────────┤
│  repository/resource_repo.rs     PostgresResourceRepository impl  │
│                                  (SQL queries)                    │
└───────────────────────────────────────────────────────────────────┘
```

---

## Material: List

- **Endpoint**: `GET /api/school/689225/resources/materials`
- **Method**: GET
- **Handler**: `materials::list_materials` (`src/routes/materials.rs:22`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/materials.rs` | 30 | `service.list_materials(&school_id, search, filter, page, limit)` |
| 2. Handler | `routes/materials.rs` | 33-40 | Loops: generates signed URLs via `storage.get_public_url(path)` |
| 3. Service trait | `services/traits/resource.rs` | 54 | `async fn list_materials(...)` |
| 4. Service impl | `services/resource/mod.rs` | 72, 80 | `self.material.list_materials(school_id, search, filter, page, limit)` |
| 5. MaterialOps | `services/resource/material.rs` | 35, 43 | `self.repos.resource.get_materials(...)` |
| 6. MaterialOps | `services/resource/material.rs` | 44 | `self.repos.resource.get_materials_dashboard(school_id)` (aggregate stats) |
| 7. Repo impl | `repository/resource_repo.rs` | 365-420 | `SELECT ... FROM materials {dynamic_where} ORDER BY name ASC LIMIT $n OFFSET $m` |

### SQL (dynamic WHERE, resource_repo.rs:365-420)
```sql
-- Count query (line 401):
SELECT COUNT(*) FROM materials WHERE school_id = $1
  [AND (name ILIKE $2 OR description ILIKE $2)]  -- if search
  [AND need_unit > 0]                              -- if filter == "Shortage"
  [AND extra_unit < 5 AND extra_unit > 0]         -- if filter == "Low Stock"
  [AND extra_unit = 0]                             -- if filter == "Out of Stock"

-- Data query (lines 412-418):
SELECT id, name, quantity, unit_price::FLOAT as unit_price, unit,
       extra_unit, need_unit, description, attachment_path
FROM materials {same WHERE} ORDER BY name ASC LIMIT $n OFFSET $m
```

### Action Check ✅
- **Worth it?** ✅ Yes — primary inventory listing
- **Note**: Supports search, filter, and pagination ✅
- **Bug?** ⚠️ `extra_unit` naming is confusing — it means "available stock" not "extra"

### Usage
```bash
# All materials
curl -s "http://localhost:8080/api/school/689225/resources/materials" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .

# Search by keyword
curl -s "http://localhost:8080/api/school/689225/resources/materials?search=micro" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .

# With filter + pagination
curl -s "http://localhost:8080/api/school/689225/resources/materials?filter=Shortage&page=1&limit=10" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## Material: Create

- **Endpoint**: `POST /api/school/689225/resources/materials`
- **Method**: POST
- **Handler**: `materials::create_material` (`src/routes/materials.rs:53`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/materials.rs` | 60 | `service.create_material(&school_id, &admin_id, serde_json::to_value(payload)?)` |
| 2. Handler | `routes/materials.rs` | 61-67 | `publish_responsibility_event(MaterialCreated{...})` |
| 3. Service impl | `services/resource/mod.rs` | 59, 65 | `self.material.create_material(school_id, admin_id, data)` |
| 4. MaterialOps | `services/resource/material.rs` | 22 | `self.repos.resource.add_material(school_id, data)` |
| 5. MaterialOps | `services/resource/material.rs` | 24-31 | `self.repos.audit.log_action(..., "CREATE", ...)` |
| 6. Repo impl | `repository/resource_repo.rs` | 50-73 | `INSERT INTO materials ... ON CONFLICT DO UPDATE` |

### SQL (resource_repo.rs:60)
```sql
INSERT INTO materials (school_id, name, quantity, unit_price, unit, description, attachment_path, extra_unit)
VALUES ($1, $2, $3, $4, $5, $6, $7, $3)
ON CONFLICT (school_id, name) DO UPDATE SET
    quantity = materials.quantity + EXCLUDED.quantity,
    extra_unit = materials.extra_unit + EXCLUDED.quantity,
    description = EXCLUDED.description,
    attachment_path = EXCLUDED.attachment_path,
    unit = COALESCE(EXCLUDED.unit, materials.unit),
    unit_price = EXCLUDED.unit_price
```

### Action Check ✅
- **Worth it?** ✅ Yes — adding items to inventory
- **Note**: Uses **upsert** (`ON CONFLICT DO UPDATE`) — if material exists, quantity is **incremented**
- **Bug?** ⚠️ `extra_unit = materials.extra_unit + EXCLUDED.quantity` — on conflict, the extra_unit uses `EXCLUDED.quantity` (which is the total new quantity). But on initial insert, `extra_unit` = `$3` (same as quantity). This is correct for simple cases but could be confusing.

### Usage
```bash
curl -s -X POST "http://localhost:8080/api/school/689225/resources/materials" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{
    "materialName": "TestMat-Microscope",
    "quantity": 10,
    "unitPrice": 15000.0,
    "unit": "pieces",
    "description": "Optical microscope 1000x"
  }' | jq .
```

---

## Material: Get

- **Endpoint**: `GET /api/school/689225/resources/materials/{materialName}`
- **Method**: GET
- **Handler**: `materials::get_material` (`src/routes/materials.rs:44`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/materials.rs` | 48 | `service.get_material(&school_id, &material_name)` |
| 2. Handler | `routes/materials.rs` | 49 | `.ok_or_else(|| NotFound(...))` — returns 404 if None |
| 3. Service impl | `services/resource/mod.rs` | 83-84 | `self.material.get_material(school_id, material_name)` |
| 4. MaterialOps | `services/resource/material.rs` | 54-55 | `self.repos.resource.get_material(school_id, material_name)` |
| 5. Repo impl | `repository/resource_repo.rs` | 79-112 | 3 queries: material + spaces + history |

### SQL (resource_repo.rs:79-112)
```sql
-- 1. Get material record
SELECT * FROM materials WHERE school_id = $1 AND name = $2
-- 2. Get space assignments
SELECT space_name, quantity FROM space_materials WHERE school_id = $1 AND material_id = $2
-- 3. Get recent history (last 50)
SELECT * FROM material_history WHERE school_id = $1 AND material_id = $2 ORDER BY created_at DESC LIMIT 50
```

### Action Check ✅
- **Worth it?** ✅ Yes — material detail view
- **Note**: Returns 3 datasets in one call (material + spaces + history) ✅
- **Bug?** ⚠️ Returns `SELECT *` instead of explicit columns

### Usage
```bash
curl -s "http://localhost:8080/api/school/689225/resources/materials/TestMat-Microscope" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## Material: Update

- **Endpoint**: `PATCH /api/school/689225/resources/materials/{materialName}`
- **Method**: PATCH
- **Handler**: `materials::update_material` (`src/routes/materials.rs:71`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/materials.rs` | 77 | `service.update_material(&school_id, &admin_id, &material_name, payload)` |
| 2. Handler | `routes/materials.rs` | 78-84 | `publish(MaterialUpdated{...})` |
| 3. Service impl | `services/resource/mod.rs` | 87, 94 | `self.material.update_material(school_id, admin_id, name, data)` |
| 4. MaterialOps | `services/resource/material.rs` | 58, 65-68 | `self.repos.resource.update_material(school_id, admin_id, name, data)` |
| 5. MaterialOps | `services/resource/material.rs` | 70-77 | `self.repos.audit.log_action(..., "UPDATE", ...)` |
| 6. Repo impl | `repository/resource_repo.rs` | 136-215 | Multi-path in TRANSACTION |

### SQL (resource_repo.rs:136-215, in transaction)

**Path A — Purchase (if `quantity` + `unitPrice` both present):**
```sql
SELECT need_unit, extra_unit FROM materials WHERE school_id = $1 AND name = $2
UPDATE materials SET quantity = quantity + $1, need_unit = need_unit - $2,
    extra_unit = extra_unit + $3, unit_price = $4
WHERE school_id = $5 AND name = $6
INSERT INTO material_history (...) VALUES (... 'PURCHASE', ...)
```

**Path B — Standard (if only `quantity`):**
```sql
UPDATE materials SET quantity = $1, extra_unit = $1 - need_unit
WHERE school_id = $2 AND name = $3
```

**Path C — Descriptive fields:**
```sql
UPDATE materials SET unit = $1 WHERE school_id = $2 AND name = $3
UPDATE materials SET description = $1 WHERE school_id = $2 AND name = $3
```

### Action Check ✅
- **Worth it?** ✅ Yes — editing material information
- **Note**: Properly uses transaction ✅
- **Note**: **Same endpoint handles both "update" and "buy"** — if you send `quantity` + `unitPrice`, it treats it as a purchase
- **Bug?** ⚠️ Path A reduces `need_unit` — this assumes a purchase reduces the shortage. May not always be the intent.

### Usage
```bash
curl -s -X PATCH "http://localhost:8080/api/school/689225/resources/materials/TestMat-Microscope" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated — Advanced Microscope with LED",
    "unitPrice": 18000.0
  }' | jq .
```

---

## Material: Delete

- **Endpoint**: `DELETE /api/school/689225/resources/materials/{materialName}`
- **Method**: DELETE
- **Handler**: `materials::delete_material` (`src/routes/materials.rs:88`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/materials.rs` | 93 | `service.delete_material(&school_id, &admin_id, &material_name)` |
| 2. Handler | `routes/materials.rs` | 94-100 | `publish(MaterialDeleted{...})` |
| 3. Service impl | `services/resource/mod.rs` | 101, 107 | `self.material.delete_material(school_id, admin_id, name)` |
| 4. MaterialOps | `services/resource/material.rs` | 81, 87 | First: `self.repos.resource.get_material(school_id, name)` (check exists) |
| 5. MaterialOps | `services/resource/material.rs` | 90 | Then: `self.repos.resource.delete_material(school_id, name)` |
| 6. Repo impl | `repository/resource_repo.rs` | 466-468 | `DELETE FROM materials WHERE school_id = $1 AND name = $2` |

### Action Check — Bug Found! ❌
- **Worth it?** ✅ Yes — removing obsolete materials
- **Bug?** ❌ **Does NOT check if material is assigned to spaces.** Deleting a material that's assigned to a space will cause orphaned records in `space_materials` table.
- **Bug?** ❌ **Does NOT use a transaction.** The `get_material()` check and `delete_material()` are separate — race condition possible.
- **Fix**: Should check `space_materials` for references and either block deletion or cascade.

### Usage
```bash
curl -s -X DELETE "http://localhost:8080/api/school/689225/resources/materials/TestMat-OldItem" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## Material: Buy (Stock In)

- **Endpoint**: `POST /api/school/689225/resources/materials/{materialName}/buy`
- **Method**: POST
- **Handler**: `materials::buy_material` (`src/routes/materials.rs:104`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/materials.rs` | 110-114 | **Calls `service.update_material()`** — same as PATCH update! |
| 2. Handler | `routes/materials.rs` | 115-121 | `publish(MaterialUpdated{...})` |

### Action Check ⚠️
- **Worth it?** ✅ Yes — stock procurement
- **Note**: This is just a **wrapper** around `update_material`. The "buy" behavior is triggered by sending both `quantity` and `unitPrice`.
- **Bug?** ⚠️ No separate "buy" history record — it goes through the same PATCH path which records as `PURCHASE` in history
- **Improvement**: Could be merged with `PATCH` endpoint (same behavior)

### Usage
```bash
curl -s -X POST "http://localhost:8080/api/school/689225/resources/materials/TestMat-Microscope/buy" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 5,
    "unitPrice": 15000.0
  }' | jq .
```

---

## Material: Sell (Stock Out)

- **Endpoint**: `POST /api/school/689225/resources/materials/{materialName}/sell`
- **Method**: POST
- **Handler**: `materials::sell_material` (`src/routes/materials.rs:125`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/materials.rs` | 131-135 | `service.sell_material(&school_id, &admin_id, &material_name, payload)` |
| 2. Handler | `routes/materials.rs` | 136-142 | `publish(MaterialUpdated{...})` |
| 3. Service impl | `services/resource/mod.rs` | 114, 121 | `self.material.sell_material(school_id, admin_id, name, data)` |
| 4. MaterialOps | `services/resource/material.rs` | 104, 111 | `self.repos.resource.sell_material(school_id, admin_id, name, data)` |
| 5. Repo impl | `repository/resource_repo.rs` | 476-519 | Multi-step in TRANSACTION |

### SQL (resource_repo.rs:476-519, in transaction)
```sql
-- 1. Check availability
SELECT id, extra_unit FROM materials WHERE school_id = $1 AND name = $2
-- If extra_avail < sell_qty → ERROR "Insufficient stock"
-- 2. Decrement
UPDATE materials SET quantity = quantity - $1, extra_unit = extra_unit - $1
WHERE school_id = $2 AND id = $3
-- 3. Record history
INSERT INTO material_history (school_id, material_id, action_type, quantity, unit_price, total_amount, actor_id, notes)
VALUES ($1, $2, 'SELL', $3, $4, $5, $6, $7)
```

### Action Check — Bug Found! ❌
- **Worth it?** ✅ Yes — stock distribution tracking
- **Note**: Properly validates stock BEFORE decrementing ✅
- **Note**: Uses transaction ✅
- **Bug?** ❌ **Missing audit log.** All other mutating operations (create, update, delete) log via `audit.log_action()`. `sell_material` does NOT.
- **Bug?** ⚠️ `sell_material` in `material.rs:104` passes `admin_id` to repo but repo ignores it (line 476 `sell_material` takes it but doesn't use it in the SQL)

### Usage
```bash
curl -s -X POST "http://localhost:8080/api/school/689225/resources/materials/TestMat-Microscope/sell" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 2
  }' | jq .
```

---

## Material: History

- **Endpoint**: `GET /api/school/689225/resources/materials/{materialName}/history`
- **Method**: GET
- **Handler**: `materials::get_material_history` (`src/routes/materials.rs:146`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/materials.rs` | 152-161 | **Inline SQL** — resolves material name → id via raw query |
| 2. Handler | `routes/materials.rs` | 162 | `service.get_material_history(&school_id, &material_id)` |
| 3. Service impl | `services/resource/mod.rs` | 232-233 | `self.material.get_material_history(school_id, material_id)` |
| 4. MaterialOps | `services/resource/material.rs` | 119-120 | `self.repos.resource.get_material_history(school_id, material_id)` |
| 5. Repo impl | `repository/resource_repo.rs` | 844-860 | `SELECT * FROM material_history WHERE school_id = $1 AND material_id = $2 ORDER BY created_at DESC LIMIT 100` |

### SQL
```sql
-- Inline in handler (routes/materials.rs:153):
SELECT id FROM materials WHERE school_id = $1 AND name = $2

-- In repo (resource_repo.rs:850):
SELECT * FROM material_history WHERE school_id = $1 AND material_id = $2 ORDER BY created_at DESC LIMIT 100
```

### Action Check — Bug Found! ❌
- **Worth it?** ✅ Yes — audit trail
- **Bug?** ❌ **Inline SQL in route handler** at line 152-161 — this logic should be in the repository layer. It's the only route with direct SQL in the handler.
- **Fix**: Move the name→ID resolution to `repo.get_material_history()` or `service.get_material_history()`

### Usage
```bash
curl -s "http://localhost:8080/api/school/689225/resources/materials/TestMat-Microscope/history" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## Shortage: Summary

- **Endpoint**: `GET /api/school/689225/resources/materials/shortage-summary`
- **Method**: GET
- **Handler**: `materials::get_shortage_summary` (`src/routes/materials.rs:166`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/materials.rs` | 170 | **Calls `state.services.material_monitor`** — NOT `services.resource` |
| 2. Monitor | `services/material_monitor.rs` | 192-193 | `self.check_space_shortages(school_id)` |
| 3. Monitor | `services/material_monitor.rs` | 20-37 | SQL: find deficits |

### SQL (material_monitor.rs:20-37)
```sql
SELECT req.space_name, req.material_name, req.required_count,
       COALESCE(sm.quantity, 0) as available_count
FROM space_material_requirements req
LEFT JOIN space_materials sm
  ON sm.school_id = req.school_id
 AND sm.space_name = req.space_name
 AND sm.material_name = req.material_name
WHERE req.school_id = $1
  AND req.required_count > 0
  AND COALESCE(sm.quantity, 0) < req.required_count
ORDER BY req.space_name, req.material_name
```

### Action Check ✅
- **Worth it?** ✅ Yes — dashboard widget data source
- **Note**: This goes through `material_monitor` service, NOT `resource` service (different dependency)

### Usage
```bash
curl -s "http://localhost:8080/api/school/689225/resources/materials/shortage-summary" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## Shortage: Run Check

- **Endpoint**: `POST /api/school/689225/resources/materials/run-shortage-check`
- **Method**: POST
- **Handler**: `materials::run_shortage_check` (`src/routes/materials.rs:174`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/materials.rs` | 178 | `state.services.material_monitor.check_and_alert_school(&school_id)` |
| 2. Monitor | `services/material_monitor.rs` | 73-188 | Full check + alert creation + notification |

### Action Check ✅
- **Worth it?** ✅ Yes — proactive deficit alerting
- **Note**: Creates alerts in `material_alert_log` table, notifications, and tasks
- **Improvement**: Could run automatically on schedule rather than requiring manual trigger

### Usage
```bash
curl -s -X POST "http://localhost:8080/api/school/689225/resources/materials/run-shortage-check" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

---

## Bulk Import

- **Endpoint**: `POST /api/school/689225/resources/materials/bulk`
- **Method**: POST
- **Handler**: `materials::bulk_import_materials` (`src/routes/materials.rs:186`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/materials.rs` | 192-225 | Iterates array, calls `service.create_material()` for EACH row |
| 2. Handler | `routes/materials.rs` | 227-233 | `publish(MaterialUpdated{...})` |

### Action Check ⚠️
- **Worth it?** ✅ Yes — onboarding convenience
- **Bug?** ❌ **No transaction** — each row is processed independently via `create_material()`. If row 3 fails, rows 1-2 are already committed. No rollback.
- **Bug?** ❌ **No duplicate detection** — each row calls `add_material()` which does `ON CONFLICT DO UPDATE`, so re-importing same data doubles quantities silently
- **Improvement**: Wrap in transaction or use proper bulk INSERT

### Usage
```bash
curl -s -X POST "http://localhost:8080/api/school/689225/resources/materials/bulk" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{
    "materials": [
      {
        "Material Name": "Bulk-Mat-A",
        "Quantity": 100,
        "Unit Price": 50.0
      },
      {
        "Material Name": "Bulk-Mat-B",
        "Quantity": 200,
        "Unit Price": 30.0
      }
    ]
  }' | jq .
```

---

## ⚠️ All Issues Found (Action Check Summary)

| # | Issue | File:Line | Severity | Fix |
|---|-------|-----------|----------|-----|
| 1 | **`delete_material` doesn't check space assignments** — orphan risk | `resource_repo.rs:466` | **High** | Check `space_materials` before delete |
| 2 | **`sell_material` missing audit log** | `material.rs:104-111` | Medium | Add `audit.log_action()` call |
| 3 | **`get_material_history` has inline SQL in route handler** | `routes/materials.rs:152-161` | Medium | Move name→ID resolution to repo |
| 4 | **Bulk import has NO transaction** — partial commits on failure | `routes/materials.rs:203-225` | Medium | Wrap in transaction |
| 5 | **Bulk import duplicates data silently** (ON CONFLICT DO UPDATE) | `routes/materials.rs:203-225` | Medium | Add `updateExisting` flag |
| 6 | **`update_material` reduces `need_unit` on purchase** — may be unintended | `resource_repo.rs:159-165` | Low | Re-evaluate purchase logic |
| 7 | **`sell_material` repo ignores `admin_id` param** | `resource_repo.rs:476` | Low | Use or remove parameter |
