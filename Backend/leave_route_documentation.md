# Leave Route Documentation

**File:** `src/routes/leave.rs`  
**Service:** `src/services/leave_service.rs`  
**Table:** `leave_applications`

---

## Routes Summary

| # | Method | URL | Handler | Description |
|---|---|---|---|---|
| 1 | `POST` | `/api/leave/:school_id` | `create_leave` | Leave application submit karo |
| 2 | `GET` | `/api/leave/:school_id` | `list_leaves` | School ki sabhi leaves list karo |
| 3 | `POST` | `/api/leave/:school_id/:leave_id/approve` | `approve_leave` | Leave approve karo |
| 4 | `POST` | `/api/leave/:school_id/:leave_id/reject` | `reject_leave` | Leave reject karo |
| 5 | `POST` | `/api/leave/:school_id/:leave_id/extend` | `extend_leave` | Leave duration extend karo |
| 6 | `POST` | `/api/leave/:school_id/:leave_id/reduce` | `reduce_leave` | Leave duration kam karo |
| 7 | `GET` | `/api/leave/:school_id/:leave_id/pdf` | `download_leave_pdf` | Leave letter PDF download karo |

---

## Route 1: Create Leave Application
```
POST /api/leave/:school_id
Body:
{
  "employeeId": "EMP001",
  "employeeName": "Ramesh Kumar",
  "reason": "Family function",
  "leaveType": "casual",
  "fromDate": "2026-03-20",
  "toDate": "2026-03-22"
}

→ INSERT INTO leave_applications
    (leave_id, school_id, employee_id, employee_name, reason, leave_type, from_date, to_date, status)
  VALUES (uuid, $1, ...)
  status = 'pending' (default)
```

**Response:**
```json
{ "success": true, "data": { "leaveId": "uuid", "status": "pending", ... } }
```

---

## Route 2: List All Leaves
```
GET /api/leave/:school_id
→ SELECT * FROM leave_applications WHERE school_id = $1 ORDER BY created_at DESC
```

---

## Route 3 & 4: Approve / Reject Leave
```
POST /api/leave/:school_id/:leave_id/approve
POST /api/leave/:school_id/:leave_id/reject

→ UPDATE leave_applications SET status = 'approved'/'rejected'
  WHERE leave_id = $1 AND school_id = $2
```

---

## Route 5 & 6: Extend / Reduce Leave Duration
```
POST /api/leave/:school_id/:leave_id/extend
Body: { "days": 2 }
→ to_date = to_date + 2 days

POST /api/leave/:school_id/:leave_id/reduce
Body: { "days": 1 }
→ to_date = to_date - 1 day
```

---

## Route 7: Download PDF Letter ⭐

### `GET /api/leave/:school_id/:leave_id/pdf`

**Returns:** Binary PDF file (download prompt in browser)

**Workflow:**
```
→ Fetch leave by leave_id from service
→ Generate A4 PDF using `printpdf` crate:
    - Title: "OFFICIAL LEAVE LETTER" (bold, 24pt)
    - Fields: Applicant, Role, Start Date, End Date
    - Status (colour coded):
        ✅ APPROVED → Green
        ❌ REJECTED  → Red
        ⏳ PENDING   → Grey
    - Reason (word-wrapped at 75 chars)
    - Signature line at bottom
→ Returns binary PDF with headers:
    Content-Type: application/pdf
    Content-Disposition: attachment; filename="Leave_Letter.pdf"
```

**Response:** PDF binary (browser prompts download)

---

## Leave Status Flow

```
[Submit] → status: "pending"
    │
    ├─► [Approve] → status: "approved"
    └─► [Reject]  → status: "rejected"

[Approved leave]
    │
    ├─► [Extend] → to_date += N days
    └─► [Reduce] → to_date -= N days
```

---

## Database Table: `leave_applications`

| Column | Description |
|---|---|
| `leave_id` | UUID primary key |
| `school_id` | School identifier |
| `employee_id` | Linked employee |
| `employee_name` | Name for display |
| `reason` | Leave reason text |
| `leave_type` | `casual` / `sick` / `earned` |
| `from_date` | Start date |
| `to_date` | End date |
| `status` | `pending` / `approved` / `rejected` |
| `created_at` | Auto timestamp |
