# Platform Admin API Test Cases

These test cases cover every route declared in `rust/src/domain/admin/mod.rs`, including nested CMS admin routes from `rust/src/domain/cms/admin_routes`.

## Test setup

Base URL:

```bash
BASE_URL="http://localhost:8080"
```

Login once and save the admin token:

```bash
TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"admin@123"}' \
  | jq -r '.accessToken')
```

Authenticated curl helper:

```bash
AUTH_HEADER="Authorization: Bearer $TOKEN"
```

Common success assertion:

```bash
jq -e '.success == true'
```

Common error assertion:

```bash
jq -e '.success == false and (.message | length > 0)'
```

Important: admin routes have an admin rate limiter. Keep manual tests spaced out or increase limiter limits in a test environment.

---

## Auth tests

### TC_ADMIN_AUTH_001 Login success

Endpoint:

```bash
POST /api/admin/login
```

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"admin@123"}'
```

Expected:

- Status: `200`
- JSON:
  - `.success == true`
  - `.accessToken` is a non-empty string
  - `.message == "Super admin login successful"`

### TC_ADMIN_AUTH_002 Login missing username

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"admin@123"}'
```

Expected:

- Status: `400`
- `.success == false`
- `.message == "username required"`

### TC_ADMIN_AUTH_003 Login missing password

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin"}'
```

Expected:

- Status: `400`
- `.success == false`
- `.message == "password required"`

### TC_ADMIN_AUTH_004 Login invalid credentials

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"wrong-password"}'
```

Expected:

- Status: `401`
- `.success == false`
- `.message == "Invalid super admin credentials"`

### TC_ADMIN_AUTH_005 Profile success

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/profile" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data.username` is a non-empty string
- `.data.profileImageUrl` exists

### TC_ADMIN_AUTH_006 Profile without token

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/profile"
```

Expected:

- Status: `401`
- `.success == false`
- `.message` mentions missing admin token

### TC_ADMIN_AUTH_007 Update credentials success

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/update-credentials" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "currentUsername":"superadmin",
    "currentPassword":"admin@123",
    "newUsername":"superadmin",
    "newPassword":"newSecurePassword123",
    "profileImageUrl":"https://example.com/avatar.png"
  }'
```

Expected:

- Status: `200`
- `.success == true`
- `.data == "Super admin credentials updated successfully"`

### TC_ADMIN_AUTH_008 Update credentials missing new fields

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/update-credentials" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"currentUsername":"superadmin","currentPassword":"admin@123"}'
```

Expected:

- Status: `400`
- `.success == false`
- `.message == "newUsername and newPassword are required"`

---

## Dashboard and stats tests

### TC_ADMIN_STATS_001 Dashboard stats success

Endpoint:

```bash
GET /api/admin/stats
```

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/stats" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data.totals.schools` exists
- `.data.totals.students` exists
- `.data.totals.teachers` exists
- `.data.totals.wallet` exists
- `.data.registrations` is an array

### TC_ADMIN_STATS_002 Advanced stats success

Endpoint:

```bash
GET /api/admin/stats/advanced
```

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/stats/advanced" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data` exists

### TC_ADMIN_STATS_003 Churn radar success

Endpoint:

```bash
GET /api/admin/churn-radar
```

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/churn-radar" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data` exists

---

## Promo tests

### TC_ADMIN_PROMOS_001 List promos

Endpoint:

```bash
GET /api/admin/promos
```

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/promos" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data` is an array

### TC_ADMIN_PROMOS_002 Create promo success

Endpoint:

```bash
POST /api/admin/promos
```

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/promos" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "code":"BACKTOSCHOOL26",
    "creditAmount":"100.00",
    "freeDays":0,
    "discountPercentage":"15.00",
    "expiresAt":"2026-12-31T23:59:59Z",
    "maxUses":100
  }'
```

Expected:

- Status: `200`
- `.success == true`
- `.data.success == true`
- `.data.message` contains `BACKTOSCHOOL26`

### TC_ADMIN_PROMOS_003 Create promo missing code

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/promos" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"creditAmount":"100.00"}'
```

Expected:

- Status: `400`
- `.success == false`
- `.message == "Promo code must not be empty"`

