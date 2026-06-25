# CMS Admin API

Base path: `/admin/cms`

Saare endpoints admin prefix ke under nested hain aur unhe Bearer token ke throw authentication ki zaroorat hoti hai (jise parent admin router handle karta hai).

---

## 1. Create Blog Post

```
POST /admin/cms/blog
```

**Auth:** Required (parent admin router ke throw)

Naya blog post create karta hai.

**Request Body:**
```json
{
  "slug": "platform-update-july-2026",
  "title": "Platform Update - July 2026",
  "excerpt": "Exciting new features are coming to Modernisum this July.",
  "content": "Full markdown or HTML content here...",
  "cover_image_url": "https://cdn.example.com/blog/july-update.png",
  "author_name": "Admin Team",
  "category": "Product Updates",
  "tags": ["update", "features", "release"],
  "is_published": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | Yes | URL-friendly unique identifier |
| `title` | string | Yes | Blog post title |
| `excerpt` | string | No | Chhota summary |
| `content` | string | Yes | Poora content (markdown/HTML) |
| `cover_image_url` | string | No | Cover image URL |
| `author_name` | string | No | Author display name |
| `category` | string | No | Post category |
| `tags` | array | No | Tags ki list |
| `is_published` | boolean | No | Public site par dikhega ya nahi (boolean) |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Test Case:**
```yaml
name: "Create blog post"
prerequisites:
  - Login aur admin token generate karein
request:
  method: POST
  url: "/admin/cms/blog"
  headers:
    Authorization: "Bearer <token>"
  body:
    slug: "platform-update-july-2026"
    title: "Platform Update - July 2026"
    excerpt: "New features coming"
    content: "Full content here..."
    author_name: "Admin Team"
    category: "Product Updates"
    tags: ["update", "release"]
    is_published: true
expect:
  status: 200
  body:
    success: true
    data.id: string
```

---

## 2. Update Blog Post

```
PUT /admin/cms/blog/:id
```

**Auth:** Required (parent admin router ke throw)

ID ke throw existing blog post ko update karta hai. Create ke jaisa hi request body structure use karta hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Blog post ID |

**Request Body:**
```json
{
  "slug": "platform-update-july-2026",
  "title": "Platform Update - July 2026 (Revised)",
  "excerpt": "Exciting new features are coming to Modernisum this July.",
  "content": "Updated full content here...",
  "cover_image_url": "https://cdn.example.com/blog/july-update-v2.png",
  "author_name": "Admin Team",
  "category": "Product Updates",
  "tags": ["update", "features", "release", "2026"],
  "is_published": true
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Blog post updated"
}
```

**Test Case:**
```yaml
name: "Update blog post"
prerequisites:
  - Login aur admin token generate karein
  - ID \"550e8400-e29b-41d4-a716-446655440000\" ke sath blog post exist karta hai
request:
  method: PUT
  url: "/admin/cms/blog/550e8400-e29b-41d4-a716-446655440000"
  headers:
    Authorization: "Bearer <token>"
  body:
    slug: "platform-update-july-2026"
    title: "Updated Title"
    content: "Updated content"
    is_published: true
expect:
  status: 200
  body:
    success: true
    message: "Blog post updated"
```

---

## 3. Delete Blog Post

```
DELETE /admin/cms/blog/:id
```

**Auth:** Required (parent admin router ke throw)

ID ke throw blog post ko permanently delete karta hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Blog post ID |

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Blog post deleted"
}
```

**Test Case:**
```yaml
name: "Delete blog post"
prerequisites:
  - Login aur admin token generate karein
  - ID \"550e8400-e29b-41d4-a716-446655440000\" ke sath blog post exist karta hai
request:
  method: DELETE
  url: "/admin/cms/blog/550e8400-e29b-41d4-a716-446655440000"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    message: "Blog post deleted"
```

---

## 4. Create Testimonial

```
POST /admin/cms/testimonials
```

**Auth:** Required (parent admin router ke throw)

Public website par display karne ke liye ek naya client testimonial create karta hai.

**Request Body:**
```json
{
  "client_name": "Dr. Sarah Johnson",
  "client_title": "Principal",
  "school_name": "Springfield Elementary",
  "avatar_url": "https://cdn.example.com/avatars/sarah.jpg",
  "rating": 5,
  "content": "Modernisum has transformed how we manage our school. Highly recommended!",
  "is_featured": true,
  "display_order": 1,
  "is_published": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client_name` | string | Yes | Person ka poora naam |
| `client_title` | string | No | Job title/role |
| `school_name` | string | No | School/organization ka naam |
| `avatar_url` | string | No | Avatar image URL |
| `rating` | integer | No | Star rating (1–5) |
| `content` | string | Yes | Testimonial text |
| `is_featured` | boolean | No | Homepage par highlight karna hai ya nahi |
| `display_order` | integer | No | Display ke liye sort order |
| `is_published` | boolean | No | Public site par dikhega ya nahi |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001"
  }
}
```

**Test Case:**
```yaml
name: "Create testimonial"
prerequisites:
  - Login aur admin token generate karein
