# CMS Domain Guide for New Developer

## Overview

The CMS (Content Management System) domain provides admin interfaces for managing website content including blog posts, testimonials, and school access requests.

## Location

Source files:
- `C:/Users/User/Documents/modernisum/backend/rust/src/domain/cms/cms.rs` - Handler implementations
- `C:/Users/User/Documents/modernisum/backend/rust/src/domain/cms/mod.rs` - Route definitions

## Admin API Endpoints

### 1. Blog Post Management

#### Create Blog Post
- **Method**: `POST /admin/cms/blog`
- **Auth**: Required (via parent admin router)

**Request Body**:
```json
{
  "slug": "string",
  "title": "string",
  "excerpt": "string (optional)",
  "content": "string",
  "cover_image_url": "string (optional)",
  "author_name": "string (optional)",
  "category": "string (optional)",
  "tags": ["string"] (optional),
  "is_published": boolean (optional)
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### Update Blog Post
- **Method**: `PUT /admin/cms/blog/:id`
- **Auth**: Required
- **Path Params**: `id` (UUID)

**Response (200)**:
```json
{
  "success": true,
  "message": "Blog post updated"
}
```

#### Delete Blog Post
- **Method**: `DELETE /admin/cms/blog/:id`
- **Auth**: Required
- **Path Params**: `id` (UUID)

**Response (200)**:
```json
{
  "success": true,
  "message": "Blog post deleted"
}
```

### 2. Testimonial Management

#### Create Testimonial
- **Method**: `POST /admin/cms/testimonials`
- **Auth**: Required

**Request Body**:
```json
{
  "client_name": "string",
  "client_title": "string (optional)",
  "school_name": "string (optional)",
  "avatar_url": "string (optional)",
  "rating": integer (1-5, optional),
  "content": "string",
  "is_featured": boolean (optional),
  "display_order": integer (optional),
  "is_published": boolean (optional)
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001"
  }
}
```

#### Update Testimonial
- **Method**: `PUT /admin/cms/testimonials/:id`
- **Auth**: Required
- **Path Params**: `id` (UUID)

**Response (200)**:
```json
{
  "success": true,
  "message": "Testimonial updated"
}
```

#### Delete Testimonial
- **Method**: `DELETE /admin/cms/testimonials/:id`
- **Auth**: Required
- **Path Params**: `id` (UUID)

**Response (200)**:
```json
{
  "success": true,
  "message": "Testimonial deleted"
}
```

### 3. School Access Requests

#### Create School Access Request
- **Method**: `POST /admin/cms/school-request`
- **Auth**: Not required (public endpoint)

**Request Body**:
```json
{
  "school_name": "string",
  "contact_name": "string",
  "email": "string",
  "phone": "string (optional)",
  "employee_count": integer (optional),
  "student_count": integer (optional),
  "message": "string (optional)"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "status": "pending"
  }
}
```

#### List School Access Requests
- **Method**: `GET /admin/cms/school-requests`
- **Auth**: Required

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "school_name": "Riverside Academy",
      "contact_name": "John Smith",
      "email": "john@riverside.edu",
      "phone": "+1234567890",
      "employee_count": 45,
      "student_count": 500,
      "message": "We would like a demo of the platform.",
      "status": "pending",
      "admin_notes": null,
      "created_at": "2026-06-20T14:00:00Z"
    }
  ]
}
```

#### Update School Access Request
- **Method**: `PUT /admin/cms/school-requests/:id`
- **Auth**: Required
- **Path Params**: `id` (UUID)

**Request Body**:
```json
{
  "status": "approved"|"rejected" (optional),
  "admin_notes": "string (optional)"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Request updated"
}
```

## Models Used

### CreateBlogRequest
- `slug`: string
- `title`: string  
- `excerpt`: string (optional)
- `content`: string
- `cover_image_url`: string (optional)
- `author_name`: string (optional)
- `category`: string (optional)
- `tags`: array of strings (optional)
- `is_published`: boolean (optional)

### CreateTestimonialRequest
- `client_name`: string
- `client_title`: string (optional)
- `school_name`: string (optional)
- `avatar_url`: string (optional)
- `rating`: integer (1-5, optional)
- `content`: string
- `is_featured`: boolean (optional)
- `display_order`: integer (optional)
- `is_published`: boolean (optional)

### CreateSchoolAccessRequest
- `school_name`: string
- `contact_name`: string
- `email`: string
- `phone`: string (optional)
- `employee_count`: integer (optional)
- `student_count`: integer (optional)
- `message`: string (optional)

## Helper Queries

### BlogListQuery
- `page`: integer (default 1)
- `per_page`: integer (default 10, max 50)
- `published`: boolean (default true)

## Response Patterns

All endpoints follow this pattern:
```json
{
  "success": boolean,
  "data": any (optional),
  "message": string (optional for errors)
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description"
}
```

## Testing

The guides/admin/api/08-cms.md file contains comprehensive YAML test cases for all endpoints. To run tests:

1. Review the test cases in the guide
2. Implement integration tests based on those test cases
3. Run `cargo test` to verify functionality

## Repository Structure

Based on the code analysis, here's how the CMS domain is organized:

### Backend (`/rust`)
- `/src/domain/cms/` - Domain handlers and routes
  - `cms.rs` - Actual endpoint implementations with business logic
  - `mod.rs` - Axum Router definitions combining all endpoints

### Frontend (`/frontend`)
- Component files that consume these APIs for public-facing features

### Guides (`/guides`)
- `/admin/api/08-cms.md` - Complete API documentation with test cases
- `/cms_guide.md` - This developer guide
- `/cms/implementation_guide.md` - Implementation details

### Testing
- Check `guides/admin/api/08-cms.md` for YAML test cases that can be used as integration test examples
