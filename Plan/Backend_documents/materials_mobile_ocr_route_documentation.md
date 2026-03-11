# Materials, Mobile, Mod & OCR Route Documentation

---

## Materials — `src/routes/materials.rs`

**Service:** `src/services/resource_service.rs`  
**Tables:** `materials`, `material_locations`

| # | Method | URL | Handler | Description |
|---|---|---|---|---|
| 1 | `GET` | `/api/documentbox/:school_id` | `list_documents` | School ke sabhi documents list karo |
| 2 | `POST` | `/api/document_upload/:school_id` | `upload_document` | Naya document metadata upload/link karo |
| 3 | `POST` | `/api/document_upload/:school_id/student/:student_id` | `upload_document` | Student ke liye document upload karo |
| 4 | `POST` | `/api/materials/:school_id/bulk` | `bulk_import_materials` | Bulk import from JSON/Excel |

### Route 1: List Materials
```
GET /api/materials/:school_id
→ SELECT * FROM materials WHERE school_id = $1
```

### Route 2: Buy / Update Material
```
PUT /api/materials/:school_id/:material_id
Body: { "quantity": 50, "unitPrice": 120 }

→ UPDATE materials SET quantity = quantity + $1, unit_price = $2
  WHERE school_id = $1 AND id = $2
```

### Route 3: Bulk Import
```
POST /api/materials/:school_id/bulk
Body: { "materials": [{ "Material Name": "Chair", "Quantity": 20, "Unit Price": 500 }] }

→ Loops per row → create_material() for each
→ Returns successCount + failCount + per-row results
```

**Bulk Import Response:**
```json
{
  "success": true,
  "message": "5 materials imported, 1 failed",
  "successCount": 5,
  "failCount": 1,
  "results": [
    { "row": 1, "status": "success" },
    { "row": 2, "status": "error", "message": "Duplicate" }
  ]
}
```

---

## Mobile — `src/routes/mobile.rs`

**OTP-Based auth for mobile teachers and students (mock implementation)**

| # | Method | URL | Handler | Description |
|---|---|---|---|---|
| 1 | `POST` | `/:school_id/mobile/login` | `mobile_login` | OTP request (mock) |
| 2 | `POST` | `/:school_id/mobile/verify` | `mobile_verify` | OTP verify → JWT token |

### Route 1: Mobile Login (Request OTP)
```
POST /:school_id/mobile/login
Body: { "ident": "9876543210", "role": "teacher" }

> ⚠️ Mock: Doesn't actually send OTP. OTP is always "1234".
> In production would query: employees.phone OR students.student_id

Response: { "success": true, "message": "OTP sent... (Use 1234 for testing)" }
```

### Route 2: Mobile Verify OTP → JWT Token
```
POST /:school_id/mobile/verify
Body: { "ident": "9876543210", "role": "teacher", "otp": "1234" }

→ If OTP = "1234" → Generate JWT (10-year long-lived token)
→ Token claims: { sub, role, schoolId, exp }
→ Secret from env: JWT_SECRET

Response:
{
  "success": true,
  "token": "eyJ...",
  "user": { "ident": "...", "role": "teacher", "schoolId": "..." }
}
```

> **Token validity:** 10 years (WhatsApp-style permanent session)  
> **Secret:** `JWT_SECRET` env var (fallback: `"super_secret_key_12345"`)

---

## Mod — `src/routes/mod.rs`

This is not a route handler — it is the **Rust module declaration file** that registers all route submodules. No HTTP routes are defined here.

```rust
pub mod ai;
pub mod announcement;
pub mod attendance;
pub mod auth;
pub mod award;
pub mod class;
pub mod complains;
pub mod documentUpload;
pub mod documentbox;
pub mod employees;
pub mod emppay;
pub mod events;
pub mod exam;
pub mod fees;
pub mod geo;
pub mod leave;
pub mod materials;
pub mod mobile;
pub mod ocr;
pub mod reminder;
pub mod responsibility;
pub mod school;
pub mod setup;
pub mod spaces;
pub mod students;
pub mod subjects;
pub mod task;
pub mod topic;
```

> Total registered route modules: **28**

---

## OCR — `src/routes/ocr.rs`

**Service:** `src/services/ocr_service.rs` → `src/repository/postgres.rs` (save result)  
**Engine:** PaddleOCR (default) or custom engine via query param

| # | Method | URL | Handler | Description |
|---|---|---|---|---|
| 1 | `POST` | `/api/ocr-routes/extract` | `extract_text` | Image upload → text extract |

### Route 1: Extract Text from Image (OCR)

```
POST /api/ocr-routes/extract?engine=paddleocr
Content-Type: multipart/form-data
Field name: "image"
```

**Workflow — Step by Step:**
```
1. Parse multipart form → find field named "image"
2. Generate UUID file ID
3. Save file to: uploads/temp_{uuid}.{ext}
4. Call ocr_service.perform_ocr(file_path)
   → Uses OCR engine (paddleocr/tesseract)
   → Returns extracted JSON text data
5. Save OCR result to DB:
   INSERT INTO audit_logs (action='save_result', target_type='ocr')
6. Return extracted text as JSON
7. Cleanup: temp file deleted (by OS/system)
```

**Query Params:**
| Param | Default | Options |
|---|---|---|
| `engine` | `paddleocr` | `paddleocr`, `tesseract` |

**Success Response:**
```json
{
  "success": true,
  "data": {
    "text": "Extracted text here...",
    "confidence": 0.97
  }
}
```

**Error Response:**
```json
{ "success": false, "error": "No image uploaded" }
{ "success": false, "error": "OCR error: process failed" }
```
