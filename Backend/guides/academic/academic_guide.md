# 📚 Chapter 6: Academic Domain Manual

This manual describes examinations scheduling, grading checker pipelines, AI-assisted question generation, timetabling constraint engines, proxy substitute finders, aur syllabus micro-planning calendar systems ko manage aur explain karta hai.

---

## 📖 Overview aur Features (Udeshya aur Suvidhayein)

### 🎯 Feature Purpose (Kyun banaya gaya hai)
Curriculum planning, exams, grading, aur timetable manage karta hai. Iska kaam classes, exams, aur report cards ko automation ke sath design karna hai.


Academic domain curriculum delivery, assessment planning, aur scheduling operations ko manage karta hai:
- **Timetable Optimization:** AI scheduling constraints ka use karke periods ko automatically organize karta hai, room allocations check karta hai, double-bookings detect karta hai, aur proxy teachers suggest karta hai.
- **Examinations & Sections:** Exams schedule karta hai aur unhe different sections mein divide karta hai (jaise Section A: MCQs, Section B: Descriptive Answers).
- **AI Paper Generator:** Exam papers, score sheets, aur specific questions generate karne ke liye AI/NLP prompts ka use karta hai.
- **Checker Grading Pipeline:** Ensure karta hai ki marks ek strict workflow follow karein: `pending` check -> checker se `checked` -> teacher se `approved` -> students ke liye `published`.
- **Syllabus Planners:** Syllabus benchmarks ko quarterly plans, daily period plans mein break karta hai aur unka target track karta hai.
- **Schedule Swaps:** Teachers ke aapas mein class periods swap karne ki requests ko manage karta hai.

---

## 🏗️ Architecture aur Data Flow

### 🛠️ Tech Stack aur Dependencies
- **Framework:** Axum
- **Database:** Postgres (sqlx).
- **Algorithms:** Graph/Constraint logic for timetable generation.
- **Documents:** PDF generation (printpdf or similar) for report cards.

### 🌊 Deep Code aur Data Flow
1. **Request:** Teacher grades submit karta hai ya timetable check karta hai.
2. **Service Logic:** `services/academic/` class averages calculate karta hai aur timetable ke conflicts check karta hai.
3. **Database:** Database mein `grades`, `timetables`, aur `exams` update hote hain.
4. **Response:** Processed timetable ya result card return hota hai.


- **Route Module:** `src/domain/academic/mod.rs`
- **Handler Files:** `src/domain/academic/exam.rs`, `src/domain/academic/exam_checker.rs`, `src/domain/academic/exam_results.rs`, `src/domain/academic/timetable.rs`, `src/domain/academic/timetable_enhanced.rs`, `src/domain/academic/topic.rs`, `src/domain/academic/syllabus_calendar.rs`, `src/domain/academic/period_plan.rs`, `src/domain/academic/schedule_change.rs`, `src/domain/academic/daily_report.rs`
- **Services:** `src/services/academic/`
- **Repositories:** `src/repository/academic/`
- **Database Tables:** `exams`, `exam_sections`, `exam_submissions`, `timetables`, `syllabus_milestones`, `period_plans`, `schedule_changes`, `daily_activity_reports`

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Course Instructor
    participant Checker as Grading Handler (Axum)
    participant Service as Exam Checker Service
    database DB as Postgres Database

    Teacher->>Checker: POST /exams/checker/assign/EX-902 {"checkerEmployeeId": "EMP-902"}
    Checker->>Service: Assign Checker to Exam
    Service->>DB: UPDATE exams SET checker_id = EMP-902
    DB-->>Service: OK
    Service-->>Checker: Assignment Success
    Checker-->>Teacher: JSON { success: true }
