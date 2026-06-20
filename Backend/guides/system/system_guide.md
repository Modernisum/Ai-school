# 🛠️ Chapter 13: System Domain Manual

This manual database audit controls, student change records undo operations, api keys security levels, developer sandboxes, aur generic table CRUD systems ko detail karta hai.

---

## 📖 Overview aur Features (Udeshya aur Suvidhayein)

### 🎯 Feature Purpose (Kyun banaya gaya hai)
Platform stability aur security ke liye monitoring, DB backups, aur developer sandboxes handle karta hai.


System domain server configuration boundaries, diagnostic logs, aur base integrations security controls ko manage karta hai:
- **Auditing & Undo Recoveries:** Database mutations record karta hai aur admins ko changes/deletions revert karne ki undo capacity deta hai.
- **Integration API Keys:** Biometric device scanners aur external registers ke liye connection tokens/API keys manage karta hai.
- **Developer Access Sandbox:** Outside developer requests process karta hai aur emergency logs status controls detail karta hai.
- **Generic Database CRUD:** Back-office tables ke liye generic insert/update endpoints create karta hai taaki database entries directly handle ho sakein.

---

## 🏗️ Architecture aur Data Flow

### 🛠️ Tech Stack aur Dependencies
- **Framework:** Axum
- **Database:** Postgres (sqlx) / ClickHouse for heavy audit logs.
- **Metrics:** Prometheus endpoint, Tracing (tracing-subscriber).

- **Route Module:** `src/domain/system/mod.rs`
- **Handler Files:** `src/domain/system/geo.rs`, `src/domain/system/recovery.rs`, `src/domain/system/api_keys.rs`, `src/domain/system/dev_access.rs`, `src/domain/system/generic.rs`
- **Services:** `src/services/system/`
- **Repositories:** `src/repository/system/`
- **Database Tables:** `system_audit_logs`, `school_api_keys`, `developer_access_records`, `developer_activity_logs`, `countries`, `states`, `districts`

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / Sandbox Client
    participant Auth as Dev Access Middleware
    participant Exec as Generic CRUD Handlers
    database DB as Postgres Database

    Dev->>Auth: POST /system/crud/students {"name": "Test"} with Dev-Token
    Note over Auth: Verify Dev-Token in Redis Cache.<br/>Check if table "students" is authorized.
    Auth->>Exec: Route to generic CRUD handler
    Exec->>DB: INSERT INTO students ...
    DB-->>Exec: OK
    Exec-->>Dev: Return JSON Response
```

---

## 🚦 Developer Laws (Do's & Don't)

- **DO:** Check scope parameters on API keys inside integration routes to ensure external apps only access permitted directories.
- **DO:** Restrict dynamic generic CRUD `/system/crud/:table` strictly to authorized database tables listed in system configuration guards.
- **DON'T:** Never allow developer access sandboxes to run database schema modifications (e.g., `DROP TABLE`) over the API.

---

## 🔌 API Reference aur Specs (API Ki Jankari)

### 1. Database Auditing & Recovery Undo

#### A. Fetch Student Mutation Logs
- **Endpoint:** `GET /api/school/:schoolId/system/recovery/history/students`
- **Success Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "logId": "rec_99281",
        "action": "delete",
        "studentId": "STD-99882",
        "deletedFieldsJson": "{\"name\":\"Jane Doe\",\"roll_number\":14}",
        "performedBy": "EMP-00100",
        "timestamp": "2026-06-07T12:00:00Z"
      }
    ]
  }
  ```

#### B. Revert Student Deletion / Change
- **Endpoint:** `POST /api/school/:schoolId/system/recovery/history/undo/:id`
- **Success Response:**
  ```json
  {
    "success": true,
    "message": "Student record restored successfully"
  }
  ```

#### C. Undo Log by Generic Audit ID
- **Endpoint:** `POST /api/school/:schoolId/system/recovery/audit/undo/:logId`

---

### 3. Integration API Keys

#### A. Generate API Key
- **Endpoint:** `POST /api/school/:schoolId/system/api-keys/`
- **Request Body:**
  ```json
  {
    "name": "Biometric Machine key",
    "scopes": ["attendance.write", "people.read"]
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "keyId": "key_009981",
      "apiKey": "vdy_live_771827981ab...",
      "scopes": ["attendance.write", "people.read"]
    }
  }
  ```

#### B. Revoke API Key
- **Endpoint:** `DELETE /api/school/:schoolId/system/api-keys/:keyId`

---

### 4. Developer Access Sandbox

#### A. Request Developer Access
- **Endpoint:** `POST /api/school/:schoolId/system/developer-access/:dev_id/request`
- **Request Body:**
  ```json
  {
    "developerEmail": "dev@partner.com",
    "requestedRole": "read_only",
    "justification": "Debugging syllabus planning timelines.",
    "requestedTables": ["timetables", "period_plans"],
    "durationMinutes": 60
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "requestId": 1209,
      "status": "pending"
    }
  }
  ```

#### B. Approve Developer Request (Platform Owner)
- **Endpoint:** `POST /api/school/:schoolId/system/developer-access/requests/:req_id/approve`
- **Request Body:**
  ```json
  {
    "approverId": "superadmin",
    "approverEmail": "admin@vidhyam.com",
    "approvalNotes": "Approved for 60 minutes.",
    "overrideDurationMinutes": 60
  }
  ```

#### C. Escalate Emergency Developer Privileges
Bypasses standard approval channels during system failures (generates severe security alarms).
- **Endpoint:** `POST /api/school/:schoolId/system/developer-access/:dev_id/emergency`
- **Request Body:**
  ```json
  {
    "justification": "Fixing production database locking issues."
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "escalationId": "esc_99823",
      "activeUntil": "2026-06-08T09:35:00Z"
    }
  }
  ```

---

### 5. Back-office Generic Table CRUD

Allows dynamic SQL mutations directly over tables using URL parameters (restricted by security policies).
- **Endpoints:**
  - `POST /api/school/:schoolId/system/crud/:table` (Add row)
  - `GET /api/school/:schoolId/system/crud/:table` (List rows)
  - `GET /api/school/:schoolId/system/crud/:table/:id` (Get row)
  - `PUT /api/school/:schoolId/system/crud/:table/:id` (Update row)
  - `DELETE /api/school/:schoolId/system/crud/:table/:id` (Delete row)
- **Path Parameters:**
  - `table` (string, required): Allowed table names (e.g. `holidays`, `awards`).
  - `id` (integer/string, required): Row identifier.
- **Success Response (Get Row):**
  ```json
  {
    "success": true,
    "data": {
      "id": 12,
      "school_id": "SCH-00021",
      "award_name": "Valedictorian 2026",
      "recipient_id": "STD-99882"
    }
  }
  ```

---

## 🕒 Update History aur Status (Badlavo ki History)

*Is section mein hum saare bade badlavo, design decisions, aur future plans ko track karte hain.*

- **Emergency Escalation Registry:** Added `/developer-access/:dev_id/emergency` which logs emergency tokens directly to central audits and publishes Slack alerts to system operations.
- **Dynamic CRUD guards:** Table CRUD `/system/crud/:table` is updated to check metadata access lists to prevent edits on sensitive credential tables like `users` or `school_ai_configs`.
