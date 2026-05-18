# Vidhyam Implementation Report — Exam Checker & Syllabus Calendar

---

## PART 1: EXAM CHECKER & TEACHER APPROVAL WORKFLOW

### Flow
```
Exam Created → Students Submit → AI Grades (OMR or Gemini) → Status: ai_graded
                                        ↓
                     Checker Reviews (App) → Adjusts scores → checker_reviewed
                                        ↓
                  Teacher Approves/Rejects (App or Web) → approved/rejected
                                        ↓
                         Publish Results → Auto-notify Students
```

### Backend Endpoints (`/api/school/:schoolId/academic/`)
| Method | Endpoint | File |
|---|---|---|
| POST | `/exams/checker/assign/:examId` | exam_checker.rs |
| GET | `/exams/checker/pending` | exam_checker.rs |
| GET | `/exams/checker/submissions/:examId?status=` | exam_checker.rs |
| POST | `/exams/checker/review/:examId/:submissionId` | exam_checker.rs |
| POST | `/exams/approve/:examId/:submissionId` | exam_checker.rs |
| POST | `/exams/reject/:examId/:submissionId` | exam_checker.rs |
| POST | `/exams/publish/:examId` | exam_checker.rs |
| GET | `/exams/results/:studentId` | exam_results.rs |
| POST | `/exams/submit-test` | exam.rs → prediction.rs |

### Database Tables
- `exams` — Core exam with checker assignment, strictness_level, results_published
- `exam_sections` — Per-class-subject question paper JSONB
- `student_submissions` — Status flow: submitted → ai_graded → checker_reviewed → teacher_approved/rejected
- `ai_grading_results` — Score, grade, feedback, strictness tracking
- `exam_submission_pages` — Page-level images (auto-deleted on teacher approval)

### Strictness Levels for AI Grading
- `low` — Lenient, partial marks for concept understanding
- `medium` — Balanced, proportional marks
- `hard` — Strict, deducts for minor errors

### Frontend Web (Vidhyam)
- `TeacherApprovalPage.jsx` at `/dashboard/academic/teacher-approval`
- Sidebar + TopBar "Exam Approval" link with CheckCircle icon
- 5 API endpoints in `academicApi.js`

### Employee App (Flutter)
- `checker_exam_list_screen.dart` — Pending exam list for checker
- `smart_scanner_screen.dart` — Camera scan → AI grade → checker review
- `teacher_approval_screen.dart` — Teacher approve/reject submissions + publish
- `api_service.dart` — 8 endpoint methods

### Student App (Chatra)
- `academic_vault_screen.dart` — "Published Results" section with score + grade

---

## PART 2: AI-DRIVEN SYLLABUS CALENDAR & TIMETABLE

### Flow
```
Admin plots yearly syllabus → AI distributes chapters across 4 quarters by weightage
                ↓
AI creates period-level plan (topic per 45-min block, date × period)
                ↓
Teacher opens Employee App → sees Daily Todo (period → topic)
                ↓
Teacher teaches → marks period completed/missed
                ↓
Teacher submits daily report (auto-prompt on app open if missed)
                ↓
AI monitors progress vs quarter deadline
  ├─ Slight delay → auto-restructure into future slots (same quarter)
  ├─ Quarter breach → admin alert (never auto-move to next quarter)
  └─ Emergency leave → teacher requests → admin approves block merge/substitute
```

### Backend Endpoints (`/api/school/:schoolId/academic/`)

#### Syllabus Calendar
| Method | Endpoint | File |
|---|---|---|
| GET | `/syllabus/:subjectId` | syllabus_calendar.rs |
| POST | `/syllabus/:subjectId/plot` | syllabus_calendar.rs |
| POST | `/syllabus/:classId/:subjectId/micro-plan` | syllabus_calendar.rs |
| PATCH | `/syllabus/:chapterId` | syllabus_calendar.rs |
| GET | `/syllabus/quarter/:quarter` | syllabus_calendar.rs |

#### Period Plans
| Method | Endpoint | File |
|---|---|---|
| GET | `/period-plans/today?teacherId=X&date=Y` | period_plan.rs |
| GET | `/period-plans/:date?teacherId=X` | period_plan.rs |
| POST | `/period-plans/:id/status` | period_plan.rs |
| POST | `/period-plans/restructure` | period_plan.rs |

#### Schedule Changes
| Method | Endpoint | File |
|---|---|---|
| POST | `/changes/request` | schedule_change.rs |
| GET | `/changes/pending` | schedule_change.rs |
| POST | `/changes/:id/approve` | schedule_change.rs |
| POST | `/changes/:id/reject` | schedule_change.rs |

#### Daily Reports
| Method | Endpoint | File |
|---|---|---|
| POST | `/reports/daily` | daily_report.rs |
| GET | `/reports/daily/:date?teacherId=X` | daily_report.rs |
| GET | `/reports/missed` | daily_report.rs |

#### Timetable (Enhanced)
| Method | Endpoint | File |
|---|---|---|
| POST | `/timetable/generate` | timetable.rs (original) |
| GET | `/timetable-issue-box/:configId` | timetable_enhanced.rs |
| GET | `/timetable-view/:configId?type=global\|teachers\|non-teachers` | timetable_enhanced.rs |
| GET | `/timetable-substitute/:classId/:subjectId/:day/:period` | timetable_enhanced.rs |