### TC_ADMIN_PROMOS_004 Create promo invalid credit amount

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/promos" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"code":"BADPROMO","creditAmount":"not-a-number"}'
```

Expected:

- Status: `400`
- `.success == false`
- `.message == "Invalid credit amount format"`

### TC_ADMIN_PROMOS_005 Get promo usage

Endpoint:

```bash
GET /api/admin/promos/:promoId/usage
```

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/promos/1/usage" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data` exists

### TC_ADMIN_PROMOS_006 Apply promo to school

Endpoint:

```bash
POST /api/admin/schools/:schoolId/apply-promo
```

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/schools/SCH-00021/apply-promo" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"code":"BACKTOSCHOOL26"}'
```

Expected:

- Status: `200`
- `.success == true`
- `.data.success == true`
- `.data.message` exists

### TC_ADMIN_PROMOS_007 Apply promo missing code

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/schools/SCH-00021/apply-promo" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected:

- Status: `400`
- `.success == false`
- `.message == "Promo code required"`

---

## Config tests

### TC_ADMIN_CONFIG_001 Get config success

Endpoint:

```bash
GET /api/admin/config/:key
```

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/config/maintenance_mode" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data` is a string or object returned by config repository

### TC_ADMIN_CONFIG_002 Update config success

Endpoint:

```bash
POST /api/admin/config
```

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/config" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"key":"maintenance_mode","value":"true"}'
```

Expected:

- Status: `200`
- `.success == true`
- `.data == "Config updated"`

### TC_ADMIN_CONFIG_003 Update config missing key

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/config" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"value":"true"}'
```

Expected:

- Status: `400`
- `.success == false`
- `.message == "key is required"`

---

## School tenant tests

Use `SCH-00021` as a sample school id. Replace it with a real seeded school id for integration tests.

### TC_ADMIN_SCHOOLS_001 List all schools

Endpoint:

```bash
GET /api/admin/schools
```

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/schools" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data` is an array

### TC_ADMIN_SCHOOLS_002 List schools simple mode

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/schools?simple=true" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- Every item has `schoolId` and `schoolName`
- Every item has only simplified fields

### TC_ADMIN_SCHOOLS_003 Export all schools

Endpoint:

```bash
GET /api/admin/schools/export/all
```

Request:

```bash
curl -s -D /tmp/admin-schools-export.headers \
  -o /tmp/admin-schools-export.json \
  -X GET "$BASE_URL/api/admin/schools/export/all" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- Response header `Content-Type: application/json`
- Response header `Content-Disposition` contains `all_schools_backup_`
- Response body is valid JSON

### TC_ADMIN_SCHOOLS_004 Get school

Endpoint:

```bash
GET /api/admin/schools/:schoolId
```

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/schools/SCH-00021" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data.schoolId == "SCH-00021"`

### TC_ADMIN_SCHOOLS_005 Update school

Endpoint:

```bash
PUT /api/admin/schools/:schoolId
```

Request:

```bash
curl -s -X PUT "$BASE_URL/api/admin/schools/SCH-00021" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"schoolName":"Vidhyam High School - East Wing","contactEmail":"east@vidhyam.com"}'
```

Expected:

- Status: `200`
- `.success == true`
- `.data == "School updated"`

### TC_ADMIN_SCHOOLS_006 Delete school

Endpoint:

```bash
DELETE /api/admin/schools/:schoolId
```

Request:

```bash
curl -s -X DELETE "$BASE_URL/api/admin/schools/SCH-00021" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data == "School and all related data deleted"`

Warning: this permanently deletes school data. Use only in a disposable test database.

### TC_ADMIN_SCHOOLS_007 Set school status success

Endpoint:

```bash
PATCH /api/admin/schools/:schoolId/status
```

Request:

```bash
curl -s -X PATCH "$BASE_URL/api/admin/schools/SCH-00021/status" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"status":"blocked"}'
```

Expected:

- Status: `200`
- `.success == true`
- `.data == "School status set to blocked"`

### TC_ADMIN_SCHOOLS_008 Set school status invalid

Request:

```bash
curl -s -X PATCH "$BASE_URL/api/admin/schools/SCH-00021/status" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"status":"deleted"}'
```

