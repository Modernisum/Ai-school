# Resources API — Space Tests

> Base URL: `/api/school/{schoolId}/resources/spaces`
> Auth: `X-School-ID` + `X-Admin-ID` headers (RLS middleware)
> Test school: `689225`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  routes/spaces.rs              HTTP Handlers                    │
│  (src/routes/spaces.rs)        Parse request, call service      │
├─────────────────────────────────────────────────────────────────┤
│  services/traits/resource.rs   ResourceService Trait            │
├─────────────────────────────────────────────────────────────────┤
│  services/resource/mod.rs      PostgresResourceService impl     │
│  services/resource/inventory.rs InventoryOperations (spaces)    │
├─────────────────────────────────────────────────────────────────┤
│  repository/traits/resource.rs ResourceRepository Trait         │
├─────────────────────────────────────────────────────────────────┤
│  repository/resource_repo.rs   PostgresResourceRepository impl  │
│                                (SQL queries)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Category: List

- **Endpoint**: `GET /api/school/689225/resources/spaces/categories`
- **Method**: GET
- **Handler**: `spaces::list_space_categories` (`src/routes/spaces.rs:36`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 40 | `state.services.resource.list_space_categories(&school_id)` |
| 2. Service trait | `services/traits/resource.rs` | 124 | `async fn list_space_categories()` |
| 3. Service impl | `services/resource/mod.rs` | 175-177 | `self.inventory.list_space_categories(school_id)` |
| 4. Inventory | `services/resource/inventory.rs` | 42-44 | `self.repos.resource.get_space_categories(school_id)` |
| 5. Repo impl | `repository/resource_repo.rs` | 605-615 | `SELECT DISTINCT space_category FROM spaces WHERE school_id = $1 AND space_category IS NOT NULL` |

### SQL
```sql
SELECT DISTINCT space_category FROM spaces WHERE school_id = $1 AND space_category IS NOT NULL
```

### Action Check ✅
- **Worth it?** ✅ Yes — needed for category dropdowns in UI
- **Bug?** ❌ Categories come from `spaces` table (`DISTINCT space_category`), NOT from `space_categories` table. If a category is created via `POST /spaces/categories` but no space uses it yet, it won't appear in this list.
- **Fix**: Should `UNION` with `space_categories` table, or use `space_categories` as primary source

### Usage
```bash
curl -s "http://localhost:8080/api/school/689225/resources/spaces/categories" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

**Response:**
```json
{
  "success": true,
  "categories": ["TestCat-Science", "TestCat-Art"]
}
```

---

## Category: Create

- **Endpoint**: `POST /api/school/689225/resources/spaces/categories`
- **Method**: POST
- **Handler**: `spaces::create_space_category` (`src/routes/spaces.rs:44`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 51-55 | `state.services.resource.create_space_category(&school_id, &admin_id, &name)` |
| 2. Handler | `routes/spaces.rs` | 56-62 | `publish_responsibility_event(ResponsibilityEvent::CategoryCreated{...})` |
| 3. Service trait | `services/traits/resource.rs` | 125 | `async fn create_space_category()` |
| 4. Service impl | `services/resource/mod.rs` | 179-181 | `self.inventory.create_space_category(school_id, admin_id, name)` |
| 5. Inventory | `services/resource/inventory.rs` | 52 | `self.repos.resource.create_space_category(school_id, name)` |
| 6. Inventory | `services/resource/inventory.rs` | 54-61 | `self.repos.audit.log_action(..., "SPACE_CATEGORY", "CREATE", ...)` |
| 7. Repo impl | `repository/resource_repo.rs` | 617-645 | `INSERT INTO space_categories` (after duplicate check) |

### SQL
```sql
-- Step 1: Check duplicate
SELECT name FROM space_categories WHERE school_id = $1 AND name = $2
-- Step 2: Insert
INSERT INTO space_categories (school_id, name) VALUES ($1, $2)
```

### Action Check ✅
- **Worth it?** ✅ Yes — dynamic category creation from UI
- **Bug?** ❌ `CreateSpaceCategoryRequest` has `is_default: bool` field but SQL only stores `name`
- **Bug?** ⚠️ No length validation on category name

### Usage
```bash
curl -s -X POST "http://localhost:8080/api/school/689225/resources/spaces/categories" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TestCat-Science",
    "isDefault": false
  }' | jq .
