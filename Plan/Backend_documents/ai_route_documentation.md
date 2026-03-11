# AI Route Documentation

**File:** `src/routes/ai.rs`  
**Service:** `src/services/ai_service.rs`  
**Logic:** `src/logic/ai_orchestrator.rs`

---

## Route

**Method:** `POST /api/ai/:schoolId/query`

**Description:** Natural language query interface powered by Gemini AI. The AI can fetch real-time school data from the database using tool calling.

**Authentication:** Required (school token)

---

## Request

```
POST /api/ai/{school_id}
Content-Type: application/json
```

| Parameter | Type | Location | Required | Description |
|---|---|---|---|---|
| `school_id` | String | URL Path | ✅ | School identifier |
| `query` | String | JSON Body | ✅ | Natural language question |

**Example Request Body:**
```json
{
  "query": "Aaj kitne students present hain aur pending fees kitni hai?"
}
```

---

## Response

### Success
```json
{
  "success": true,
  "data": {
    "answer": "Aaj 45 students present hain...",
    "type": "text"
  }
}
```

### Success (PDF Generated)
```json
{
  "success": true,
  "data": {
    "answer": "...",
    "pdf_base64": "JVBERi0xLjQ...",
    "type": "text"
  }
}
```

### Error Responses
| Status | Condition | Message |
|---|---|---|
| `400` | `query` is empty | `"Query cannot be empty"` |
| `500` | Gemini API key missing | `"GEMINI_API_KEY not set"` |
| `500` | DB or network failure | Error details |
| `500` | 3 AI turns exceeded | `"Max turns exceeded in AI loop"` |

---

## Internal Workflow

```
Client
  │
  ▼
POST /api/ai/:school_id + { "query": "..." }
  │
  ├─ [Validation]
  │    query empty? → 400 Bad Request
  │
  ▼
AiOrchestrator::process_query(school_id, query)
  │
  ├─ Check GEMINI_API_KEY set? No → Error
  │
  ▼
[Step 1] Send query to Gemini (gemini-1.5-flash)
  with system_instruction:
  "You are Vidhyam AI for School {school_id}. Use tools."
  with available tools (see below)
  │
  ▼
[Step 2] Gemini Response — Two possibilities:
  │
  ├─ (A) Gemini calls a tool ──────────────────────────────┐
  │         │                                              │
  │         ▼                                             │
  │   Backend executes tool (fetches from DB)             │
  │         │                                             │
  │         ▼                                             │
  │   Tool result sent back to Gemini                     │
  │         │                                             │
  │         └── Loop again (Max 3 turns) ────────────────┘
  │
  └─ (B) Gemini gives final text answer
           │
           ▼
     { "answer": "...", "type": "text" }
  │
  ▼
Route returns JSON to client
```

---

## Available AI Tools

These tools are registered with Gemini so it can call them when needed:

| Tool Name | Description | Parameters |
|---|---|---|
| `get_school_stats` | Total count of students, employees, classes | None |
| `get_attendance_summary` | Present/Absent/Leave counts for a date | `date` (YYYY-MM-DD) |
| `get_pending_fees_report` | List of students with pending fees | `months_overdue` (optional int) |
| `get_fee_financial_summary` | Total expected vs collected vs pending fees | None |
| `query_staff_analytics` | Staff breakdown by type and status | None |
| `generate_pdf_report` | Generate PDF and return as Base64 | `title` (string) |

---

## Tool → Database Mapping

| Tool | Repository Method |
|---|---|
| `get_school_stats` | `repos.analytics.get_school_stats(school_id)` |
| `get_attendance_summary` | `repos.analytics.get_attendance_summary(school_id, date)` |
| `get_pending_fees_report` | `repos.analytics.get_pending_fees_by_period(school_id, months)` |
| `get_fee_financial_summary` | `repos.analytics.get_fee_summary(school_id)` |
| `query_staff_analytics` | `repos.analytics.query_staff_analytics(school_id)` |
| `generate_pdf_report` | `PdfGenerator::generate_report(title, &data)` → Base64 |

---

## Multi-Turn Loop Detail

```
Turn 1: User query  ──► Gemini
Turn 1: Gemini      ──► Tool Call Request (e.g., get_school_stats)
Turn 1: Backend     ──► DB → returns { totalStudents: 120, ... }
Turn 2: Tool result ──► Gemini
Turn 2: Gemini      ──► Tool Call Request (e.g., get_attendance_summary)
Turn 2: Backend     ──► DB → returns { present: 98, absent: 22 }
Turn 3: Tool result ──► Gemini
Turn 3: Gemini      ──► Final text answer returned to user
```

Max 3 turns. If exceeded → `500 Error`.

---

## Environment Variable Required

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (from Google AI Studio) |

---

## Example Conversations

### Example 1 — School Stats
```
User:  "Mere school mein kitne students hain?"
AI:    [calls get_school_stats]
AI:    "Aapke school mein 342 students, 28 employees aur 12 classes hain."
```

### Example 2 — Attendance
```
User:  "Aaj 2026-03-11 ko attendance kaisi rahi?"
AI:    [calls get_attendance_summary with date=2026-03-11]
AI:    "Aaj 290 students present rahe, 45 absent aur 7 leave par hain."
```

### Example 3 — PDF Report
```
User:  "Pending fees ki PDF report chahiye"
AI:    [calls get_pending_fees_report]
AI:    [calls generate_pdf_report with the fetched data]
AI:    Returns pdf_base64 + message "PDF report ready hai."
```
