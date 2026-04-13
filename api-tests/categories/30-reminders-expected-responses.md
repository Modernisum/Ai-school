# Reminder Management APIs - Expected Responses

This document outlines the expected responses for Reminder Management API endpoints.

## Authentication Requirements
- **RLS Authentication Required:** Yes
- **Required Headers:**
  - `X-School-ID`: School identifier
  - `X-Admin-ID`: Admin user identifier
- **Access Level:** School admin, teachers (for their own reminders), authorized staff

## Overview
Reminder Management APIs handle system reminders for tasks, deadlines, events, and notifications within the school. Reminders can be assigned to individuals, groups, or roles, and support multiple notification channels (in-app, email, SMS). Reminders can be one-time or recurring.

## 1. GET /api/reminders/:schoolId - List All Reminders

**Query Parameters:**
- `status` (optional): Filter by status (e.g., "active", "completed", "expired")
- `priority` (optional): Filter by priority (e.g., "low", "medium", "high", "critical")
- `reminder_type` (optional): Filter by type (e.g., "task", "event", "deadline", "notification")
- `assigned_to` (optional): Filter by assignee group (e.g., "teachers", "students", "parents", "all")
- `due_date_from` (optional): Filter reminders due after this date (YYYY-MM-DD)
- `due_date_to` (optional): Filter reminders due before this date (YYYY-MM-DD)
- `include_completed` (optional): Include completed reminders (default: false)

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
      "title": "Submit Annual Reports",
      "description": "All teachers must submit annual reports by Friday",
      "reminder_type": "task",
      "priority": "high",
      "status": "active",
      "due_date": "2024-03-22",
      "due_time": "17:00:00",
      "assigned_to": "teachers",
      "assigned_to_ids": ["teacher_001", "teacher_002"],
      "assigned_to_names": ["John Smith", "Jane Doe"],
      "created_by": "admin_001",
      "created_by_name": "Admin User",
      "created_at": "2024-03-15T10:30:00Z",
      "notification_channels": ["in_app", "email"],
      "repeat_schedule": "none",
      "tags": ["reports", "deadline", "academic"],
      "completion_percentage": 0,
      "completed_at": null,
      "completed_by": null,
      "snoozed_until": null,
      "attachments": []
    },
    {
      "id": 2,
      "title": "Parent-Teacher Meeting",
      "description": "Quarterly parent-teacher meeting for all classes",
      "reminder_type": "event",
      "priority": "medium",
      "status": "upcoming",
      "due_date": "2024-03-25",
      "due_time": "09:00:00",
      "assigned_to": "all",
      "assigned_to_ids": [],
      "assigned_to_names": [],
      "created_by": "admin_001",
      "created_by_name": "Admin User",
      "created_at": "2024-03-10T14:20:00Z",
      "notification_channels": ["in_app", "email", "sms"],
      "repeat_schedule": "quarterly",
      "tags": ["meeting", "parents", "academic"],
      "completion_percentage": 0,
      "completed_at": null,
      "completed_by": null,
      "snoozed_until": null,
      "attachments": [
        {
          "name": "meeting_agenda.pdf",
          "url": "https://storage.example.com/attachments/meeting_agenda.pdf"
        }
      ]
    }
  ],
  "metadata": {
    "total": 15,
    "active": 8,
    "completed": 5,
    "expired": 2,
    "priority_distribution": {
      "critical": 1,
      "high": 3,
      "medium": 7,
      "low": 4
    },
    "type_distribution": {
      "task": 6,
      "event": 4,
      "deadline": 3,
      "notification": 2
    }
  }
}
```

**Validation Criteria:**
- Should return 200 OK status
- Should include list of reminders with assignee details
- Should support filtering by various criteria
- Should include metadata with statistics
- Should handle empty results gracefully
- Should respect user permissions (users see only their assigned reminders unless admin)

**Error Responses:**
- **401 Unauthorized:** Missing or invalid RLS headers
- **400 Bad Request:** Invalid query parameters

## 2. POST /api/reminders/:schoolId - Create Reminder

**Request Body Structure:**
```json
{
  "title": "Submit Annual Reports",
  "description": "All teachers must submit annual reports by Friday",
  "reminder_type": "task",
  "priority": "high",
  "due_date": "2024-03-22",
  "due_time": "17:00:00",
  "assigned_to": "teachers",
  "assigned_to_ids": ["teacher_001", "teacher_002"],
  "notification_channels": ["in_app", "email"],
  "repeat_schedule": "none",
  "tags": ["reports", "deadline", "academic"]
}
```

**Field Descriptions:**
| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `title` | Yes | Reminder title | "Submit Annual Reports" |
| `description` | No | Detailed description | "All teachers must submit..." |
| `reminder_type` | Yes | Type of reminder | "task", "event", "deadline", "notification" |
| `priority` | Yes | Priority level | "low", "medium", "high", "critical" |
| `due_date` | Yes | Due date (YYYY-MM-DD) | "2024-03-22" |
| `due_time` | No | Due time (HH:MM:SS) | "17:00:00" |
| `assigned_to` | Yes | Assignee group | "teachers", "students", "parents", "all", "specific" |
| `assigned_to_ids` | No | Specific user IDs when assigned_to="specific" | ["teacher_001", "teacher_002"] |
| `notification_channels` | No | Notification methods | ["in_app", "email", "sms"] |
| `repeat_schedule` | No | Recurrence pattern | "none", "daily", "weekly", "monthly", "quarterly", "yearly" |
| `tags` | No | Categorization tags | ["reports", "deadline", "academic"] |

**Expected Successful Response:**
- **Status Code:** 201 Created
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "title": "Submit Annual Reports",
    "description": "All teachers must submit annual reports by Friday",
    "reminder_type": "task",
    "priority": "high",
    "status": "active",
    "due_date": "2024-03-22",
    "due_time": "17:00:00",
    "assigned_to": "teachers",
    "assigned_to_ids": ["teacher_001", "teacher_002"],
    "assigned_to_names": ["John Smith", "Jane Doe"],
    "created_by": "admin_001",
    "created_by_name": "Admin User",
    "created_at": "2024-03-15T10:30:00Z",
    "notification_channels": ["in_app", "email"],
    "repeat_schedule": "none",
    "tags": ["reports", "deadline", "academic"],
    "completion_percentage": 0,
    "completed_at": null,
    "completed_by": null,
    "snoozed_until": null,
    "next_occurrence": "2024-03-22T17:00:00Z",
    "recurrence_id": null
  }
}
```