```

**Response:**
```json
{
  "success": true,
  "category": {
    "name": "TestCat-Science"
  }
}
```

---

## Category: Delete

- **Endpoint**: `DELETE /api/school/689225/resources/spaces/categories/{categoryName}`
- **Method**: DELETE
- **Handler**: `spaces::delete_space_category` (`src/routes/spaces.rs:66`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 71-75 | `state.services.resource.delete_space_category(&school_id, &admin_id, &name)` |
| 2. Handler | `routes/spaces.rs` | 76-83 | `publish_responsibility_event(CategoryDeleted{...})` |
| 3. Service impl | `services/resource/mod.rs` | 183-185 | `self.inventory.delete_space_category(school_id, admin_id, name)` |
| 4. Inventory | `services/resource/inventory.rs` | 71 | `self.repos.resource.delete_space_category(school_id, name)` |
| 5. Inventory | `services/resource/inventory.rs` | 73-80 | `self.repos.audit.log_action(..., "DELETE", ...)` |
| 6. Repo impl | `repository/resource_repo.rs` | 647-655 | `DELETE FROM space_categories WHERE school_id = $1 AND name = $2` |

### Action Check ⚠️
- **Worth it?** ✅ Yes — category management
- **Bug?** ❌ Deleting a category does NOT check if spaces still use it. Could orphan spaces.
- **Bug?** ❌ The `list_space_categories` reads from `spaces.space_category` column, not `space_categories` table, so this delete might have no visible effect on the listing.

### Usage
```bash
curl -s -X DELETE "http://localhost:8080/api/school/689225/resources/spaces/categories/TestCat-ToDelete" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

**Response:**
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

## Space: Create