Expected:

- Status: `400`
- `.success == false`
- `.message == "status must be active|blocked|inactive"`

### TC_ADMIN_SCHOOLS_009 Change school password success

Endpoint:

```bash
PATCH /api/admin/schools/:schoolId/password
```

Request:

```bash
curl -s -X PATCH "$BASE_URL/api/admin/schools/SCH-00021/password" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"adminHardResetPassword123"}'
```

Expected:

- Status: `200`
- `.success == true`
- `.data == "Password updated"`

### TC_ADMIN_SCHOOLS_010 Change school password missing field

Request:

```bash
curl -s -X PATCH "$BASE_URL/api/admin/schools/SCH-00021/password" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected:

- Status: `400`
- `.success == false`
- `.message == "newPassword required"`

### TC_ADMIN_SCHOOLS_011 Set session duration success

Endpoint:

```bash
PATCH /api/admin/schools/:schoolId/session
```

Request:

```bash
curl -s -X PATCH "$BASE_URL/api/admin/schools/SCH-00021/session" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"hours":72}'
```

Expected:

- Status: `200`
- `.success == true`
- `.data == "Session duration set to 72 hours"`

### TC_ADMIN_SCHOOLS_012 Set session duration invalid

Request:

```bash
curl -s -X PATCH "$BASE_URL/api/admin/schools/SCH-00021/session" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"hours":0}'
```

Expected:

- Status: `400`
- `.success == false`
- `.message == "hours must be 1–8760"`

Also test `hours: 8761` for upper-bound rejection.

### TC_ADMIN_SCHOOLS_013 Get school sessions

Endpoint:

```bash
GET /api/admin/schools/:schoolId/sessions
```

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/schools/SCH-00021/sessions" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data` is an array

### TC_ADMIN_SCHOOLS_014 Expire school sessions

Endpoint:

```bash
DELETE /api/admin/schools/:schoolId/sessions
```

Request:

```bash
curl -s -X DELETE "$BASE_URL/api/admin/schools/SCH-00021/sessions" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data` matches `"N sessions expired"` where `N` is an integer

### TC_ADMIN_SCHOOLS_015 Send school notification

Endpoint:

```bash
POST /api/admin/schools/:schoolId/notify
```

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/schools/SCH-00021/notify" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"System Update Complete",
    "message":"Attendance registers updated.",
    "type":"info"
  }'
```

Expected:

- Status: `200`
- `.success == true`
- `.data == "Notification sent"`

### TC_ADMIN_SCHOOLS_016 Clear school notification

Endpoint:

```bash
DELETE /api/admin/schools/:schoolId/notify
```

Request:

```bash
curl -s -X DELETE "$BASE_URL/api/admin/schools/SCH-00021/notify" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data == "Notification cleared"`

### TC_ADMIN_SCHOOLS_017 Get wallet ledger

Endpoint:

```bash
GET /api/admin/schools/:schoolId/ledger
```

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/schools/SCH-00021/ledger" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data` is an array

### TC_ADMIN_SCHOOLS_018 Process refund success

Endpoint:

```bash
POST /api/admin/schools/:schoolId/refund
```

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/schools/SCH-00021/refund" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"amount":"5000.00","description":"Overcharged billing error in May invoice."}'
```

Expected:

- Status: `200`
- `.success == true`
- `.data.success == true`
- `.data.newBalance` exists
- `.data.message` exists

### TC_ADMIN_SCHOOLS_019 Process refund invalid amount

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/schools/SCH-00021/refund" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"amount":"not-a-number"}'
```

Expected:

- Status: `500` in current implementation
- `.success == false`
- `.message == "Invalid amount format"`

### TC_ADMIN_SCHOOLS_020 Export school

Endpoint:

```bash
GET /api/admin/schools/:schoolId/export
```

Request:

```bash
curl -s -D /tmp/admin-school-export.headers \
  -o /tmp/admin-school-export.json \
  -X GET "$BASE_URL/api/admin/schools/SCH-00021/export" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- Response header `Content-Type: application/json`
- Response header `Content-Disposition` contains `school_SCH-00021_backup.json`
- Response body is valid JSON

### TC_ADMIN_SCHOOLS_021 Import school

Endpoint:

```bash
POST /api/admin/schools/:schoolId/import
```

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/schools/SCH-00021/import" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "exportVersion":"1.0",
    "school":{"schoolId":"SCH-00021","schoolName":"Vidhyam High School"},
    "students":[{"student_id":"STD-00001","name":"Sample Student"}],
    "employees":[],
    "billingLedgers":[]
  }'
```

