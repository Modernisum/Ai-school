# Academic API Contract Index

This index is the route map for every endpoint registered in `rust/src/domain/academic/mod.rs`. Each linked file contains request contracts, expected responses, error behavior, workflow rules, and API test cases.

## Route groups

| Group | File | Routes covered | Main workflow |
|---|---|---|---|
| Exams | [01-exams.md](./01-exams.md) | `POST /exams`, `GET /exams`, exam sections, teacher tests | Create exams, split into sections, create teacher tests |
| Exam checker workflow | [02-exam-checker-workflow.md](./02-exam-checker-workflow.md) | Checker assign, pending exams, submissions, review, approve/reject, publish | `pending` -> `checker_reviewed` -> `teacher_approved` / `teacher_rejected` -> published results |
| Exam results | [03-exam-results.md](./03-exam-results.md) | Student published results | Return only published exam results for a student |
| Timetable | [04-timetable.md](./04-timetable.md) | Generate, list, get, approve, delete timetable | Generate timetable, validate conflicts, approve or delete |
| Timetable enhanced | [05-timetable-enhanced.md](./05-timetable-enhanced.md) | Issue box, filtered view, substitute suggestions | Conflict diagnostics, teacher/non-teacher views, proxy suggestions |
| Topics | [06-topics.md](./06-topics.md) | Create topic | Create academic topic records |
| Syllabus calendar | [07-syllabus-calendar.md](./07-syllabus-calendar.md) | Syllabus list, chapter update, quarter report | Track planned/actual syllabus progress |
| Period plans | [08-period-plans.md](./08-period-plans.md) | Daily todo/date plan, status update | Daily lesson plan status tracking |
| Schedule changes | [09-schedule-changes.md](./09-schedule-changes.md) | Request, pending list, approve/reject | Teacher/class schedule change workflow |
| Daily reports | [10-daily-reports.md](./10-daily-reports.md) | Submit, get, missed reports | Daily teacher activity reporting |

## Common response shape

Most success responses use:

```json
{
  "success": true,
  "data": {}
}
```

Most error responses use:

```json
{
  "success": false,
  "message": "<error message>"
}
```

## Important documentation notes

- `POST /api/school/:schoolId/academic/exams/checker/assign/:examId` currently expects `checkerEmployeeId` in the body. The older guide text used `checkerId`; update clients/tests to use `checkerEmployeeId`.
- `POST /api/school/:schoolId/academic/topics` currently does not use the `schoolId` path parameter in the handler. Treat this as a tenant-isolation gap until fixed.
- Many handlers return `500 INTERNAL_SERVER_ERROR` for service/repository failures. Product-level APIs may later change these to `400`, `403`, or `404`.
- Workflow-sensitive endpoints must block invalid state transitions even if the current handler does not enforce all of them yet.
