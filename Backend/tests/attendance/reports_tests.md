# Attendance API — Reports & Analytics Tests

This document describes the testing scenarios, usage instructions, internal database data flows, and sample responses for all reporting, dashboard statistics, and analysis endpoints.

---

## Route Table

| # | Endpoint | Method | Handler | Description |
|---|----------|--------|---------|-------------|
| 1 | `/api/school/:schoolId/attendance/reports/student` | GET | `get_student_report` | Generates a student-wise attendance sheet with overall attendance percentage. |
| 2 | `/api/school/:schoolId/attendance/reports/class` | GET | `get_class_report` | Generates a class-wise summary report listing stats for each student. |
| 3 | `/api/school/:schoolId/attendance/reports/employee` | GET | `get_employee_report` | Placeholder endpoint for employee attendance summary sheets. |
| 4 | `/api/school/:schoolId/attendance/reports/custom` | POST | `generate_custom_report` | Placeholder endpoint for customizable report downloads. |
| 5 | `/api/school/:schoolId/attendance` | GET | `get_school_attendance` | Retrieves advanced school-wide analytics and record feeds for a period. |

---

## 1. Student Attendance Report

### Description & Use Case
Generates a detailed summary of a single student's attendance between two dates. It computes total days, present days, absent days, and overall percentage.

### Data Flow & Logic
1. Reads `student_id`, `start_date`, and `end_date` from the query string.
2. Joins the `students` table to fetch details about their name, class, and section.
3. Retrieves all logs in the `attendance` table matching the user, school, and date range.
4. Performs programmatic aggregation to calculate total days, count of `"present"`, `"absent"`, `"leave"`, and `attendance_percentage`.

### Curl Command
```bash
curl -s "http://localhost:8080/api/school/689225/attendance/reports/student?student_id=S000003&start_date=2026-05-01&end_date=2026-05-31" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Exact Response
```json
{
  "success": true,
  "data": {
    "student_id": "S000003",
    "student_info": {
      "name": "Rahul Sharma",
      "class": "10-A",
      "section": "A"
    },
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31"
    },
    "summary": {
      "total_days": 2,
      "present": 2,
      "absent": 0,
      "leave": 0,
      "attendance_percentage": 100
    },
    "attendance_records": [
      {
        "date": "2026-05-26",
        "status": "present",
        "in_time": null,
        "out_time": null,
        "total_time": null,
        "class_name": null
      },
      {
        "date": "2026-05-25",
        "status": "present",
        "in_time": null,
        "out_time": null,
        "total_time": null,
        "class_name": null
      }
    ]
  }
}
```

---

## 2. Class Attendance Report

### Description & Use Case
Used by class teachers or coordinators to view attendance compliance and metrics for all students in a class.

### Data Flow & Logic
1. Takes query params: `class_name`, `start_date`, and `end_date`.
2. Queries the `students` table to find all students belonging to the class name.
3. Queries the `attendance` table to find all records in the date range matching the students' IDs.
4. If a student does not have any records, they default to 0 days.
5. Aggregates data for each student (days present, days absent, attendance percentage) and computes class-wide overall percentage.

### Curl Command
```bash
curl -s "http://localhost:8080/api/school/689225/attendance/reports/class?class_name=10-A&start_date=2026-05-01&end_date=2026-05-31" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Exact Response
```json
{
  "success": true,
  "data": {
    "class_name": "10-A",
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31"
    },
    "student_reports": [
      {
        "student_id": "S000004",
        "student_name": "Priya Patel",
        "total_days": 2,
        "present_days": 1,
        "absent_days": 1,
        "leave_days": 0,
        "attendance_percentage": 50
      },
      {
        "student_id": "S000003",
        "student_name": "Rahul Sharma",
        "total_days": 2,
        "present_days": 2,
        "absent_days": 0,
        "leave_days": 0,
        "attendance_percentage": 100
      }
    ],
    "summary": {
      "total_students": 2,
      "total_days": 4,
      "total_present": 3,
      "total_absent": 1,
      "total_leave": 0,
      "overall_attendance_percentage": 75
    }
  }
}
```

---

## 3. Employee Attendance Report

### Description & Use Case
Generates employee monthly details. (Implementation placeholder for future integration).

### Data Flow & Logic
1. Verifies authentication and queries database matching employee records (currently placeholder).

### Curl Command
```bash
curl -s "http://localhost:8080/api/school/689225/attendance/reports/employee?employee_id=E0002&start_date=2026-05-01&end_date=2026-05-31" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Exact Response
```json
{
  "success": true,
  "message": "Employee report endpoint - implementation pending",
  "data": {
    "employee_id": "E0002",
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31"
    }
  }
}
```

---

## 4. Custom Report

### Description & Use Case
Post request trigger to generate customized PDF/XLS sheets.

### Curl Command
```bash
curl -s -X POST http://localhost:8080/api/school/689225/attendance/reports/custom \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "attendance_summary",
    "start_date": "2026-05-01",
    "end_date": "2026-05-31"
  }' | jq .
```

### Exact Response
```json
{
  "success": true,
  "message": "Custom report generation endpoint - implementation pending",
  "data": {
    "report_type": "attendance_summary",
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31"
    },
    "filters": {}
  }
}
```

---

## 5. School Attendance Dashboard Stats

### Description & Use Case
Provides school-wide daily/weekly/monthly aggregated statistics, feed of raw records, and summary calculations (attendance percentage, total counts) for admin dashboards.

### Data Flow & Logic
1. Reads `period` (day, week, month) and reference `date`.
2. Computes the start and end dates of the period.
3. Retrieves records from the `attendance` table, joining with `students` and `employees`.
4. Employee name matches `e.data->>'name'` and image matches `e.data->>'profile_image_url'`.
5. Student name matches `s.name`.
6. Resolves user names and profile images and returns school summary stats.

### Curl Command
```bash
curl -s "http://localhost:8080/api/school/689225/attendance?period=month&date=2026-05-25" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Exact Response
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2026-05-01",
      "end": "2026-05-31"
    },
    "summary": {
      "total_users": 5,
      "total_present": 4,
      "total_absent": 1,
      "total_leave": 0,
      "attendance_percentage": 80.0
    },
    "records": [
      {
        "user_id": "E0002",
        "user_type": "employee",
        "name": "Bulk Employee 1",
        "class_name": null,
        "image_url": null,
        "date": "2026-05-25",
        "status": "present",
        "in_time": null,
        "out_time": null,
        "reason": null
      },
      {
        "user_id": "S000003",
        "user_type": "student",
        "name": "Rahul Sharma",
        "class_name": null,
        "image_url": null,
        "date": "2026-05-25",
        "status": "present",
        "in_time": null,
        "out_time": null,
        "reason": null
      },
      {
        "user_id": "S000003",
        "user_type": "student",
        "name": "Rahul Sharma",
        "class_name": null,
        "image_url": null,
        "date": "2026-05-26",
        "status": "present",
        "in_time": null,
        "out_time": null,
        "reason": null
      },
      {
        "user_id": "S000004",
        "user_type": "student",
        "name": "Priya Patel",
        "class_name": null,
        "image_url": null,
        "date": "2026-05-25",
        "status": "present",
        "in_time": null,
        "out_time": null,
        "reason": null
      },
      {
        "user_id": "S000004",
        "user_type": "student",
        "name": "Priya Patel",
        "class_name": null,
        "image_url": null,
        "date": "2026-05-26",
        "status": "absent",
        "in_time": null,
        "out_time": null,
        "reason": null
      }
    ]
  }
}
```