Expected:

- Status: `200`
- `.success == true`
- `.data.success == true`
- `.data.imported` exists
- `.data.message` contains `Imported`

---

## Support tests

### TC_ADMIN_SUPPORT_001 List support requests

Endpoint:

```bash
GET /api/admin/support
```

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/support" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data` is an array

### TC_ADMIN_SUPPORT_002 Resolve support request

Endpoint:

```bash
PATCH /api/admin/support/:id/resolve
```

Request:

```bash
curl -s -X PATCH "$BASE_URL/api/admin/support/1/resolve" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data == "Request marked as resolved"`

---

## Global system tests

### TC_ADMIN_SYSTEM_001 Manual backup success

Endpoint:

```bash
POST /api/admin/backup
```

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/backup" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data == "Manual backup completed successfully"`

### TC_ADMIN_SYSTEM_002 Send global notification

Endpoint:

```bash
POST /api/admin/notify/global
```

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/notify/global" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Maintenance Notice",
    "message":"Scheduled maintenance tomorrow morning between 04:00 and 06:00 UTC.",
    "type":"warning"
  }'
```

Expected:

- Status: `200`
- `.success == true`
- `.data == "Global update sent"`

### TC_ADMIN_SYSTEM_003 Clear global notification

Endpoint:

```bash
DELETE /api/admin/notify/global
```

Request:

```bash
curl -s -X DELETE "$BASE_URL/api/admin/notify/global" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data == "Global notifications cleared"`

---

## CMS admin tests

Use UUID strings for CMS ids. Replace sample UUIDs with real ids created by earlier tests.

### TC_ADMIN_CMS_001 Create blog post

Endpoint:

```bash
POST /api/admin/cms/blog
```

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/cms/blog" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Empowering Education via AI Timetabling",
    "slug":"empowering-education-via-ai-timetabling",
    "excerpt":"Short summary",
    "content":"Full HTML or Markdown content here...",
    "cover_image_url":"https://example.com/cover.png",
    "author_name":"Platform Team",
    "category":"AI",
    "tags":["AI","Timetabling","EdTech"],
    "seo_title":"AI Timetabling",
    "seo_description":"SEO description",
    "is_published":true
  }'
```

Expected:

- Status: `200`
- `.success == true`
- `.data.id` exists

### TC_ADMIN_CMS_002 Update blog post

Endpoint:

```bash
PUT /api/admin/cms/blog/:id
```

Request:

```bash
curl -s -X PUT "$BASE_URL/api/admin/cms/blog/00000000-0000-0000-0000-000000000001" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Empowering Education via AI Timetabling Updated",
    "slug":"empowering-education-via-ai-timetabling",
    "excerpt":"Updated short summary",
    "content":"Updated HTML or Markdown content here...",
    "cover_image_url":"https://example.com/cover.png",
    "author_name":"Platform Team",
    "category":"AI",
    "tags":["AI","Timetabling","EdTech"],
    "seo_title":"AI Timetabling",
    "seo_description":"SEO description",
    "is_published":true
  }'
```

Expected:

- Status: `200`
- `.success == true`
- `.message == "Blog post updated"`

### TC_ADMIN_CMS_003 Delete blog post

Endpoint:

```bash
DELETE /api/admin/cms/blog/:id
```

Request:

```bash
curl -s -X DELETE "$BASE_URL/api/admin/cms/blog/00000000-0000-0000-0000-000000000001" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.message == "Blog post deleted"`

### TC_ADMIN_CMS_004 Create testimonial

Endpoint:

```bash
POST /api/admin/cms/testimonials
```

Request:

