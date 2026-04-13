# Task Management APIs - Expected Responses

This document outlines the expected responses for task management API endpoints.

## 1. GET /api/task/:schoolId - List Tasks

**Expected Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Query Parameters:**
  - `start_date` (optional): Filter tasks from this date (YYYY-MM-DD)
  - `end_date` (optional): Filter tasks to this date (YYYY-MM-DD)
  - `status` (optional): Filter by status ("pending", "in_progress", "completed", "cancelled")
  - `assigned_to` (optional): Filter by employee ID
  - `priority` (optional): Filter by priority ("low", "medium", "high", "critical")
- **Response Body Structure:**
```json
{
  "success": true,
  "data": [
    {
      "task_id": "task123",
      "title": "Prepare monthly report",
      "description": "Generate and submit monthly financial report",
      "status": "pending",
      "priority": "high",
      "assigned_to": "EMP001",
      "assigned_to_name": "John Doe",
      "due_date": "2024-12-31",
      "created_at": "2024-01-01T10:00:00Z",
      "created_by": "admin001",
      "completed_at": null,
      "tags": ["report", "finance", "monthly"],
      "estimated_hours": 4,
      "actual_hours": null
    },
    {
      "task_id": "task124",
      "title": "Classroom inspection",
      "description": "Inspect all classrooms for safety compliance",
      "status": "in_progress",
      "priority": "medium",
      "assigned_to": "EMP002",
      "assigned_to_name": "Jane Smith",
      "due_date": "2024-01-15",
      "created_at": "2024-01-01T09:00:00Z",
      "created_by": "admin001",
      "completed_at": null,
      "tags": ["inspection", "safety", "maintenance"],
      "estimated_hours": 2,
      "actual_hours": 1.5
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "per_page": 10,
    "total_pages": 3
  },
  "summary": {
    "pending": 10,
    "in_progress": 8,
    "completed": 5,
    "cancelled": 2,
    "overdue": 3
  }
}
```

**Validation Criteria:**
- Should return tasks filtered by query parameters
- Should include pagination metadata
- Should include summary counts by status
- Should respect RLS (only tasks for the school)

## 2. PUT /api/task/:schoolId/:taskId/status - Update Task Status

**Expected Response:**
- **Status Code:** 200 OK on success, 400 Bad Request for invalid status
- **Content-Type:** application/json
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Request Body:**
```json
{
  "status": "completed",
  "notes": "Task completed successfully",
  "actual_hours": 3.5
}
```
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "message": "Task status updated successfully",
  "task": {
    "task_id": "task123",
    "previous_status": "in_progress",
    "new_status": "completed",
    "updated_at": "2024-01-02T14:30:00Z",
    "completed_by": "admin001"
  }
}
```

**Validation Criteria:**
- Should validate status transition (e.g., cannot move from "completed" to "pending")
- Should update `completed_at` timestamp when status becomes "completed"
- Should track who made the status change
- Should allow optional notes and actual hours

## 3. POST /api/task/ai/:schoolId/generate - AI Generate Tasks

**Expected Response:**
- **Status Code:** 200 OK on success, 400 Bad Request for invalid input
- **Content-Type:** application/json
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Request Body:**
```json
{
  "employeeId": "EMP001",
  "context": "monthly responsibilities",
  "count": 5
}
```
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "message": "AI generated 5 tasks successfully",
  "generated_tasks": [
    {
      "task_id": "ai_task_001",
      "title": "Review student attendance reports",
      "description": "Analyze attendance patterns for the month and identify trends",
      "priority": "medium",
      "estimated_hours": 2,
      "due_date": "2024-01-10",
      "tags": ["attendance", "analysis", "monthly"]
    },
    {
      "task_id": "ai_task_002",
      "title": "Prepare parent-teacher meeting agenda",
      "description": "Create agenda and materials for upcoming parent-teacher meeting",
      "priority": "high",
      "estimated_hours": 3,
      "due_date": "2024-01-15",
      "tags": ["meeting", "parents", "preparation"]
    }
  ],
  "ai_metadata": {
    "model_used": "gpt-4",
    "generation_time_ms": 1250,
    "confidence_score": 0.87
  }
}
```

**Validation Criteria:**
- Should generate contextually relevant tasks based on employee role
- Should assign reasonable priorities and due dates
- Should include AI generation metadata
- Created tasks should be saved to database

## 4. POST /api/task/ai/:schoolId/reorganize - AI Reorganize Tasks

**Expected Response:**
- **Status Code:** 200 OK on success
- **Content-Type:** application/json
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Request Body:**
```json
{
  "optimization_goal": "balance_workload",
  "consider_constraints": ["due_dates", "employee_capacity"]
}
```
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "message": "Tasks reorganized successfully",
  "optimization_results": {
    "tasks_reassigned": 8,
    "workload_balance_improvement": 42,
    "deadline_violations_reduced": 3,
    "priority_alignment_improvement": 28
  },
  "changes": [
    {
      "task_id": "task123",
      "change": "reassigned",
      "from": "EMP001",
      "to": "EMP003",
      "reason": "Better skill match and current workload"
    },
    {
      "task_id": "task124",
      "change": "priority_adjusted",
      "from": "medium",
      "to": "high",
      "reason": "Approaching deadline with dependencies"
    },
    {
      "task_id": "task125",
      "change": "due_date_adjusted",
      "from": "2024-01-10",
      "to": "2024-01-12",
      "reason": "Resource constraints and dependency resolution"
    }
  ]
}
```

**Validation Criteria:**
- Should analyze current task distribution and constraints
- Should optimize based on specified goals (workload balance, deadline adherence, priority alignment)
- Should provide detailed explanation of changes
- Should apply changes to database

## Common Error Responses

**404 Not Found (Task Not Found):**
```json
{
  "success": false,
  "message": "Task not found"
}
```

**400 Bad Request (Invalid Status Transition):**
```json
{
  "success": false,
  "message": "Invalid status transition: cannot move from 'completed' to 'pending'"
}
```

**429 Too Many Requests (AI Rate Limit):**
```json
{
  "success": false,
  "message": "AI generation rate limit exceeded. Please try again in 60 seconds."
}
```

**503 Service Unavailable (AI Service Down):**
```json
{
  "success": false,
  "message": "AI service temporarily unavailable. Please try again later."
}
```

## Task Status Lifecycle

1. **pending** → **in_progress** (when work begins)
2. **in_progress** → **completed** (when task finished)
3. **in_progress** → **pending** (if paused)
4. Any status → **cancelled** (if task is no longer needed)
5. **completed** → **in_progress** (if reopening needed, with justification)