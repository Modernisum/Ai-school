# Document Box & Upload Documentation

**Files:** `src/routes/documentbox.rs`, `src/routes/documentUpload.rs`  
**Service:** `src/services/document_box_service.rs`  
**Repository:** `src/repository/postgres.rs` → `add_document`, `get_documents`  
**Database Table:** `document_box`

---

## Routes Summary

| Method | URL | Handler | Description |
|---|---|---|---|
| `GET` | `/api/documentbox/:school_id` | `list_documents` | School ke sabhi documents list karo |
| `POST` | `/api/document_upload/:school_id` | `upload_document` | Naya document upload/link karo |
| `POST` | `/api/document_upload/:school_id/student/:student_id` | `upload_document` | Student ke liye document upload karo |

---

## Route 1: List Documents

### `GET /api/documents/:school_id`

**Description:** School se jude sabhi documents (files/links) ki list return karta hai.

**Parameters:**
- `school_id` (Path): School identifier.

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "school_id": "SCH001",
      "user_id": "USR123",
      "doc_type": "Identity",
      "file_url": "https://storage.example.com/id.pdf",
      "created_at": "2024-03-11T10:00:00Z"
    }
  ]
}
```

---

## Route 2: Upload Document Metadata

### `POST /api/upload/:school_id`

**Description:** Naye document ka meta-data (UID, Type, URL) database mein save karta hai.  
*Note: Yeh route file storage nahi karta, sirf path/URL ko track karta hai.*

**Parameters:**
- `school_id` (Path): School identifier.
- Body (JSON):
    - `userId` (String, Optional): User associated with doc.
    - `docType` (String): Type (e.g., "Aadhar", "Marksheet").
    - `fileUrl` (String): Direct link to the hosted file.

**Request Example:**
```json
{
  "userId": "USR123",
  "docType": "Aadhar",
  "fileUrl": "https://storage.vidhyam.in/docs/stu123_aadhar.pdf"
}
```

---

## Database Schema Highlights

**Table:** `document_box`
- `id`: SERIAL (PK)
- `school_id`: VARCHAR
- `user_id`: VARCHAR
- `doc_type`: TEXT
- `file_url`: TEXT
- `created_at`: TIMESTAMPTZ
