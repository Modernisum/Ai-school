# Create Directories
$domains = @("people", "academic", "finance", "attendance", "leave", "resources", "communication", "operations", "ai", "ocr", "system", "cms", "auth")
foreach ($d in $domains) {
    New-Item -ItemType Directory -Force -Path "src/domain/$d"
}

# Define files mapping
$moves = @{
    "routes/students.rs" = "domain/people/students.rs"
    "routes/employees.rs" = "domain/people/employees.rs"
    "routes/emppay.rs" = "domain/people/emppay.rs"
    "routes/student_forms.rs" = "domain/people/student_forms.rs"

    "routes/exam.rs" = "domain/academic/exam.rs"
    "routes/exam_checker.rs" = "domain/academic/exam_checker.rs"
    "routes/exam_results.rs" = "domain/academic/exam_results.rs"
    "routes/timetable.rs" = "domain/academic/timetable.rs"
    "routes/timetable_enhanced.rs" = "domain/academic/timetable_enhanced.rs"
    "routes/topic.rs" = "domain/academic/topic.rs"
    "routes/syllabus_calendar.rs" = "domain/academic/syllabus_calendar.rs"
    "routes/period_plan.rs" = "domain/academic/period_plan.rs"
    "routes/schedule_change.rs" = "domain/academic/schedule_change.rs"
    "routes/daily_report.rs" = "domain/academic/daily_report.rs"

    "routes/fees.rs" = "domain/finance/fees.rs"
    "routes/payment.rs" = "domain/finance/payment.rs"

    "routes/attendance.rs" = "domain/attendance/attendance.rs"
    "routes/attendance_automation.rs" = "domain/attendance/attendance_automation.rs"

    "routes/leave.rs" = "domain/leave/leave.rs"

    "routes/award.rs" = "domain/resources/award.rs"
    "routes/document_upload.rs" = "domain/resources/document_upload.rs"
    "routes/documentbox.rs" = "domain/resources/documentbox.rs"
    "routes/events.rs" = "domain/resources/events.rs"
    "routes/materials.rs" = "domain/resources/materials.rs"
    "routes/spaces.rs" = "domain/resources/spaces.rs"
    "routes/storage.rs" = "domain/auth/storage.rs"

    "routes/announcement.rs" = "domain/communication/announcement.rs"
    "routes/chat.rs" = "domain/communication/chat.rs"

    "routes/complains.rs" = "domain/operations/complains.rs"
    "routes/reminder.rs" = "domain/operations/reminder.rs"
    "routes/responsibility.rs" = "domain/operations/responsibility.rs"
    "routes/responsibility_ws.rs" = "domain/operations/responsibility_ws.rs"
    "routes/task.rs" = "domain/operations/task.rs"

    "routes/ai.rs" = "domain/ai/ai.rs"
    "routes/ai_monitoring.rs" = "domain/ai/ai_monitoring.rs"
    "routes/content_generation.rs" = "domain/ai/content_generation.rs"

    "routes/ocr.rs" = "domain/ocr/ocr.rs"

    "routes/api_keys.rs" = "domain/system/api_keys.rs"
    "routes/dashboard.rs" = "domain/system/dashboard.rs"
    "routes/developer_access.rs" = "domain/system/developer_access.rs"
    "routes/geo.rs" = "domain/system/geo.rs"
    "routes/health.rs" = "domain/system/health.rs"
    "routes/notification.rs" = "domain/system/notification.rs"
    "routes/public_api.rs" = "domain/system/public_api.rs"
    "routes/recovery.rs" = "domain/system/recovery.rs"
    "routes/school.rs" = "domain/system/school.rs"
    "routes/setup.rs" = "domain/system/setup.rs"
    "routes/transport.rs" = "domain/system/transport.rs"
    "routes/webhook.rs" = "domain/system/webhook.rs"
    "routes/ws.rs" = "domain/system/ws.rs"

    "routes/cms.rs" = "domain/cms/cms.rs"

    "routes/auth.rs" = "domain/auth/auth.rs"
}

# Move files
foreach ($src in $moves.Keys) {
    $dest = $moves[$src]
    if (Test-Path "src/$src") {
        Move-Item -Path "src/$src" -Destination "src/$dest" -Force
    }
}

# Rename/move domain files to mod.rs
foreach ($d in $domains) {
    if (Test-Path "src/domain/$d.rs") {
        Move-Item -Path "src/domain/$d.rs" -Destination "src/domain/$d/mod.rs" -Force
    }
}
