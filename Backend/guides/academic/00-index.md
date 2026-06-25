# Academic API Contract Index

Yeh index `rust/src/domain/academic/mod.rs` me registered har ek endpoint ke liye route map hai. Har ek linked file me request contracts, expected responses, error behavior, workflow rules, aur API test cases ki details di gayi hain.

## Route groups

| Group | File | Routes covered | Main workflow |
|---|---|---|---|
| Exams | [01-exams.md](./01-exams.md) | `POST /exams`, `GET /exams`, exam sections, teacher tests | Exams create karna, sections me split karna, aur teacher tests create karna |
| Exam checker workflow | [02-exam-checker-workflow.md](./02-exam-checker-workflow.md) | Checker assign, pending exams, submissions, review, approve/reject, publish | `pending` -> `checker_reviewed` -> `teacher_approved` / `teacher_rejected` -> published results |
| Exam results | [03-exam-results.md](./03-exam-results.md) | Student published results | Ek student ke liye sirf published exam results return karna |
| Timetable | [04-timetable.md](./04-timetable.md) | Generate, list, get, approve, delete timetable | Timetable generate karna, conflicts validate karna, approve ya delete karna |
| Timetable enhanced | [05-timetable-enhanced.md](./05-timetable-enhanced.md) | Issue box, filtered view, substitute suggestions | Conflict diagnostics, teacher/non-teacher views, proxy suggestions |
| Topics | [06-topics.md](./06-topics.md) | Create topic | Academic topic records create karna |
| Syllabus calendar | [07-syllabus-calendar.md](./07-syllabus-calendar.md) | Syllabus list, chapter update, quarter report | Planned/actual syllabus progress track karna |
| Period plans | [08-period-plans.md](./08-period-plans.md) | Daily todo/date plan, status update | Daily lesson plan status track karna |
| Schedule changes | [09-schedule-changes.md](./09-schedule-changes.md) | Request, pending list, approve/reject | Teacher/class schedule change workflow |
| Daily reports | [10-daily-reports.md](./10-daily-reports.md) | Submit, get, missed reports | Daily teacher activity reporting |

## Common response shape

Zyadatar success responses yeh structure use karte hain:

```json
{
  "success": true,
  "data": {}
}
```

Zyadatar error responses yeh structure use karte hain:

```json
{
  "success": false,
  "message": "<error message>"
}
```

## Important documentation notes

- `POST /api/school/:schoolId/academic/exams/checker/assign/:examId` abhi body me `checkerEmployeeId` expect karta hai. Purane guide text me `checkerId` use kiya gaya tha; clients/tests ko update karke `checkerEmployeeId` use karein.
- `POST /api/school/:schoolId/academic/topics` abhi handler me `schoolId` path parameter use nahi karta hai. Jab tak yeh fix nahi hota, isko ek tenant-isolation gap ki tarah treat karein.
- Bahut se handlers service/repository failures ke liye `500 INTERNAL_SERVER_ERROR` return karte hain. Product-level APIs baad me inhein `400`, `403`, ya `404` me change kar sakte hain.
- Workflow-sensitive endpoints ko invalid state transitions block karni chahiye, bhale hi current handler abhi un sabhi ko enforce na karta ho.
