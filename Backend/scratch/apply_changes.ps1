# 1. Update domain/*/mod.rs files imports and modules
$replacements = @{
    "src/domain/auth/mod.rs" = @{
        "use crate::routes::{auth, storage};" = "pub mod auth;`npub mod storage;"
    }
    "src/domain/people/mod.rs" = @{
        "use crate::routes::{employees, emppay, student_forms, students};" = "pub mod employees;`npub mod emppay;`npub mod student_forms;`npub mod students;"
    }
    "src/domain/academic/mod.rs" = @{
        "use crate::routes::{daily_report, exam, exam_checker, exam_results, period_plan, schedule_change, syllabus_calendar, timetable, timetable_enhanced, topic};" = "pub mod daily_report;`npub mod exam;`npub mod exam_checker;`npub mod exam_results;`npub mod period_plan;`npub mod schedule_change;`npub mod syllabus_calendar;`npub mod timetable;`npub mod timetable_enhanced;`npub mod topic;"
    }
    "src/domain/finance/mod.rs" = @{
        "use crate::routes::{fees, payment};" = "pub mod fees;`npub mod payment;"
    }
    "src/domain/attendance/mod.rs" = @{
        "use crate::routes::attendance;`r`nuse crate::routes::attendance_automation;" = "pub mod attendance;`npub mod attendance_automation;"
        "use crate::routes::attendance;`nuse crate::routes::attendance_automation;" = "pub mod attendance;`npub mod attendance_automation;"
    }
    "src/domain/leave/mod.rs" = @{
        "use crate::routes::leave;" = "pub mod leave;"
    }
    "src/domain/resources/mod.rs" = @{
        "use crate::routes::{award, document_upload, documentbox, events, materials, spaces, storage};" = "pub mod award;`npub mod document_upload;`npub mod documentbox;`npub mod events;`npub mod materials;`npub mod spaces;"
    }
    "src/domain/communication/mod.rs" = @{
        "use crate::routes::{announcement, chat};" = "pub mod announcement;`npub mod chat;"
    }
    "src/domain/operations/mod.rs" = @{
        "use crate::routes::{complains, reminder, responsibility, responsibility_ws, task};" = "pub mod complains;`npub mod reminder;`npub mod responsibility;`npub mod responsibility_ws;`npub mod task;"
        "crate::routes::ai::ai_generate_tasks" = "crate::domain::ai::ai::ai_generate_tasks"
        "crate::routes::ai::ai_reorganize_tasks" = "crate::domain::ai::ai::ai_reorganize_tasks"
    }
    "src/domain/ai/mod.rs" = @{
        "use crate::routes::{ai, content_generation};" = "pub mod ai;`npub mod ai_monitoring;`npub mod content_generation;"
    }
    "src/domain/ocr/mod.rs" = @{
        "use crate::routes::ocr;" = "pub mod ocr;"
    }
    "src/domain/system/mod.rs" = @{
        "use crate::routes::{" = "pub mod api_keys;`npub mod dashboard;`npub mod developer_access;`npub mod geo;`npub mod health;`npub mod notification;`npub mod public_api;`npub mod recovery;`npub mod school;`npub mod setup;`npub mod transport;`npub mod webhook;`npub mod ws;`n// use crate::routes::{"
    }
    "src/domain/cms/mod.rs" = @{
        "use crate::routes::cms;" = "pub mod cms;"
    }

    # Sibling file imports
    "src/domain/resources/spaces.rs" = @{
        "use crate::routes::responsibility_ws::{publish_responsibility_event, ResponsibilityEvent};" = "use crate::domain::operations::responsibility_ws::{publish_responsibility_event, ResponsibilityEvent};"
    }
    "src/domain/resources/materials.rs" = @{
        "use crate::routes::responsibility_ws::{publish_responsibility_event, ResponsibilityEvent};" = "use crate::domain::operations::responsibility_ws::{publish_responsibility_event, ResponsibilityEvent};"
    }
    "src/domain/system/public_api.rs" = @{
        "use crate::routes::api_keys::ApiKeyContext;" = "use crate::domain::system::api_keys::ApiKeyContext;"
    }
    "src/domain/operations/responsibility.rs" = @{
        "use crate::routes::responsibility_ws::publish_responsibility_event;" = "use crate::domain::operations::responsibility_ws::publish_responsibility_event;"
        "use crate::routes::responsibility_ws::ResponsibilityEvent;" = "use crate::domain::operations::responsibility_ws::ResponsibilityEvent;"
    }
}

foreach ($file in $replacements.Keys) {
    if (Test-Path $file) {
        $content = Get-Content -Raw -Path $file
        $edits = $replacements[$file]
        foreach ($target in $edits.Keys) {
            $replacement = $edits[$target]
            $content = $content.Replace($target, $replacement)
        }
        Set-Content -Path $file -Value $content -NoNewline
        Write-Host "Updated $file"
    } else {
        Write-Warning "File not found: $file"
    }
}

# 2. Update main.rs
$main_file = "src/main.rs"
if (Test-Path $main_file) {
    $content = Get-Content -Raw -Path $main_file
    $content = $content.Replace("crate::routes::health::record_time", "crate::domain::system::health::record_time")
    $content = $content.Replace("crate::routes::health::record_start_time()", "crate::domain::system::health::record_start_time()")
    $content = $content.Replace("routes::router::create_router", "routes::create_router")
    Set-Content -Path $main_file -Value $content -NoNewline
    Write-Host "Updated main.rs"
}

# 3. Delete old routes folder
if (Test-Path "src/routes") {
    Remove-Item -Path "src/routes" -Recurse -Force
    Write-Host "Deleted src/routes folder"
}