- **Endpoint**: `POST /api/school/689225/resources/spaces/{category}`
- **Method**: POST
- **Handler**: `spaces::create_space_by_category` (`src/routes/spaces.rs:86`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 92-98 | `service.create_space_by_category(&school_id, &admin_id, &category, space_name, description)` |
| 2. Handler | `routes/spaces.rs` | 99-106 | `publish_responsibility_event(SpaceCreated{...})` |
| 3. Service trait | `services/traits/resource.rs` | 115-122 | `async fn create_space_by_category(..., name, description)` |
| 4. Service impl | `services/resource/mod.rs` | 160-168 | `self.inventory.create_space_by_category(...)` |
| 5. Inventory | `services/resource/inventory.rs` | 25 | `self.repos.resource.create_space(school_id, category, name, description)` |
| 6. Inventory | `services/resource/inventory.rs` | 27-33 | `self.repos.audit.log_action(..., "SPACE", "CREATE", ...)` |
| 7. Repo impl | `repository/resource_repo.rs` | 534-580 | `INSERT INTO spaces (school_id, space_id, name, space_category, data)` |

### SQL
```sql
-- Check duplicate
SELECT name FROM spaces WHERE school_id = $1 AND name = $2
-- Insert
INSERT INTO spaces (school_id, space_id, name, space_category, data)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (school_id, space_id) DO NOTHING
```

Where:
- `space_id` = `"{name}-{schoolId[..4]}"` (auto-generated, line 550)
- `data` = `{"name": name, "category": category, "description": "..."}` (optional description)

### Action Check ✅
- **Worth it?** ✅ Yes — core functionality
- **Bug?** ❌ `space_id` = `format!("{}-{}", name, &school_id[..4])` is fragile. If `school_id` is less than 4 chars, panics. Also not guaranteed unique.
- **Bug?** ❌ `ON CONFLICT DO NOTHING` — if space_id collision, silently fails (no error returned)
- **Bug?** ⚠️ No validation for empty `spaceName`
- **Bug?** ⚠️ No validation that `category` exists in `space_categories` table

### Usage
```bash
curl -s -X POST "http://localhost:8080/api/school/689225/resources/spaces/TestCat-Science" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{
    "spaceName": "PhysicsLab-A",
    "description": "Physics laboratory for class 11-12 experiments"
  }' | jq .
```

**Response:**
```json
{
  "success": true,
  "space": {
    "spaceName": "PhysicsLab-A",
    "spaceCategory": "TestCat-Science",
    "description": "Physics laboratory for class 11-12 experiments"
  }
}
```

---

## Space: List

- **Endpoint**: `GET /api/school/689225/resources/spaces`
- **Method**: GET
- **Handler**: `spaces::list_spaces` (`src/routes/spaces.rs:14`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 22 | `service.list_spaces(&school_id, category)` |
| 2. Service trait | `services/traits/resource.rs` | 123 | `async fn list_spaces(&self, school_id, category: Option<&str>)` |
| 3. Service impl | `services/resource/mod.rs` | 171-173 | `self.inventory.list_spaces(school_id, category)` |
| 4. Inventory | `services/resource/inventory.rs` | 38-40 | `self.repos.resource.get_spaces(school_id, category)` |
| 5. Repo impl | `repository/resource_repo.rs` | 582-603 | `SELECT * FROM spaces WHERE school_id = $1 [AND space_category = $2]` |

### SQL
```sql
-- Without category filter:
SELECT * FROM spaces WHERE school_id = $1
-- With category filter:
SELECT * FROM spaces WHERE school_id = $1 AND space_category = $2
```

### Action Check ⚠️
- **Worth it?** ✅ Yes — primary listing
- **Bug?** ❌ **Missing `description` field in response!** The repo maps only: `name`, `spaceName`, `spaceId`, `spaceCategory`, `budget`. The `description` is stored in `data` column but NOT extracted. Frontend never sees it.
- **Bug?** ❌ No pagination (unlike materials which has `?page=`/`?limit=`)
- **Bug?** ⚠️ `SELECT *` instead of explicit columns — fragile if schema changes

### Usage
```bash
# All spaces
curl -s "http://localhost:8080/api/school/689225/resources/spaces" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .

# Filter by category
curl -s "http://localhost:8080/api/school/689225/resources/spaces?category=TestCat-Science" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .

# Simple mode (name only)
curl -s "http://localhost:8080/api/school/689225/resources/spaces?simple=true" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## Space: Get Details

- **Endpoint**: `GET /api/school/689225/resources/spaces/detail/{spaceName}`
- **Method**: GET
- **Handler**: `spaces::get_space_details` (`src/routes/spaces.rs:150`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 154-158 | `service.get_space_details(&school_id, &space_name)` |
| 2. Service impl | `services/resource/mod.rs` | 206-212 | `self.inventory.get_space_details(school_id, space_name)` |
| 3. Inventory | `services/resource/inventory.rs` | 126-132 | `self.repos.resource.get_space_details(school_id, space_name)` |
| 4. Repo impl | `repository/resource_repo.rs` | 657-677 | `SELECT * FROM spaces WHERE school_id = $1 AND (name = $2 OR space_id = $2)` |

### SQL
```sql
SELECT * FROM spaces WHERE school_id = $1 AND (name = $2 OR space_id = $2 OR space_name = $2)
```

### Action Check ✅
- **Worth it?** ✅ Yes — detail view
- **Note**: This IS the only space endpoint that returns the full `data` JSON column (including `description`)
- **Note**: `space_name` column doesn't exist in the schema, so the `OR space_name = $2` clause always evaluates to false

### Usage
```bash
curl -s "http://localhost:8080/api/school/689225/resources/spaces/detail/PhysicsLab-A" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## Space: Update

- **Endpoint**: `PUT /api/school/689225/resources/spaces/detail/{spaceName}`
- **Method**: PUT
- **Handler**: `spaces::update_space` (`src/routes/spaces.rs:109`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 115-119 | `service.update_space(&school_id, &admin_id, &space_name, payload)` |
| 2. Handler | `routes/spaces.rs` | 120-127 | `publish_responsibility_event(SpaceUpdated{...})` |
| 3. Service impl | `services/resource/mod.rs` | 187-195 | `self.inventory.update_space(school_id, admin_id, space_name, data)` |
| 4. Inventory | `services/resource/inventory.rs` | 91-93 | `self.repos.resource.update_space(school_id, space_name, data)` |
| 5. Inventory | `services/resource/inventory.rs` | 96-103 | `self.repos.audit.log_action(..., "UPDATE", ...)` |
| 6. Repo impl | `repository/resource_repo.rs` | 680-705 | `UPDATE spaces SET name=COALESCE($1,name), space_category=COALESCE($2,space_category), data=data\|\|$3` |

### SQL
```sql
UPDATE spaces SET 
    name = COALESCE($1, name),
    space_category = COALESCE($2, space_category),
    data = data || $3
WHERE school_id = $4 AND name = $5
```
Where `$1`, `$2`, `$3` come from payload: `spaceName`, `spaceCategory`, full payload JSON.

### Action Check ✅
- **Worth it?** ✅ Yes — editing space metadata
- **Note**: Uses PostgreSQL `\|\|` operator to merge JSON into the `data` column (additive merge, not replace)
- **Bug?** ⚠️ If payload is `{"description": null}`, it will set `"description": null` in data JSON, not remove it

### Usage
```bash
curl -s -X PUT "http://localhost:8080/api/school/689225/resources/spaces/detail/PhysicsLab-A" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated — Advanced Physics Lab"
  }' | jq .
```

---

## Space: Delete

- **Endpoint**: `DELETE /api/school/689225/resources/spaces/detail/{spaceName}`
- **Method**: DELETE
- **Handler**: `spaces::delete_space` (`src/routes/spaces.rs:130`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 135-139 | `service.delete_space(&school_id, &admin_id, &space_name)` |
| 2. Handler | `routes/spaces.rs` | 140-147 | `publish_responsibility_event(SpaceDeleted{...})` |
| 3. Service impl | `services/resource/mod.rs` | 197-204 | `self.inventory.delete_space(school_id, admin_id, space_name)` |
| 4. Inventory | `services/resource/inventory.rs` | 113 | `self.repos.resource.delete_space(school_id, space_name)` |
| 5. Inventory | `services/resource/inventory.rs` | 115-122 | `self.repos.audit.log_action(..., "DELETE", ...)` |
| 6. Repo impl | `repository/resource_repo.rs` | 707-719 | Three separate DELETE statements (NO transaction) |

### SQL
```sql
DELETE FROM space_employees WHERE school_id = $1 AND space_name = $2
DELETE FROM space_materials WHERE school_id = $1 AND space_name = $2
DELETE FROM spaces WHERE school_id = $1 AND name = $2
```

### Action Check — Bug Found! ❌
- **Worth it?** ✅ Yes
- **Bug?** ❌ ⚠️⚠️ **No transaction wrapping the three DELETEs.** If the third DELETE fails, the first two already executed — leaving orphaned records in `space_employees` and `space_materials`.
- **All other multi-step repo methods** (`assign_space_materials`, `remove_space_material`, `transfer_space_material`, `clone_space`) use proper transactions with `conn.begin()`. This one doesn't.
- **Fix**: Wrap in `begin()...commit()` like the others.

### Usage
```bash
curl -s -X DELETE "http://localhost:8080/api/school/689225/resources/spaces/detail/PhysicsLab-A" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## Space: Get Budget

- **Endpoint**: `GET /api/school/689225/resources/spaces/detail/{spaceName}/budget`
- **Method**: GET
- **Handler**: `spaces::get_space_budget` (`src/routes/spaces.rs:304`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 308 | `service.get_space_details(&school_id, &space_name)` — **reuses same function as detail** |
| 2. Then | `routes/spaces.rs` | 309-316 | Extracts `.get("budget")` from response |

### Action Check ⚠️
- **Worth it?** ✅ Yes — budget visibility
- **Bug?** ⚠️ Calls full `get_space_details()` (which does `SELECT *`) just to get one `budget` field — wasteful query

### Usage
```bash
curl -s "http://localhost:8080/api/school/689225/resources/spaces/detail/PhysicsLab-A/budget" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## Space: Update Budget

- **Endpoint**: `PUT /api/school/689225/resources/spaces/detail/{spaceName}/budget`
- **Method**: PUT
- **Handler**: `spaces::update_space_budget` (`src/routes/spaces.rs:319`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 326-333 | **Direct SQL** — BYPASSES SERVICE + REPO LAYERS |
| 2. Handler | `routes/spaces.rs` | 335-342 | `publish_responsibility_event(SpaceUpdated{...})` |

### SQL (inline in handler)
```sql
UPDATE spaces SET budget = $1 WHERE school_id = $2 AND name = $3
```

### Action Check — Bug Found! ❌
- **Worth it?** ✅ Yes
- **Bug?** ❌ **BYPASSES entire service/repository layer.** No audit log, no validation, no transaction.
- **Bug?** ❌ `payload.get("budget").and_then(|v| v.as_f64())` — if budget is `null`, it sets `NULL` in DB (may clear existing budget accidentally)
- **Fix**: Should go through `service.update_space_budget()` → `repo.update_space_budget()` with audit logging

### Usage
```bash
curl -s -X PUT "http://localhost:8080/api/school/689225/resources/spaces/detail/PhysicsLab-A/budget" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{
    "budget": 75000.0
  }' | jq .
```

---

## Space: Clone

- **Endpoint**: `POST /api/school/689225/resources/spaces/{spaceName}/clone`
- **Method**: POST
- **Handler**: `spaces::clone_space` (`src/routes/spaces.rs:270`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 276-285 | Extracts `newSpaceName`, calls `service.clone_space(...)` |
| 2. Handler | `routes/spaces.rs` | 286-293 | `publish_responsibility_event(SpaceCreated{...})` |
| 3. Service impl | `services/resource/mod.rs` | 262-274 | `self.inventory.clone_space(...)` |
| 4. Inventory | `services/resource/inventory.rs` | 149 | `self.repos.resource.clone_space(school_id, source, new_name)` |
| 5. Repo impl | `repository/resource_repo.rs` | 906-1018 | Multi-step in TRANSACTION |

### SQL (inside transaction, resource_repo.rs:906-1018)
```sql
-- 1. Get source space
SELECT space_category, space_id, data FROM spaces WHERE school_id = $1 AND name = $2
-- 2. Check duplicate
SELECT name FROM spaces WHERE school_id = $1 AND name = $2
-- 3. Insert new space
INSERT INTO spaces (school_id, space_id, name, space_category, data) VALUES ($1, $2, $3, $4, $5)
-- 4. Copy material requirements
INSERT INTO space_material_requirements (school_id, space_id, material_name, required_count)
VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING
-- 5. Copy responsibility requirements
INSERT INTO space_requirements (school_id, space_id, responsibility_id, required_count)
VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING
```

### Action Check ✅
- **Worth it?** ✅ Yes — useful for setting up similar labs/classrooms
- **Note**: Properly uses transaction for all steps ✅
- **Improvement**: Does NOT clone material stock (only requirements) — may want `COPY` option

### Usage
```bash
curl -s -X POST "http://localhost:8080/api/school/689225/resources/spaces/PhysicsLab-A/clone" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{
    "newSpaceName": "PhysicsLab-B"
  }' | jq .
```

---

## Space: Assign Materials

- **Endpoint**: `POST /api/school/689225/resources/spaces/{spaceName}/materials`
- **Method**: POST
- **Handler**: `spaces::assign_space_materials` (`src/routes/spaces.rs:166`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 172-176 | `service.assign_space_materials(...)` |
| 2. Handler | `routes/spaces.rs` | 177-191 | Publishes 2 events: `SpaceUpdated` + `MaterialUpdated` |
| 3. Service impl | `services/resource/mod.rs` | 214-226 | `self.inventory.assign_space_materials(...)` + `monitor.check_and_alert_school()` |
| 4. Inventory | `services/resource/inventory.rs` | 247 | `self.repos.resource.assign_space_materials(school_id, space_name, materials)` |
| 5. Repo impl | `repository/resource_repo.rs` | 723-798 | Multi-step in TRANSACTION |

### Action Check ✅
- **Worth it?** ✅ Yes — core bridge between spaces and inventory
- **Note**: Properly uses transaction ✅
- **Note**: Automatically checks for shortages after assignment

### Usage
```bash
curl -s -X POST "http://localhost:8080/api/school/689225/resources/spaces/PhysicsLab-A/materials" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "materialName": "TestMat-Microscope",
      "quantity": 5,
      "requiredCount": 8
    },
    {
      "materialName": "TestMat-Beaker",
      "quantity": 20,
      "requiredCount": 30
    }
  ]' | jq .
```

---

## Space: Get Space Materials

- **Endpoint**: `GET /api/school/689225/resources/spaces/{spaceName}/materials`
- **Method**: GET
- **Handler**: `spaces::get_space_materials` (`src/routes/spaces.rs:194`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 198-202 | `service.get_space_materials(&school_id, &space_name)` |
| 2. Handler | `routes/spaces.rs` | 221 | **ALSO** calls `service.get_space_details(...)` AGAIN for budget (N+1 problem!) |
| 3. Service impl | `services/resource/mod.rs` | 247-253 | `self.inventory.get_space_materials(school_id, space_name)` |
| 4. Inventory | `services/resource/inventory.rs` | 134-140 | `self.repos.resource.get_space_materials(school_id, space_name)` |
| 5. Repo impl | `repository/resource_repo.rs` | 869-904 | `SELECT ... FROM space_materials ... LEFT JOIN space_material_requirements` |

### Action Check — Bug Found! ❌
- **Worth it?** ✅ Yes — shows inventory per space
- **Bug?** ❌ ⚠️ **N+1 problem at line 221**: After calling `get_space_materials()`, the handler calls `get_space_details()` again just to get the budget field. This is an extra `SELECT *` query. The budget could be joined in the original query.
- **Bug?** ⚠️ `summary.budget` may be `null` in response if space not found — but `get_space_details()` returns `None`, handler then returns `budget: null`

### Usage
```bash
curl -s "http://localhost:8080/api/school/689225/resources/spaces/PhysicsLab-A/materials" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## Space: Get All Spaces Materials

- **Endpoint**: `GET /api/school/689225/resources/spaces/materials/all`
- **Method**: GET
- **Handler**: `spaces::get_all_spaces_materials` (`src/routes/spaces.rs:296`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 300 | `service.get_all_spaces_materials(&school_id)` |
| 2. Service impl | `services/resource/mod.rs` | 255-260 | `self.inventory.get_all_spaces_materials(school_id)` |
| 3. Inventory | `services/resource/inventory.rs` | 188 | **BYPASSES repository** — acquires raw DB conn directly |

### Action Check — Bug Found! ❌
- **Worth it?** ✅ Yes — cross-space inventory reports
- **Bug?** ❌ **BYPASSES repository layer** — acquires raw connection in service layer (line 188)
- **Fix**: Move inline SQL to `repository/resource_repo.rs`

### Usage
```bash
curl -s "http://localhost:8080/api/school/689225/resources/spaces/materials/all" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## Space: Transfer Material

- **Endpoint**: `POST /api/school/689225/resources/spaces/{spaceName}/materials/{materialName}/transfer`
- **Method**: POST
- **Handler**: `spaces::transfer_space_material` (`src/routes/spaces.rs:351`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 357-361 | `service.transfer_space_material(...)` |
| 2. Handler | `routes/spaces.rs` | 362-382 | Publishes 3 events (SpaceUpdated x2 + MaterialUpdated) |
| 3. Service impl | `services/resource/mod.rs` | 276-290 | `self.inventory.transfer_space_material(...)` + monitor check |
| 4. Inventory | `services/resource/inventory.rs` | 171 | `self.repos.resource.transfer_space_material(...)` |
| 5. Repo impl | `repository/resource_repo.rs` | 1020-1150 | Multi-step in TRANSACTION |

### Action Check ✅
- **Worth it?** ✅ Yes — material redistribution
- **Note**: Properly uses transaction ✅
- **Note**: Validates source quantity before transfer ✅

### Usage
```bash
curl -s -X POST "http://localhost:8080/api/school/689225/resources/spaces/PhysicsLab-A/materials/TestMat-Microscope/transfer" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{
    "toSpace": "ChemistryLab-A",
    "quantity": 2
  }' | jq .
```

---

## Space: Remove Material

- **Endpoint**: `DELETE /api/school/689225/resources/spaces/{spaceName}/materials/{materialName}`
- **Method**: DELETE
- **Handler**: `spaces::remove_space_material` (`src/routes/spaces.rs:242`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/spaces.rs` | 248-252 | `service.remove_space_material(...)` |
| 2. Handler | `routes/spaces.rs` | 253-267 | Publishes 2 events |
| 3. Service impl | `services/resource/mod.rs` | 236-245 | `self.inventory.remove_space_material(...)` |
| 4. Inventory | `services/resource/inventory.rs` | 268 | `self.repos.resource.remove_space_material(...)` |
| 5. Repo impl | `repository/resource_repo.rs` | 800-842 | Multi-step in TRANSACTION |

### Action Check ✅
- **Worth it?** ✅ Yes — removing materials from spaces
- **Note**: Properly uses transaction ✅
- **Note**: Restores stock to `extra_unit` in materials table ✅

### Usage
```bash
curl -s -X DELETE "http://localhost:8080/api/school/689225/resources/spaces/PhysicsLab-A/materials/TestMat-Microscope" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 1
  }' | jq .
```

---

## ⚠️ All Issues Found (Action Check Summary)

| # | Issue | File:Line | Severity | Fix |
|---|-------|-----------|----------|-----|
| 1 | **Category list reads from `spaces` table, not `space_categories`** | `resource_repo.rs:607` | Medium | UNION or switch to `space_categories` table |
| 2 | **`delete_space` has NO transaction** — orphan risk | `resource_repo.rs:707-719` | **High** | Wrap 3 DELETEs in `begin()...commit()` |
| 3 | **`update_space_budget` BYPASSES service/repo** — no audit log | `routes/spaces.rs:326-333` | **High** | Create proper service → repo method |
| 4 | **`get_all_spaces_materials` BYPASSES repo** — inline SQL in service | `inventory.rs:188` | Medium | Move SQL to `resource_repo.rs` |
| 5 | **`get_space_materials` N+1 query** — extra `get_space_details()` call | `routes/spaces.rs:221` | Medium | Join budget in main query |
| 6 | **`list_spaces` missing `description` field** — not extracted from `data` column | `resource_repo.rs:594-602` | Medium | Add `data -> 'description'` to mapping |
| 7 | **`space_id` format is fragile** — panics if school_id < 4 chars | `resource_repo.rs:550` | Medium | Use UUID or DB sequence |
| 8 | **`list_space_categories` ignores `is_default` field** | `resource_repo.rs:617-645` | Low | Add `is_default` column to `space_categories` |
| 9 | **No validation that category exists before creating space** | `routes/spaces.rs:86` | Medium | Check `space_categories` table |
| 10 | **`get_space_details` has dead `OR space_name = $2` clause** | `resource_repo.rs:659` | Low | Remove non-existent column reference |
