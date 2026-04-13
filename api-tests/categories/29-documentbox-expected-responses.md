# Document Box APIs - Expected Responses

This document outlines the expected responses for Document Box API endpoints.

## Authentication Requirements
- **RLS Authentication Required:** Yes
- **Required Headers:**
  - `X-School-ID`: School identifier
  - `X-Admin-ID`: Admin user identifier
- **Access Level:** School admin, teachers, students (for their own documents), parents

## Overview
Document Box APIs provide access to the centralized document repository for a school. This system stores and organizes all student documents including report cards, certificates, identity proofs, medical records, and other important files. Documents are associated with students and can be filtered by student ID.

## 1. GET /api/documentbox/:schoolId - List All Documents

**Query Parameters:**
- `student_id` (optional): Filter documents by student ID
- `document_type` (optional): Filter by document type (e.g., "report_card", "certificate")
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 50)
- `sort` (optional): Sort field (e.g., "uploaded_at", "title")
- `order` (optional): Sort order ("asc" or "desc", default: "desc")

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "student_id": "STU001",
      "student_name": "John Doe",
      "document_type": "report_card",
      "title": "Annual Report Card 2024",
      "description": "Annual academic performance report for student",
      "file_url": "https://storage.example.com/reports/student_001_report_2024.pdf",
      "file_name": "student_001_report_2024.pdf",
      "file_size": 204800,
      "mime_type": "application/pdf",
      "tags": ["academic", "report", "2024"],
      "visibility": "student",
      "expiry_date": "2025-12-31",
      "uploaded_by": "admin_001",
      "uploaded_by_name": "Admin User",
      "uploaded_at": "2024-03-15T10:30:00Z",
      "download_url": "https://storage.example.com/signed/student_001_report_2024.pdf?token=abc123",
      "status": "active",
      "thumbnail_url": "https://storage.example.com/thumbnails/student_001_report_2024.jpg"
    },
    {
      "id": 2,
      "student_id": "STU002",
      "student_name": "Jane Smith",
      "document_type": "certificate",
      "title": "Sports Achievement Certificate",
      "description": "Certificate for winning district level badminton tournament",
      "file_url": "https://storage.example.com/certificates/student_002_sports.pdf",
      "file_name": "student_002_sports.pdf",
      "file_size": 153600,
      "mime_type": "application/pdf",
      "tags": ["sports", "achievement", "2024"],
      "visibility": "public",
      "expiry_date": null,
      "uploaded_by": "teacher_001",
      "uploaded_by_name": "Sports Teacher",
      "uploaded_at": "2024-02-20T14:45:00Z",
      "download_url": "https://storage.example.com/signed/student_002_sports.pdf?token=def456",
      "status": "active",
      "thumbnail_url": null
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 50,
    "total": 125,
    "pages": 3,
    "total_size_mb": 45.2,
    "document_types": {
      "report_card": 45,
      "certificate": 30,
      "id_proof": 25,
      "medical": 15,
      "other": 10
    }
  }
}
```

**Validation Criteria:**
- Should return 200 OK status
- Should include list of documents with student details
- Should generate signed download URLs for each document
- Should include thumbnail URLs for image/PDF documents
- Should include metadata with statistics
- Should support pagination
- Should handle empty results gracefully

**Error Responses:**
- **401 Unauthorized:** Missing or invalid RLS headers
- **400 Bad Request:** Invalid query parameters

## 2. GET /api/documentbox/:schoolId?student_id=:studentId - List Documents for Student

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "student_id": "STU001",
      "student_name": "John Doe",
      "document_type": "report_card",
      "title": "Annual Report Card 2024",
      "description": "Annual academic performance report for student",
      "file_url": "https://storage.example.com/reports/student_001_report_2024.pdf",
      "file_name": "student_001_report_2024.pdf",
      "file_size": 204800,
      "mime_type": "application/pdf",
      "tags": ["academic", "report", "2024"],
      "visibility": "student",
      "expiry_date": "2025-12-31",
      "uploaded_by": "admin_001",
      "uploaded_by_name": "Admin User",
      "uploaded_at": "2024-03-15T10:30:00Z",
      "download_url": "https://storage.example.com/signed/student_001_report_2024.pdf?token=abc123",
      "status": "active"
    },
    {
      "id": 3,
      "student_id": "STU001",
      "student_name": "John Doe",
      "document_type": "id_proof",
      "title": "Aadhaar Card",
      "description": "Government issued identity proof",
      "file_url": "https://storage.example.com/id_proofs/student_001_aadhaar.jpg",
      "file_name": "student_001_aadhaar.jpg",
      "file_size": 512000,
      "mime_type": "image/jpeg",
      "tags": ["identity", "government"],
      "visibility": "admin",
      "expiry_date": null,
      "uploaded_by": "admin_001",
      "uploaded_by_name": "Admin User",
      "uploaded_at": "2024-01-10T09:15:00Z",
      "download_url": "https://storage.example.com/signed/student_001_aadhaar.jpg?token=ghi789",
      "status": "active"
    }
  ],
  "student_summary": {
    "student_id": "STU001",
    "student_name": "John Doe",
    "total_documents": 8,
    "total_size_mb": 3.2,
    "document_types": {
      "report_card": 3,
      "certificate": 2,
      "id_proof": 1,
      "medical": 1,
      "other": 1
    },
    "oldest_document": "2023-08-15",
    "newest_document": "2024-03-15"
  }
}
```