### AI Logic
| File | Key Functions |
|---|---|
| `syllabus_planner.rs` | `annual_syllabus_plot()` — April–March calendar, weight-balanced quarter distribution |
| | `micro_plan_period_level()` — Topic assignment per timetable slot × date |
| | `restructure_syllabus_on_delay()` — Reschedule missed topics, alert on quarter overflow |
| `timetable_engine.rs` | `generate_multi_option()` — 3-4 timetable options with scoring |
| | `validate_issue_box()` — Empty period, missing teacher alerts |
| | `find_best_substitute()` — Ranks teachers by task completion % + subject match |

### Database Tables
- `syllabus_calendar` — Per-class-subject-chapter planned/actual dates, quarter, status
- `period_plans` — Per-period block (config_id, date, period_number, topic, teacher_id, status)
- `schedule_change_requests` — Block merge/skip/substitute with admin approval + block_cap_minutes
- `daily_teacher_reports` — Daily submission with summary + completed periods
- `chapters` (extended) — Added quarter, periods_allocated
- `timetable_configs` (extended) — Added view_type, is_active
- `tasks` (extended) — Added period_plan_id reference

---

## PART 3: ALL FILES

### Backend Rust — New Files
| File | Lines | Key Functions |
|---|---|---|
| `src/routes/exam_checker.rs` | 149 | assign, list, review, approve, reject, publish |
| `src/routes/exam_results.rs` | 56 | get_student_results |
| `src/routes/syllabus_calendar.rs` | 152 | plot, micro-plan, get, update, quarter-report |
| `src/routes/period_plan.rs` | 119 | daily-todo, date-plan, status, restructure |
| `src/routes/schedule_change.rs` | 111 | request, list-pending, approve, reject |
| `src/routes/daily_report.rs` | 103 | submit, get, missed |
| `src/routes/timetable_enhanced.rs` | 111 | generate_options, issue_box, view_filtered, suggest_substitute |
| `src/logic/ai/syllabus_planner.rs` | 343 | plot, micro-plan, restructure |

### Backend Rust — Modified Files
| File | What Changed |
|---|---|
| `src/db/schema_setup.rs` | +400 lines: grading tables, checker workflow, syllabus calendar tables, block_cap_minutes |
| `src/domain/academic.rs` | +50 lines: 25 new routes wired |
| `src/domain/mod.rs` | Added `pub mod ocr` |
| `src/routes/mod.rs` | 10 new module declarations |
| `src/logic/ai/mod.rs` | Added SyllabusPlanner + orchestrator methods |
| `src/logic/ai/prediction.rs` | +451 lines: AI grading, question regeneration |
| `src/logic/timetable_engine.rs` | +150 lines: multi-option, issue-box, best-substitute ranking |
| `src/services/academic_service.rs` | +330 lines: 18 new service methods |
| `src/services/mod.rs` | Registered OCR service |

### Migration SQL Files
- `migrations/202605170000_ocr_extractions.sql`
- `migrations/202605180001_exam_checker_workflow.sql`

### Web Frontend — Vidhyam (React)
| File | Lines | Purpose |
|---|---|---|
| `academics/pages/TeacherApprovalPage.jsx` | 261 | Exam approval: list, approve, reject, publish |
| `academics/pages/SyllabusPlannerPage.jsx` | 130 | Class/subject selector, quarter tabs, Plot button |
| `academics/pages/PeriodPlansPage.jsx` | 120 | Weekly grid (Mon–Sat × 8 periods), Restructure button |
| `academics/pages/ScheduleChangeApprovalPage.jsx` | 100 | Pending requests list, approve/reject with notes |
| `academics/api/academicApi.js` | +17 endpoints | All syllabus, period-plan, change API hooks |
| `components/ui/Sidebar.jsx` | +4 links | Exam Approval, Syllabus Planner, Period Plans, Change Approvals |
| `components/ui/TopBar.jsx` | +4 links | Same as Sidebar |
| `academics/pages/AcademicModule.jsx` | +3 routes | syllabus-planner, period-plans, change-approval |

### Employee App — Flutter
| File | Lines | Purpose |
|---|---|---|
| `checker_exam_list_screen.dart` | 135 | Checker's pending exam list |
| `teacher_approval_screen.dart` | 275 | Approve/reject submissions + publish |
| `smart_scanner_screen.dart` | Modified | Real API grading + checker review |
| `syllabus_calendar_screen.dart` | 130 | Quarter tabs with chapter progress cards |
| `period_plan_screen.dart` | 130 | Daily period list with complete button, missed-report banner |
| `daily_report_screen.dart` | 90 | Summary text input + submit |
| `schedule_change_screen.dart` | 150 | Request form + my requests tab |
| `api_service.dart` | +15 methods | All exam, syllabus, period-plan, report, change endpoints |
| `teacher_dashboard.dart` | +5 cards | Exam Checker, Exam Approval, Daily Plan, Syllabus, Request Change |

### Student App — Chatra (Flutter)
| File | What Changed |
|---|---|
| `core/network/api_service.dart` | Added `getExamResults()` |
| `features/academic/bloc/academic_bloc.dart` | Added parallel results fetch |
| `features/academic/bloc/academic_state.dart` | Added `examResults` field |
| `features/academic/screens/academic_vault_screen.dart` | Added "Published Results" section |

---

## PART 4: TOTAL COUNTS

| Category | Count |
|---|---|
| **New backend Rust files** | 8 |
| **Modified backend files** | 10+ |
| **New migration SQL files** | 2 |
| **New API endpoints** | 25 |
| **New database tables** | 7 |
| **Extended database tables** | 8 |
| **New Vidhyam pages** | 4 |
| **New Flutter screens** | 6 |
| **New Flutter API methods** | 15 |

**All backend code compiles. All routes are wired and ready for use.**