**Validation Criteria:**
- Should return 201 Created status
- Should include created reminder with generated ID
- Should validate assigned users exist
- Should set default values: `status` = "active", `completion_percentage` = 0
- Should calculate next occurrence for recurring reminders
- Should include assignee names from user records

**Error Responses:**
- **400 Bad Request:** Missing required fields, invalid data format
- **404 Not Found:** Assigned users not found
- **401 Unauthorized:** Missing or invalid RLS headers

## Reminder Types Reference

| Type | Description | Use Cases |
|------|-------------|-----------|
| `task` | Action item requiring completion | Submit reports, complete training, review documents |
| `event` | Calendar event | Meetings, conferences, school events |
| `deadline` | Time-sensitive deadline | Application deadlines, payment due dates |
| `notification` | Informational notice | System updates, policy changes, announcements |

## Priority Levels

| Level | Color | Response Time | Escalation |
|-------|-------|---------------|------------|
| `critical` | Red | Immediate | Multiple channels, repeated notifications |
| `high` | Orange | Within 24 hours | Email + in-app, single reminder |
| `medium` | Yellow | Within 3 days | In-app notification |
| `low` | Green | Within 7 days | Optional notification |

## Repeat Schedules

| Schedule | Description | Example |
|----------|-------------|---------|
| `none` | One-time reminder | Submit report by March 22 |
| `daily` | Every day | Morning attendance check |
| `weekly` | Every week | Weekly staff meeting |
| `monthly` | Every month | Monthly fee payment |
| `quarterly` | Every 3 months | Quarterly reviews |
| `yearly` | Every year | Annual maintenance |

## Notification Channels

| Channel | Description | Best For |
|---------|-------------|----------|
| `in_app` | In-application notification | Routine reminders, task assignments |
| `email` | Email notification | Important deadlines, event details |
| `sms` | SMS/text message | Urgent reminders, time-sensitive alerts |
| `push` | Mobile push notification | Mobile app users, real-time updates |

## Testing Notes

1. **User Permissions:** Teachers can create reminders for their classes, admins for anyone
2. **Recurrence Logic:** Test recurring reminders generate correct next occurrences
3. **Notification Delivery:** Reminders should trigger notifications via configured channels
4. **Completion Tracking:** Reminders can be marked complete with completion percentage
5. **Snooze Functionality:** Users can snooze reminders for later
6. **Attachment Support:** Reminders can have attached files
7. **Bulk Operations:** Consider testing bulk reminder creation
8. **Expiry Handling:** Past due reminders should be marked as expired
9. **Search & Filter:** Test all filter parameters work correctly
10. **Audit Trail:** Reminder creation and completion should be logged

## Success Criteria

1. ✅ Both endpoints return expected HTTP status codes
2. ✅ Response structures match documented schemas
3. ✅ Reminder creation returns valid reminder data with ID
4. ✅ Filtering by status, priority, and type works correctly
5. ✅ RLS headers are properly validated
6. ✅ Error handling works for missing required fields
7. ✅ User validation works for assigned_to_ids
8. ✅ Metadata statistics are accurate
9. ✅ Recurrence calculations are correct for repeat schedules
10. ✅ Notification channels are properly handled