```

---

## 🚦 Developer Laws (Do's aur Don'ts - Kya karein aur kya na karein)

- **DO:** Check for class/room double bookings using the `timetable_enhanced` validations before setting a generated timetable state to `active`.
- **DO:** Constrain exam score inputs to verify they do not exceed the section's maximum mark limit.
- **DON'T:** Never allow checker reviews (`/exams/checker/review/...`) for an exam if the submission is already in `approved` or `published` state.
- **DON'T:** Never bypass school multitenancy context. When looking up teacher schedules or room availability, always scope requests to the tenant's `school_id`.

---

## 🔌 API Reference aur Specs (API Ki Jankari)

### API Contract Files (Expected Response + Test Cases)

Har endpoint ka detailed request contract, expected success/error response, workflow rule, aur test case niche split docs mein maintain hota hai:

- [Academic API Contract Index](./api/00-index.md)
- [Exams](./api/01-exams.md)
- [Exam Checker Workflow](./api/02-exam-checker-workflow.md)
- [Exam Results](./api/03-exam-results.md)
- [Timetable](./api/04-timetable.md)
- [Timetable Enhanced](./api/05-timetable-enhanced.md)
- [Topics](./api/06-topics.md)
- [Syllabus Calendar](./api/07-syllabus-calendar.md)
- [Period Plans](./api/08-period-plans.md)
- [Schedule Changes](./api/09-schedule-changes.md)
- [Daily Reports](./api/10-daily-reports.md)
- [Test Case Format](./api/11-test-case-format.md)

Important current-code notes:

- Checker assign endpoint expects body field `checkerEmployeeId`, not `checkerId`.
- Checker workflow should block review/approve/reject after publish or terminal submission state.
- Timetable approve should happen only after conflict validation passes.
- Exam score inputs should not exceed section max marks.
- `POST /topics` currently does not use the `schoolId` path parameter in the handler; treat it as a tenant-isolation gap until fixed.
- Niche diye gaye sample snippets overview ke liye hain; implementation/source-of-truth ke liye split API contract files use karein.

### 1. Examinations & AI Questions

#### A. Schedule an Exam
- **Endpoint:** `POST /api/school/:schoolId/academic/exams`
- **Request Body:**
  ```json
  {
    "examName": "Midterm Examination",
    "examType": "written",
    "subjectName": "Mathematics",
    "chapters": ["Calculus", "Probability"],
    "examDate": "2026-10-15T09:00:00Z",
    "announcementDate": "2026-09-15T12:00:00Z",
    "conductTeacher": "EMP-00109"
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "examId": "EXM_00881",
      "examName": "Midterm Examination"
    }
  }
  ```

#### B. Define Exam Test Section
Slices exams into marking groups.
- **Endpoint:** `POST /api/school/:schoolId/academic/exams/:examId/sections`
- **Request Body:**
  ```json
  {
    "sectionName": "Section A - MCQ",
    "studentRange": "all",
    "totalStudents": 40,
    "roomNumber": "R-102"
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "sectionId": "SEC_9921",
      "sectionName": "Section A - MCQ"
    }
  }
  ```

#### C. Autogenerate Exam Papers via AI
- **Endpoint:** `POST /api/school/:schoolId/academic/exams/ai/generate`
- **Request Body:**
  ```json
  {
    "subject": "Physics",
    "class_name": "11-A",
    "chapters": ["Thermodynamics"],
    "difficulty": "medium",
    "question_count": 10
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "questions": [
        {
          "questionId": "Q-001",
          "text": "State the Carnot theorem and describe its efficiency constraints.",
          "maxMarks": 5
        }
      ]
    }
  }
  ```

#### D. Submit Student Exam Test Score Sheet
- **Endpoint:** `POST /api/school/:schoolId/academic/exams/submit-test`
- **Request Body:**
  ```json
  {
    "examId": "EXM_00881",
    "studentId": "STD-99882",
    "sectionMarks": [
      { "sectionId": "SEC_9921", "marksObtained": 18.5 }
    ]
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "message": "Submission recorded"
  }
  ```

---

### 2. Checker & Grading Review Workflow

#### A. Assign Grader/Checker
- **Endpoint:** `POST /api/school/:schoolId/academic/exams/checker/assign/:examId`
- **Request Body:**
  ```json
  {
    "checkerEmployeeId": "EMP-00122"
  }
  ```

#### B. Submit Checker Graded Report
- **Endpoint:** `POST /api/school/:schoolId/academic/exams/checker/review/:examId/:submissionId`
- **Request Body:**
  ```json
  {
    "marks": 42.5,
    "checkerRemarks": "Good structural clarity in section B."
  }
  ```

#### C. Approve / Reject Submissions
- **Endpoints:**
  - `POST /api/school/:schoolId/academic/exams/approve/:examId/:submissionId`
  - `POST /api/school/:schoolId/academic/exams/reject/:examId/:submissionId`
- **Success Response (Approve):**
  ```json
  {
    "success": true,
    "message": "Grading approved by course teacher"
  }
  ```

#### D. Publish Grading Results
- **Endpoint:** `POST /api/school/:schoolId/academic/exams/publish/:examId`
- **Success Response:**
  ```json
  {
    "success": true,
    "message": "Results published. Student notifications pushed."
  }
  ```

---

### 3. Timetable Constraint Engine

#### A. Generate optimized Timetable Layout
- **Endpoint:** `POST /api/school/:schoolId/academic/timetable/generate`
- **Request Body:**
  ```json
  {
    "classId": "CLS_10A",
    "className": "10-A",
    "periodsPerDay": 6,
    "workingDays": [1, 2, 3, 4, 5],
    "requirements": [
      { "subjectId": "SUB-MATH", "periodsPerWeek": 5, "teacherId": "EMP-00109" }
    ],
    "periodDurationMinutes": 45
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "configId": "CFG_9921",
      "conflictsCount": 0,
      "lessonsSchedule": [
        { "day": 1, "period": 1, "subjectId": "SUB-MATH", "teacherId": "EMP-00109", "spaceId": "R-102" }
      ]
    }
  }
  ```

#### B. Check Timetable Conflicts
- **Endpoint:** `GET /api/school/:schoolId/academic/timetable-issue-box/:configId`
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "issues": [
        { "type": "teacher_double_booking", "description": "Teacher Sunita Rao is scheduled at Class 10A and Class 9B at Day 1 Period 3" }
      ]
    }
  }
  ```

