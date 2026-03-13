# Walkthrough: Phase 13 - Continuous Smart Vision AI

Phase 13 introduces a revolutionary **Hands-Free Scanning Experience**, turning the teacher's phone into a high-speed AI processing station.

## 1. Continuous Auto-Capture (Hands-Free Mode) 📸🔄
- **Zero-Touch Scanning**: Teachers no longer need to tap the screen for every page.
- **Continuous Pulse**: When "Hands-Free Mode" is active, Vidhyam automatically captures a frame every 3 seconds. The teacher simply turns the pages under a phone stand.
- **Smart Queue**: Pages are compressed and queued in the background, ensuring smooth performance even on low-end devices.

## 2. Smart ID Routing & Unassigned Vault 🗂️
- **Automatic Assignment**: The backend OCR engine detects the student's Roll Number on the fly and routes the result directly to the student's profile.
- **Safety Net**: If a Roll Number is illegible, the page is moved to the **Unassigned Vault**. Teachers can later manually assign these copies with a single tap, ensuring no data is lost.

## 3. AI Auto-Grader with "Reasoning Logic" 🤖✅
- **Explainable AI**: Tapping the "View Logic" icon in the grading results reveals **why** the AI gave a certain mark (e.g., "Formula Correct", "Calculation Error").
- **Transparency First**: Vidhyam no longer just gives a "black box" score; it provides pedagogical reasoning for every mark deducted or assigned.

## 4. Audit Trail & Manual Override 🔍
- **Teacher in Control**: Teachers can override AI marks using a simple slider.
- **Accountability**: Every override is logged in the `audit_logs`, creating a transparent history for parents and management to see when and why a human teacher perfected the AI's grading.

---

Vidhyam Phase 13 sets the global standard for **Hands-Free Educational Logistics**, making copy checking 10x faster and 100x more transparent.
