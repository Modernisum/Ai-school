# Frontend Architecture Details: Academics Module

This document outlines the detailed breakdown of the `src/features/academics` feature module within the Vidhyam frontend application. It is meant to assist developers by mapping files to their specific API endpoints, state logic, and UI combinations.

---

## 1. Directory Structure
`src/features/academics/`
*   `api/` -> Contains RTK Query endpoints for academics.
*   `pages/` -> Contains the UI views for managing attendance, exams, materials, and subjects.

**(Note: This module does not seem to define custom local `components/` right now; it relies on `components/ui` or inline HTML logic.)**

---

## 2. API Integration (`api/academicApi.js`)
This file sets up the RTK Query `academicApi` slice hooked into `API_BASE_URL` (`/api`).
*   **Authentication Check**: Implements an interceptor adding `Authorization: Bearer <token>` automatically on every Redux-managed request.
*   **Tags Managed**: `['Class', 'Subject', 'Exam', 'Materials']`
*   **Endpoints Configured Here:**
    *   **Classes**:
        *   `GET /class/:schoolId/classes` (`getClasses`)
        *   `POST /class/:schoolId/classes` (`addClass`)
        *   `DELETE /class/:schoolId/classes/:classId` (`deleteClass`)
    *   **Subjects / Activities**:
        *   `GET /subjects/:schoolId` (`getSubjects`)
        *   `POST /subjects/:schoolId` (`addSubject`)
        *   `DELETE /subjects/:schoolId/:subjectId` (`deleteSubject`)
    *   **Exams / Paper Generation**:
        *   `GET /class/:schoolId/classIds` (`getClassIds`)
        *   `GET /academic/:schoolId/:className/ids` (`getSubjectIds`)
        *   `GET /academic/topic/:schoolId/class/:className/subject/:subject/chapter/names` (`getChapterNames`)
        *   `POST /academic/:schoolId/generate-paper` (`generatePaper` - uses AI configuration)
        *   `POST /academic/:schoolId/exams` (`approveExam` - saves final paper)

---

## 3. Page Details (`pages/`)

### A. `attendance.jsx` (Announcements & Holidays)
Despite the generic name `attendance`, this specific file primarily handles creating **School Holidays** and maintaining an **Interactive Holiday Calendar**.
*   **Core Logic**: Uses `useState`, `useMemo` for tracking calendar logic. Marks Sundays automatically.
*   **API Usage (Native Fetch API instead of RTK)**:
    *   `GET /operations/attendance/:schoolId/holidays`
    *   `GET /class/:schoolId/classes`
    *   `GET /employees/:schoolId/employees`
    *   `POST /school-holidays/:schoolId`
    *   `DELETE /school-holidays/:schoolId/:id`
*   **Components/UI**: Heavy use of `framer-motion` for drawers, interactive calendar grid logic, and local toast notifications.
*   **Design Note**: Allows exempting specific employees/students from standard holidays.

### B. `subject.jsx` (Subject & Activity Management)
A UI to manage compulsory/optional subjects, fee structures, and class mappings.
*   **Core Logic**: Utilizes the Redux RTK hooks built in `academicApi.js` (`useGetSubjectsQuery`, `useAddSubjectMutation`, `useDeleteSubjectMutation`).
*   **Components/UI**: Grid layout rendering mapped subjects inside `glass-card` styling. Built-in search string matching & filter by Class Name. A complex Create Form modal that accounts for recurring intervals and fees related to custom subjects.

### C. `exam.jsx` (Exam Paper Generator)
A highly sophisticated AI-backed Exam Paper Generator.
*   **Core Logic**: Collects form data (Class, Subject, Selected Chapters, Difficulty, Question counts for short/long/mcq). It parses Redux queries (like `useGetClassIdsQuery`, `useLazyGetChapterNamesQuery`) dynamically as form fields change.
*   **API Usage**:
    *   Hits the `generatePaperMut` (targeting `/academic/:schoolId/generate-paper`).
    *   **Fallback Logic**: If the AI endpoints fail/timeout, it falls back to a locally constructed dummy template (`generateFallbackPaper`).
*   **Key Feature**: Includes an `exportToPDF()` function that uses JavaScript document mapping to generate an HTML print window and forces an automatic print dialog.

### D. `Materials.jsx` (Inventory & Material Management)
A full-scale inventory ledger to track materials (e.g. chalk, books, uniforms), their stock (extra units vs allocated units), and history.
*   **Core Logic**: Contains manual retry/backoff wrappers (`callApiWithBackoff`) over native `fetch`. It does NOT use RTK Query. It relies heavily on local state and `.env` setups directly. Local Storage fallback loop explicitly checks multiple variants for `schoolId`.
*   **API Usage (Native Fetch API)**:
    *   `GET /materials/:schoolId`
    *   `POST /materials/:schoolId`
    *   `PUT /materials/:schoolId/:materialId`
    *   `DELETE /materials/:schoolId/:materialId`
    *   `GET /materials/:schoolId/:materialId/history`
    *   `POST /materials/:schoolId/:materialId/buy`
    *   `POST /materials/:schoolId/:materialId/sell`
    *   `POST /materials/:schoolId/bulk` (Excel upload feature)
*   **Components/UI**: Very dense. Includes `MaterialCard`, `HistoryModal`, global dashboard statistics matching, and integrates the `BulkImportModal` UI component.

---

## Developer Takeaways
1.  **Inconsistent API Fetching**: The Academics module contains a mix of Redux RTK Query (`subject`, `exam`) and native `fetch` with extreme local state handling (`attendance`, `Materials`). Consider standardizing this by moving `Materials` and `Holidays` into RTK Query down the line for better caching.
2.  **Naming Convention**: `attendance.jsx` is slightly misnamed as it focuses almost entirely on the Holiday Calendar. The actual daily attendance marking may exist elsewhere in the operations folder or needs to be extracted.
