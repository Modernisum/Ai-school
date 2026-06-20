# 🏫 Chapter 9: Resources & Storage Domain Manual

This manual classroom locations, rooms layouts, category settings, inventory materials tracking, budget checks, events, student awards, doc archives, aur media uploads details manage karta hai.

---

## 📖 Overview aur Features (Udeshya aur Suvidhayein)

### 🎯 Feature Purpose (Kyun banaya gaya hai)
Physical aur digital resources jaise library books, projectors, school buses, aur document files manage karta hai. Isse school assets ka record maintain rehta hai.


Resources & Storage domain school physical structure layouts, assets count, aur files upload bucket ko track karta hai:
- **Spaces Layouts:** Room locations aur classroom types (lecture hall, library) build aur configure karta hai.
- **Budget Tracking:** Specific rooms/spaces ke sath financial budget constraints connect karta hai.
- **Inventory Stock:** Inventory items status, safe stock levels, aur buying/selling records control karta hai.
- **Material Allocations:** Central inventory room se specific spaces tak item count allocates aur transfers handle karta hai.
- **Event Calendars:** Calendar cards, non-academic programs aur rentals schedule karta hai.
- **Document Box:** Student documents aur admission receipts securely scan aur filter karne ka support deta hai.
- **Generic Asset Storage:** Files upload system direct karta hai aur authorization verifications ke zariye serve karta hai.

---

## 🏗️ Architecture aur Data Flow

### 🛠️ Tech Stack aur Dependencies
- **Framework:** Axum
- **Database:** Postgres (sqlx).
- **Storage:** S3 APIs (aws-sdk-s3 or rusoto) for digital files.

### 🌊 Deep Code aur Data Flow
1. **Request:** User book issue karta hai ya administrative document upload karta hai.
2. **Service Logic:** `services/resources/` asset count check karta hai ya files ko AWS S3 par bhejta hai.
3. **Database:** Resource inventory ya uploaded file details database mein save hoti hain.
4. **Response:** Confirmation status bhej diya jata hai.


- **Route Module:** `src/domain/resources/mod.rs`
- **Handler Files:** `src/domain/resources/spaces.rs`, `src/domain/resources/materials.rs`, `src/domain/resources/events.rs`, `src/domain/resources/award.rs`, `src/domain/resources/document_upload.rs`, `src/domain/resources/documentbox.rs`, `src/domain/resources/storage.rs`
- **Services:** `src/services/resources/`
- **Repositories:** `src/repository/resources/`
- **Database Tables:** `spaces`, `space_categories`, `materials`, `space_materials`, `calendar_events`, `awards`, `documents`, `stored_assets`

```mermaid
sequenceDiagram
    autonumber
    actor Admin as School Administrator
    participant Resources as Resources Handlers (Axum)
    participant Storage as Storage Handler
    database DB as Postgres Database

    Admin->>Resources: POST /spaces/materials/chemistry_lab {"materialName": "beaker", "quantity": 10}
    Resources->>DB: Check central inventory stock has >= 10 beakers
    DB-->>Resources: Stock verified (Remaining: 50)
    Resources->>DB: Decrement central stock by 10 & Increment chemistry_lab beakers by 10
    DB-->>Resources: Transaction committed
    Resources-->>Admin: JSON { success: true }
```

---

## 🚦 Developer Laws (Do's aur Don'ts - Kya karein aur kya na karein)

- **DO:** Scope all room layouts, inventory stock, and document boxes strictly to the tenant's `school_id` derived from the `TenantContext`.
- **DO:** Verify that central stock has sufficient quantities before permitting transfers of materials to specific spaces.
- **DON'T:** Never store uploaded assets using raw user-provided file names. Always generate random UUIDs for filenames to prevent Directory Traversal attacks.
- **DON'T:** Never serve files located in `/uploads/*` without executing JWT authentication.

---

## 🔌 API Reference aur Specs (API Ki Jankari)

### 1. Spaces & Categories Layout

#### A. Create Space Category
- **Endpoint:** `POST /api/school/:schoolId/resources/spaces/categories`
- **Request Body:**
  ```json
  {
    "name": "Science Laboratories",
    "isDefault": false
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "message": "Category created"
  }
  ```

#### B. Register Room under Category
- **Endpoint:** `POST /api/school/:schoolId/resources/spaces/:category`
- **Path Parameters:**
  - `category` (string, required): Category name (e.g. `labs`).
- **Request Body:**
  ```json
  {
    "spaceName": "physics_lab",
    "description": "Floor 2 Physics Laboratory"
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "spaceId": "SPC_9981",
      "spaceName": "physics_lab"
    }
  }
  ```

