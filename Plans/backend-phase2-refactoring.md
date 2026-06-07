# Backend Deep Refactoring — Phase 2 Plan

## Goal
1. Eliminate ALL remaining code redundancy (~300+ instances)
2. Enforce clean 3-layer architecture: Handler → Service → Repository

---

## PART A: Remaining Redundancy Elimination

### A1. Migrate 95 Inline Audit Calls → `log_audit()` helper
**Impact: ~475 lines saved** | Files: 11

| File | Inline Calls | Action |
|------|-------------|--------|
| `fee_service.rs` | 13 | Replace all with `log_audit(...)` |
| `leave_service.rs` | 12 | Replace all |
| `academic_service.rs` | 12 | Replace all |
| `auxiliary_service.rs` | 12 | Replace all |
| `resource/inventory.rs` | 9 | Replace all |
| `resource/material.rs` | 5 | Replace all |
| `resource/equipment.rs` | 5 | Replace all |
| `payroll/processing.rs` | 6 | Replace all |
| `attendance_service.rs` | 5 | Replace all |
| `responsibility/crud.rs` | 3 | Replace all |
| `responsibility/bulk_operations.rs` | 3 | Replace all |

### A2. Remove Duplicate `calculate_delta` from `payroll/processing.rs`
**Impact: ~17 lines saved** | File: 1

Replace inline function with `use crate::services::utils::delta::calculate_delta;`

### A3. Extract Shared `parse_to_rfc3339()` → `services/utils/time.rs`
**Impact: ~15 lines saved** | Files: 2

- Move from `attendance_service.rs` to `services/utils/time.rs`
- Update `attendance_repo.rs` to use shared version
- Add `pub mod time;` to `services/utils/mod.rs`

### A4. Row Mappers for Remaining Repos (35 instances)
**Impact: ~200 lines saved** | Files: 5

| Repo | Count | New Mapper Functions |
|------|-------|---------------------|
| `resource_repo.rs` | 14 | `map_space`, `map_material`, `map_announcement`, `map_event`, `map_space_material` |
| `fee_repo.rs` | 8 | `map_school_fee`, `map_student_fee`, `map_custom_fee`, `map_fee_record` |
| `attendance_repo.rs` | 5 | `map_attendance`, `map_holiday`, `map_class_attendance` |
| `leave_repo.rs` | 3 | `map_leave` |
| `payroll_repo.rs` | 2 | `map_payroll_summary`, `map_payment` |

### A5. Create `fetch_and_delete_audit` Helper
**Impact: ~60 lines saved** | Files: 8

Pattern repeated 12 times:
```rust
pub async fn fetch_and_delete_audit<T>(
    repos: &Arc<Repositories>,
    school_id: &str,
    admin_id: &str,
    entity_type: &str,
    fetch_fn: impl FnOnce() -> T,
    delete_fn: impl FnOnce() -> T,
) { ... }
```

### A6. Create `create_and_audit` Helper
**Impact: ~100 lines saved** | Files: 6

Pattern repeated 21 times:
```rust
pub async fn create_and_audit(
    repos: &Arc<Repositories>,
    school_id: &str,
    admin_id: &str,
    entity_type: &str,
    data: Value,
    result: &Value,
) { ... }
```

---

## PART B: Clean 3-Layer Architecture

### Current Violations

| Layer | Violation | Count |
|-------|-----------|-------|
| Domain → SQL | Handlers with direct `sqlx::query` | 4 functions |
| Service → SQL | Services with direct `sqlx::query` | 8 files, ~1,110 lines |
| Pass-through | Services with zero logic | 3 files |

### B1. Fix Domain Layer Violations (4 handlers)

| Handler | File | Fix |
|---------|------|-----|
| `auto_assign_teacher()` | `attendance_automation.rs` | Move SQL to new `attendance_repo::auto_assign_teacher()` |
| `generate_qr_attendance()` | `attendance.rs` | Move SQL to new `attendance_repo::create_qr_token()` |
| `mobile_mark_attendance()` | `attendance.rs` | Move SQL to new `attendance_repo::verify_qr_and_mark()` |
| `change_password_self()` | `system/school.rs` | Move SQL to `auth_service::change_password_self()` |

### B2. Fix Service Layer Violations (8 files)

| Service | Direct SQL Lines | New Repo Methods Needed |
|---------|-----------------|------------------------|
| `attendance_analytics_service.rs` | ~350 | `analytics_repo::get_daily_report()`, `get_advanced_stats()`, `get_trend()`, `get_class_breakdown()` |
| `attendance_health_monitor.rs` | ~250 | `system_log_repo::log_health_check()`, `get_health_history()`, `cleanup_old_logs()` |
| `leave_service.rs` | ~150 | `leave_repo::get_coverage()`, `assign_coverage()`, `get_workload()`, `update_workload()` |
| `responsibility/crud.rs` | ~200 | `responsibility_repo::get_paginated_with_filters()`, `get_analytics()`, `export_csv()`, `sync_student_fees()` |
| `payroll/processing.rs` | ~80 | `payroll_repo::calculate_attendance_deductions()`, `get_salary_params()` |
| `attendance_service.rs` | ~40 | `attendance_repo::list_by_date()`, `auto_mark_absent()`, `get_daily_report()` |
| `student/crud.rs` | ~25 | Already done in Phase 1 (`resequence_roll_numbers`) |
| `academic_service.rs` | ~15 | `academic_repo::get_submission_pages()`, `update_submission_page()` |

### B3. Remove Pass-Through Services

| Service | Action |
|---------|--------|
| `task_service.rs` (30 lines) | Delete. Handlers call `repos.task.*` directly via a thin `TaskService` trait impl on `Repositories` |
| `operations_service.rs` (20 lines) | Delete. Handler calls `student_service.get_student_profile()` directly |
| `student/mod.rs` (131 lines) | Collapse into `student/crud.rs`. Remove double-delegation |

### B4. New Repositories Needed

| New Repo | Tables Covered | Methods |
|----------|---------------|---------|
| `attendance_qr_repo.rs` | `attendance_qr_tokens` | `create_token()`, `verify_token()`, `cleanup_expired()` |
| `system_log_repo.rs` | `system_logs`, `system_config` | `log_event()`, `get_logs()`, `get_config()`, `set_config()` |
| `coverage_repo.rs` | `responsibility_coverage`, `workload_assessment` | `assign_coverage()`, `get_coverage()`, `update_workload()` |
| `config_repo.rs` | `system_config` | `get()`, `set()`, `get_many()` |

---

## Execution Order

| Phase | What | Files | Impact |
|-------|------|-------|--------|
| A1 | Audit migration (95 calls) | 11 services | ~475 lines |
| A2 | Delta dedup payroll | 1 | ~17 lines |
| A3 | parse_to_rfc3339 extraction | 2 | ~15 lines |
| A4 | Row mappers for repos | 6 | ~200 lines |
| A5 | fetch_and_delete_audit helper | 8 | ~60 lines |
| A6 | create_and_audit helper | 6 | ~100 lines |
| B1 | Domain violations fix | 4 handlers | Clean architecture |
| B2 | Service violations fix | 8 services | ~1,110 lines moved to repos |
| B3 | Remove pass-throughs | 3 files deleted | ~180 lines |
| B4 | New repos | 4 files | Clean architecture |

**Total: ~2,150+ lines of redundancy/anti-patterns eliminated**

---

## Verification

After each phase:
1. `cargo check` with `SQLX_OFFLINE=true`
2. `docker-compose up -d --build`
3. Health check + Login + Student CRUD + Employee CRUD + Attendance APIs