#### C. Propose Proxy Substitution Teachers
Suggests matching proxy teachers who are free during a given day, period, and subject.
- **Endpoint:** `GET /api/school/:schoolId/academic/timetable-substitute/:spaceId/:responsibilityId/:day/:period`
- **Path Parameters:**
  - `spaceId` (string, required): Room space.
  - `responsibilityId` (string, required): Active duty.
  - `day` (integer, required): Day index (`1-7`).
  - `period` (integer, required): Period index.
- **Success Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "employeeId": "EMP-00302",
        "name": "David Miller",
        "freePeriodsToday": 4,
        "isSubjectMatch": true
      }
    ]
  }
  ```

---

### 4. Syllabus Micro-planning & Period status

#### A. Plot Annual Milestones
- **Endpoint:** `POST /api/school/:schoolId/academic/syllabus/:responsibilityId/plot`
- **Request Body:**
  ```json
  {
    "quarterlyTargets": [
      { "quarter": 1, "chapters": ["Intro", "Limits"] }
    ]
  }
  ```

#### B. Slice Syllabus into Daily Period Plans
- **Endpoint:** `POST /api/school/:schoolId/academic/syllabus/:responsibilityId/micro-plan`
- **Success Response:**
  ```json
  {
    "success": true,
    "message": "Curriculum sliced into 140 daily lesson periods"
  }
  ```

#### C. Update Daily Lesson Plan Status
- **Endpoint:** `POST /api/school/:schoolId/academic/period-plans/:id/status`
- **Request Body:**
  ```json
  {
    "status": "completed",
    "teacherRemarks": "Completed limits evaluation exercises"
  }
  ```

---

### 5. Schedule Swaps & Daily Activity Logs

#### A. Request Class swap swaps
- **Endpoint:** `POST /api/school/:schoolId/academic/changes/request`
- **Request Body:**
  ```json
  {
    "sourceScheduleId": "SCHD_1128",
    "targetTeacherId": "EMP-00302",
    "targetDay": 2,
    "targetPeriod": 4,
    "reason": "Doctor appointment"
  }
  ```

#### B. Submit Daily Activity Report
- **Endpoint:** `POST /api/school/:schoolId/academic/reports/daily`
- **Request Body:**
  ```json
  {
    "date": "2026-06-08",
    "reportedEvents": ["Completed Midterm exams checking", "Conducted class teacher assembly meetings"],
    "absentTeachersCount": 2
  }
  ```

---

## 🕒 Update History aur Status (Badlavo ki History)

*Is section mein hum saare bade badlavo, design decisions, aur future plans ko track karte hain.*

- **Timetable Substitutes Suggestions:** Timetables engine now scans and Suggests proxy teacher recommendations `/timetable-substitute/...` by scoring candidates on subject familiarity and current utilization load.
- **API Contract Docs:** Added split Academic API contract docs with expected responses and test cases for every endpoint registered under `src/domain/academic/mod.rs`.
- **Micro-plan conflict shift:** Added `/period-plans/restructure` to automatically shift all subsequent planned chapters forward if a holiday is declared unexpectedly.
