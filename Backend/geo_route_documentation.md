# Geo Route Documentation

**File:** `src/routes/geo.rs`  
**Database Tables:** `countries`, `states`, `districts`  
**Backup File:** `Backup/geo.json`

---

## Routes Summary

| # | Method | URL | Handler | Description |
|---|---|---|---|---|
| 1 | `GET` | `/api/geo/countries` | `get_countries` | Sabhi countries ki list |
| 2 | `GET` | `/api/geo/states/:country_id` | `get_states` | Ek country ke states |
| 3 | `GET` | `/api/geo/districts/:state_id` | `get_districts` | Ek state ke districts |
| 4 | `GET` | `/api/geo/export` | `export_geo_json` | Geo data ko JSON file se return karo |
| 5 | `POST` | `/api/geo/import` | `import_geo_json` | Geo data import karo aur DB mein restore karo |

---

## Route 1: Get Countries
```
GET /api/geo/countries
→ SELECT id, name, code, phone_code FROM countries ORDER BY name
```
**Response:**
```json
[{ "id": 1, "name": "India", "code": "IN", "phone_code": "+91" }]
```

---

## Route 2: Get States
```
GET /api/geo/states/1
→ SELECT id, country_id, name FROM states WHERE country_id = $1 ORDER BY name
```

---

## Route 3: Get Districts
```
GET /api/geo/districts/5
→ SELECT id, state_id, name FROM districts WHERE state_id = $1 ORDER BY name
```

---

## Route 4: Export Geo JSON
```
GET /api/geo/export
→ Reads file: Backup/geo.json
→ Returns the JSON content directly
```
> If file missing or invalid: returns empty array `[]`

---

## Route 5: Import Geo JSON
```
POST /api/geo/import
Body: { ... full geo data ... }

Workflow:
→ Writes payload to Backup/geo.json (pretty-printed)
→ Calls state.backup.auto_restore()
   → auto_restore reads geo.json and loads countries/states/districts into DB
```
**Response:**
```json
{ "success": true, "message": "Geo data imported successfully" }
```

---

## Use Case
These routes are mainly used in:
- **Student/Employee registration forms** — Address field dropdowns for Country → State → District
- **Admin Setup** — Importing geographic data into the database

---

## Data Models

```rust
Country  { id, name, code, phone_code }
State    { id, country_id, name }
District { id, state_id, name }
```