#### C. Clone Room layout parameters
- **Endpoint:** `POST /api/school/:schoolId/resources/spaces/:spaceName/clone`
- **Request Body:**
  ```json
  {
    "newSpaceName": "physics_lab_copy"
  }
  ```

---

### 2. Space Budgets

#### A. Update Space Budget
- **Endpoint:** `PUT /api/school/:schoolId/resources/spaces/detail/:spaceName/budget`
- **Request Body:**
  ```json
  {
    "amount": 25000.0,
    "currency": "INR"
  }
  ```

---

### 3. Room Inventory Allocations

#### A. Allocate inventory items to room
- **Endpoint:** `POST /api/school/:schoolId/resources/spaces/:spaceName/materials`
- **Request Body:**
  ```json
  {
    "materialName": "beaker",
    "quantity": 15
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "message": "allocated 15 items to space physics_lab"
  }
  ```

#### B. Transfer items from Room A to Room B
- **Endpoint:** `POST /api/school/:schoolId/resources/spaces/:spaceName/materials/:materialName/transfer`
- **Request Body:**
  ```json
  {
    "toSpace": "chemistry_lab",
    "quantity": 5
  }
  ```

---

### 4. Central Inventory Materials Stock

#### A. Register New Stock Item
- **Endpoint:** `POST /api/school/:schoolId/resources/materials`
- **Request Body:**
  ```json
  {
    "materialName": "marker_pen",
    "quantity": 100,
    "unitPrice": 15.0,
    "unit": "box",
    "description": "Dry erase black markers"
  }
  ```

#### B. Increment Stock levels (Buy transaction)
- **Endpoint:** `POST /api/school/:schoolId/resources/materials/:materialName/buy`
- **Request Body:**
  ```json
  {
    "quantity": 50,
    "pricePaid": 750.0
  }
  ```

#### C. Run Stock Shortage Check
- **Endpoint:** `POST /api/school/:schoolId/resources/materials/run-shortage-check`
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "shortageItemsCount": 2,
      "shortageSummary": [
        { "materialName": "marker_pen", "quantity": 5, "minLimit": 10 }
      ]
    }
  }
  ```

---

### 5. Event Calendars

#### A. Add Event Card
- **Endpoint:** `POST /api/school/:schoolId/resources/events`
- **Request Body:**
  ```json
  {
    "title": "Annual Parent-Teacher Meeting",
    "description": "Academic progress reviews.",
    "startTime": "2026-06-15T10:00:00Z",
    "endTime": "2026-06-15T16:00:00Z",
    "spaceId": "auditorium"
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": { "eventId": "EVT-0091" }
  }
  ```

---

### 6. Document Uploads & Box Storage Explorer

#### A. Upload Administrative Files
- **Endpoint:** `POST /api/school/:schoolId/resources/documents/upload`
- **Headers:** `Content-Type: multipart/form-data`
- **Request Payload:** Form fields `file` (binary), `category` (string).
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "documentId": "DOC-99823",
      "url": "/api/school/SCH-00021/resources/storage/uploads/DOC-99823.pdf"
    }
  }
  ```

#### B. Get Document Box Storage Explorer
- **Endpoint:** `GET /api/school/:schoolId/resources/documents/box`
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "folders": ["Admission Forms", "Certificates"],
      "files": [
        { "name": "PTM_Minutes.pdf", "size": 104857, "uploadedAt": "2026-06-08T08:00:00Z" }
      ]
    }
  }
  ```

---

### 7. Asset Storage Registry

#### A. Upload Generic File
- **Endpoint:** `POST /api/school/:schoolId/resources/storage/upload`
- **Headers:** `Content-Type: multipart/form-data`
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "id": "file_uuid_string",
      "url": "http://localhost:8080/api/school/SCH-00021/resources/storage/uploads/file_uuid_string.jpg"
    }
  }
  ```

#### B. Delete Asset File by URL Match
- **Endpoint:** `DELETE /api/school/:schoolId/resources/storage/file-by-url`
- **Query Parameters:**
  - `url` (string, required): URL of target file.
- **Success Response:**
  ```json
  {
    "success": true,
    "message": "File and registry deleted"
  }
  ```

#### C. Serve Uploaded Assets
- **Endpoint:** `GET /api/school/:schoolId/resources/storage/uploads/*`
- **Authentication:** Bearer Token
- **Success Response:** Returns binary file contents.

---

## 🕒 Update History aur Status (Badlavo ki History)

*Is section mein hum saare bade badlavo, design decisions, aur future plans ko track karte hain.*

- **Storage system move:** Generic `/storage` endpoints have been moved out of the system module and consolidated under the `/resources/storage` namespace to align with modular resource layers.
- **Public room list:** Third-party integration support added for `/resources/public/spaces` (requires API key) to allow exterior directories to pull classroom list definitions.
