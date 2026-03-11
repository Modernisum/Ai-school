# Frontend Architecture Details: Documents Module

This document outlines the detailed breakdown of the `src/features/documents` feature module within the Vidhyam frontend application. It is currently a very lightweight module handling raw file uploads.

---

## 1. Directory Structure
`src/features/documents/`
*   `pages/` -> Contains a single file `upload.jsx` which acts more like a component than a full page.

**(Note: This module does not contain local sub-components or an API folder. It utilizes native `fetch` with `FormData` for binary uploads.)**

---

## 2. Component Details (`pages/upload.jsx`)

### A. `upload.jsx` (`DocumentUpload` Component)
Despite being in the `pages/` directory, this file exports a React functional component named `DocumentUpload`. It is designed to be embedded into other pages (like Student Profiles or Employee Profiles).
*   **Core Logic**: 
    1. It renders a simple HTML `<form>` with a native string `<input type="file" />`.
    2. Uses HTML5 `accept="image/*,.pdf"` bounds to restrict uploads to images and PDF documents.
    3. Handles state for the `file` object and an uploading `loading` state to disable the button.
    4. Packs the file binary stream and an optional `personId` into a native JavaScript `FormData` interface array.
    5. Returns an `onUploadComplete(resData)` callback to pass the successful server data (likely containing the new file URL or ID) back up to the parent component that invoked it.
*   **API Usage (Native Fetch API)**:
    *   `POST /documentUpload` (This hits the base URL directly without a feature prefix).
*   **Styling**: Uses standard Tailwind CSS classes (`border rounded`, `bg-blue-600`) directly on elements.

---

## Developer Takeaways
1.  **Directory Misalignment**: `upload.jsx` is located inside the `features/documents/pages/` folder but acts purely as a reusable UI component. It should likely be moved backward into `features/documents/components/` or straight into the global `src/components/ui/` folder for clarity.
2.  **API Non-Standardization**: Unlike the rest of the application which uses prefixed routes (e.g., `/fees/`, `/students/`, `/auth/`), this file calls a root-level `/documentUpload` endpoint. Ensure this matches the backend router configuration.