request:
  method: POST
  url: "/admin/cms/testimonials"
  headers:
    Authorization: "Bearer <token>"
  body:
    client_name: "Dr. Sarah Johnson"
    client_title: "Principal"
    school_name: "Springfield Elementary"
    rating: 5
    content: "Modernisum has transformed how we manage our school."
    is_featured: true
    display_order: 1
    is_published: true
expect:
  status: 200
  body:
    success: true
    data.id: string
```

---

## 5. Update Testimonial

```
PUT /admin/cms/testimonials/:id
```

**Auth:** Required (parent admin router ke throw)

ID ke throw existing testimonial ko update karta hai. Create testimonial ke jaisa hi request body structure use karta hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Testimonial ID |

**Request Body:** Same as create testimonial (all fields).

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Testimonial updated"
}
```

**Test Case:**
```yaml
name: "Update testimonial"
prerequisites:
  - Login aur admin token generate karein
  - ID \"660e8400-e29b-41d4-a716-446655440001\" ke sath testimonial exist karta hai
request:
  method: PUT
  url: "/admin/cms/testimonials/660e8400-e29b-41d4-a716-446655440001"
  headers:
    Authorization: "Bearer <token>"
  body:
    client_name: "Dr. Sarah Johnson"
    client_title: "Principal"
    school_name: "Springfield Elementary"
    rating: 5
    content: "Updated testimonial content"
    is_featured: false
    is_published: true
expect:
  status: 200
  body:
    success: true
    message: "Testimonial updated"
```

---

## 6. Delete Testimonial

```
DELETE /admin/cms/testimonials/:id
```

**Auth:** Required (parent admin router ke throw)

ID ke throw testimonial ko permanently delete karta hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Testimonial ID |

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Testimonial deleted"
}
```

**Test Case:**
```yaml
name: "Delete testimonial"
prerequisites:
  - Login aur admin token generate karein
  - ID \"660e8400-e29b-41d4-a716-446655440001\" ke sath testimonial exist karta hai
request:
  method: DELETE
  url: "/admin/cms/testimonials/660e8400-e29b-41d4-a716-446655440001"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    message: "Testimonial deleted"
```

---

## 7. List School Access Requests

```
GET /admin/cms/school-requests
```

**Auth:** Required (parent admin router ke throw)

Public website ke throw submit ki gayi saari school access/demo requests return karta hai.

**Expected Response (200):**
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
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440003",
      "school_name": "Oakwood High",
      "contact_name": "Jane Doe",
      "email": "jane@oakwood.edu",
      "phone": "+9876543210",
      "employee_count": 60,
      "student_count": 800,
      "message": "Interested in the premium plan.",
      "status": "approved",
      "admin_notes": "Sent onboarding email",
      "created_at": "2026-06-18T09:00:00Z"
    }
  ]
}
```

**Test Case:**
```yaml
name: "List school access requests"
prerequisites:
  - Login aur admin token generate karein
  - Kam se kam ek access request exist karti hai
request:
  method: GET
  url: "/admin/cms/school-requests"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data: array
```

---

## 8. Update School Access Request

```
PUT /admin/cms/school-requests/:id
```

**Auth:** Required (parent admin router ke throw)

School access request ka status aur/ya admin notes update karta hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Access request ID |

**Request Body:**
```json
{
  "status": "approved",
  "admin_notes": "Sent onboarding email on June 21. Follow up in 3 days."
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `status` | string | No | `"pending"` | Naya status (`pending`, `approved`, `rejected`) |
| `admin_notes` | string | No | `null` | Internal admin notes |

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Request updated"
}
```

**Test Case:**
```yaml
name: "Approve school access request"
prerequisites:
  - Login aur admin token generate karein
  - ID \"770e8400-e29b-41d4-a716-446655440002\" ke sath access request exist karti hai
request:
  method: PUT
  url: "/admin/cms/school-requests/770e8400-e29b-41d4-a716-446655440002"
  headers:
    Authorization: "Bearer <token>"
  body:
    status: "approved"
    admin_notes: "Sent onboarding email"
expect:
  status: 200
  body:
    success: true
    message: "Request updated"
```

```yaml
name: "Update access request with just notes"
prerequisites:
  - Login aur admin token generate karein
  - ID \"770e8400-e29b-41d4-a716-446655440002\" ke sath access request exist karti hai
request:
  method: PUT
  url: "/admin/cms/school-requests/770e8400-e29b-41d4-a716-446655440002"
  headers:
    Authorization: "Bearer <token>"
  body:
    admin_notes: "Called the school, left voicemail"
expect:
  status: 200
  body:
    success: true
    message: "Request updated"
```