```bash
curl -s -X POST "$BASE_URL/api/admin/cms/testimonials" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name":"Dr. Sarah Paul",
    "client_title":"Principal, St. Xavier School",
    "school_name":"St. Xavier School",
    "avatar_url":"https://example.com/avatar.png",
    "rating":5,
    "content":"Vidhyam has resolved all our scheduling conflicts!",
    "is_featured":true,
    "display_order":1,
    "is_published":true
  }'
```

Expected:

- Status: `200`
- `.success == true`
- `.data.id` exists

### TC_ADMIN_CMS_005 Update testimonial

Endpoint:

```bash
PUT /api/admin/cms/testimonials/:id
```

Request:

```bash
curl -s -X PUT "$BASE_URL/api/admin/cms/testimonials/00000000-0000-0000-0000-000000000002" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name":"Dr. Sarah Paul",
    "client_title":"Principal, St. Xavier School",
    "school_name":"St. Xavier School",
    "avatar_url":"https://example.com/avatar.png",
    "rating":5,
    "content":"Vidhyam has resolved all our scheduling conflicts. Updated quote.",
    "is_featured":true,
    "display_order":1,
    "is_published":true
  }'
```

Expected:

- Status: `200`
- `.success == true`
- `.message == "Testimonial updated"`

### TC_ADMIN_CMS_006 Delete testimonial

Endpoint:

```bash
DELETE /api/admin/cms/testimonials/:id
```

Request:

```bash
curl -s -X DELETE "$BASE_URL/api/admin/cms/testimonials/00000000-0000-0000-0000-000000000002" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.message == "Testimonial deleted"`

### TC_ADMIN_CMS_007 List school access requests

Endpoint:

```bash
GET /api/admin/cms/school-requests
```

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/cms/school-requests" \
  -H "$AUTH_HEADER"
```

Expected:

- Status: `200`
- `.success == true`
- `.data` is an array

### TC_ADMIN_CMS_008 Update school access request

Endpoint:

```bash
PUT /api/admin/cms/school-requests/:id
```

Request:

```bash
curl -s -X PUT "$BASE_URL/api/admin/cms/school-requests/00000000-0000-0000-0000-000000000003" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved","admin_notes":"Approved after phone verification."}'
```

Expected:

- Status: `200`
- `.success == true`
- `.message == "Request updated"`

---

## Negative auth tests

### TC_ADMIN_NEGATIVE_001 Protected endpoint with invalid token

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/promos" \
  -H "Authorization: Bearer invalid-token"
```

Expected:

- Status: `401`
- `.success == false`
- `.message` mentions invalid token or token parsing

### TC_ADMIN_NEGATIVE_002 Protected endpoint with missing Bearer prefix

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/promos" \
  -H "Authorization: invalid-token"
```

Expected:

- Status: `401`
- `.success == false`
- `.message` mentions missing admin token

### TC_ADMIN_NEGATIVE_003 Expired admin token

Create an old token manually using the current `SUPER_ADMIN_SECRET`, or use a helper script to encode:

```text
superadmin:0:<SUPER_ADMIN_SECRET>
```

Request:

```bash
curl -s -X GET "$BASE_URL/api/admin/promos" \
  -H "Authorization: Bearer <oldBase64Token>"
```

Expected:

- Status: `401`
- `.success == false`
- `.message` mentions expired token

---

## Route coverage checklist

| Area | Test ids |
|---|---|
| Auth | `TC_ADMIN_AUTH_001` to `TC_ADMIN_AUTH_008` |
| Stats | `TC_ADMIN_STATS_001` to `TC_ADMIN_STATS_003` |
| Promos | `TC_ADMIN_PROMOS_001` to `TC_ADMIN_PROMOS_007` |
| Config | `TC_ADMIN_CONFIG_001` to `TC_ADMIN_CONFIG_003` |
| Schools | `TC_ADMIN_SCHOOLS_001` to `TC_ADMIN_SCHOOLS_021` |
| Support | `TC_ADMIN_SUPPORT_001` to `TC_ADMIN_SUPPORT_002` |
| System | `TC_ADMIN_SYSTEM_001` to `TC_ADMIN_SYSTEM_003` |
| CMS admin | `TC_ADMIN_CMS_001` to `TC_ADMIN_CMS_008` |
| Negative auth | `TC_ADMIN_NEGATIVE_001` to `TC_ADMIN_NEGATIVE_003` |
