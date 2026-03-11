# Super Admin Architecture Details: School Setup Module

This document outlines the architectural flow for onboarding new school instances into the SaaS ecosystem.

---

## 1. Overview
The Setup module is a wizard-like interface designed to initialize a school with all necessary geographical, academic, and administrative context.

**Location**: `src/pages/SetupPage.jsx`

---

## 2. Architectural Pillars

### A. Intelligent Geo-Selection
The form is strictly dependent on the platform's Geo-Data hierarchy to prevent data entry errors:
*   **Dependency Chain**: `Country` → `State` → `District`. 
*   **Auto-Detection**: Selecting a country triggers a lookup for its `phone_code`, which is then pre-filled into the phone field to ensure international dial compatibility.

### B. Level Normalization
Since different schools use different naming conventions for grades, the system normalizes strings into integers during setup:
*   **Logic (`classNameToLevel`)**:
    *   `Pre-Nursery` → `-2`
    *   `Nursery` → `-1`
    *   `Kindergarten` → `0`
    *   `Class 1-12` → `1-12`
*   This ensures that backend logic (graduation, fee structures) remains consistent across all schools.

### C. Infrastructure Initialization
*   **Bulk Defaults**: The setup process automatically injects default configuration values, such as `defaultStudents: 30` per class, ensuring a school is "ready to use" immediately after creation.

---

## 3. Post-Onboarding Security
*   **Credential Display**: A high-z-index modal triggers upon success, showing the auto-generated **School ID** and the chosen **Admin Password**.
*   **Ephemeral Nature**: These details are only visible once. The "Copy Details" feature is implemented to safeguard against lost credentials during the onboarding phase.

---

## 4. Technical Implementation
*   **Reusable Form Fields**: Uses a local `Field` component to ensure consistent styling (Input Groups) across the long registration form.
*   **Dynamic Payloads**: The final submission object is a "Flattened Address" string created by concatenating various dropdown selections (Address + District + State + Country + Pincode).

---

## Developer Takeaways
1.  **API Fallbacks**: The setup page fetches data from `/api/geo/` and `/api/setup/school`. These are high-dependency endpoints.
2.  **Medium Selection**: The "Medium of Instruction" dropdown supports over 16 global languages (Hindi, Spanish, Arabic, etc.), ensuring international scalability.
3.  **PIN Validation**: Pincode is a required string; ensure backend regex matches the specific format of the target country.