**Validation Criteria:**
- Should return 200 OK status
- Should filter documents by specific student
- Should include student summary statistics
- Should respect visibility settings (students can only see their own documents with appropriate visibility)
- Should handle student with no documents (empty array)

**Error Responses:**
- **404 Not Found:** Student not found
- **401 Unauthorized:** Missing or invalid RLS headers
- **403 Forbidden:** User not authorized to view this student's documents

## Document Visibility Rules

| User Role | Can View Documents With Visibility |
|-----------|-----------------------------------|
| Student | `student`, `parent`, `teacher`, `admin`, `public` (only their own) |
| Parent | `parent`, `teacher`, `admin`, `public` (only their child's) |
| Teacher | `teacher`, `admin`, `public` (for students in their classes) |
| Admin | All documents (all visibility levels) |

## Document Status Reference

| Status | Description | Action Required |
|--------|-------------|-----------------|
| `active` | Document is active and accessible | None |
| `expired` | Document has passed expiry date | Review or renew |
| `archived` | Document archived (no longer active) | Can be restored |
| `pending_review` | Document awaiting approval | Admin review needed |
| `rejected` | Document rejected during review | Fix issues and resubmit |

## Thumbnail Generation

- PDF documents: First page converted to JPEG thumbnail
- Image documents: Resized version created
- Other documents: Generic icon based on file type
- Thumbnails are generated automatically during upload

## Testing Notes

1. **Access Control:** Test visibility rules for different user roles
2. **Student Filtering:** Ensure students can only access their own documents
3. **Signed URLs:** Download URLs should be signed and expire after reasonable time
4. **Pagination:** Test with large document sets
5. **Search Performance:** Document listing should be efficient even with thousands of records
6. **Thumbnail Availability:** Verify thumbnails are generated for supported file types
7. **Expiry Handling:** Documents past expiry date may have limited access
8. **Audit Trail:** Document access should be logged for security

## Success Criteria

1. ✅ Both endpoints return expected HTTP status codes
2. ✅ Response structures match documented schemas
3. ✅ Filtering by student_id works correctly
4. ✅ Signed download URLs are generated for all documents
5. ✅ RLS headers are properly validated
6. ✅ Access control respects visibility settings
7. ✅ Pagination works correctly
8. ✅ Student summary statistics are accurate
9. ✅ Error handling works for invalid student IDs
10. ✅ Metadata includes document type distribution