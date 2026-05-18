# Vidhyam Auto-Fill Chrome Extension

## Installation (5 Steps)

### Step 1: Open Extension Page
Chrome address bar mein type karein: `chrome://extensions`

### Step 2: Enable Developer Mode
Top-right corner mein **"Developer mode"** toggle ON karein.

### Step 3: Load Extension
**"Load unpacked"** button click karein.

### Step 4: Select Folder
Is folder ko select karein:
```
C:\Users\ok\modernisum\Ai-school\Apps\chrome-extension
```

### Step 5: Pin Extension
Extension icon ko toolbar mein pin karein (puzzle icon → pin Vidhyam).

---

## Usage (3 Steps)

1. **Government form page open karein** (e.g., scholarships.gov.in ka form)
2. **Extension icon click karein** → popup open hoga
3. **JWT Token paste karein** (Vidhyam login ke baad localStorage se `accessToken` copy karein)
4. **"Load Students" click karein** → students ki list aayegi
5. **Student select karein** → "Auto-Fill Form" button active hoga
6. **Click "Auto-Fill Form"** → form fields automatically fill ho jayenge

---

## New Website Add Karne Ka Method

`content.js` file mein `FIELD_MAPPINGS` object mein naya website add karein:

```javascript
'agency.gov.in': {
  name: ['#fullName', 'input[name="applicant"]'],
  dateOfBirth: ['#birthDate'],
  aadhaarNumber: ['input[name="uid"]'],
  fatherName: ['#father'],
  // ... aur fields
},
```

Website ke input fields ke `id`, `name`, ya `class` ko inspect karke selectors likhein.
Extension reload karne ke baad naya website automatically support hoga.

---

## API Requirements

Vidhyam backend ke ye endpoints ready hone chahiye:
- `GET /api/school/:schoolId/people/students/form-status`
- `GET /api/school/:schoolId/people/students/:studentId/auto-fill`
- `GET /api/auth/profiles`

Backend `localhost:8080` par run kar raha hai to `API Base URL` mein `http://localhost:8080/api` rakhein.
