// content.js — Injected into government form pages to auto-fill fields

// ============================================================
// FIELD MAPPING — Add new websites here
// ============================================================
const FIELD_MAPPINGS = {
  // National Scholarship Portal
  'scholarships.gov.in': {
    name: ['#studentName', 'input[name="applicantName"]', '#fullName'],
    dateOfBirth: ['#dob', 'input[name="birthDate"]', '#dateOfBirth'],
    aadhaarNumber: ['#aadhaar', 'input[name="uidNumber"]', '#aadhaarNo'],
    fatherName: ['#fatherName', 'input[name="fatherName"]', '#parentName'],
    motherName: ['#motherName', 'input[name="motherName"]'],
    gender: ['#gender', 'select[name="gender"]', 'input[name="gender"]'],
    address: ['#address', 'textarea[name="permanentAddress"]'],
    className: ['#class', 'select[name="class"]', 'input[name="studentClass"]'],
  },

  // UP Scholarship
  'scholarship.up.gov.in': {
    name: ['#ApplicantName', 'input[name="name"]'],
    dateOfBirth: ['#DOB', 'input[name="dob"]'],
    aadhaarNumber: ['#AadhaarNo', 'input[name="aadhaar"]'],
    fatherName: ['#FatherName', 'input[name="father"]'],
    motherName: ['#MotherName', 'input[name="mother"]'],
    className: ['#Class', 'select[name="class"]'],
  },

  // Default: generic Indian government form patterns
  'default': {
    name: ['input[name*="name" i]', '#name', '#fullName', '.name-input'],
    dateOfBirth: ['input[name*="dob" i]', '#dob', '#dateOfBirth', '.dob-input'],
    aadhaarNumber: ['input[name*="aadhaar" i]', '#aadhaar', '#uid', '.aadhaar-input'],
    fatherName: ['input[name*="father" i]', '#fatherName', '#father', '.parent-name'],
    motherName: ['input[name*="mother" i]', '#motherName', '#mother'],
    gender: ['select[name*="gender" i]', '#gender', 'input[value="Male"],input[value="Female"]'],
    address: ['textarea[name*="address" i]', '#address', '#permanentAddress', '.address-field'],
    className: ['select[name*="class" i]', '#class', '#studentClass', '.class-select'],
    contact: ['input[name*="phone" i]', '#phone', '#mobile', '#contact', 'input[type="tel"]'],
    email: ['input[type="email"]', '#email', 'input[name*="email" i]'],
  }
};

// ============================================================
// Get mapping for current website
// ============================================================
function getMapping(hostname) {
  for (const [key, mapping] of Object.entries(FIELD_MAPPINGS)) {
    if (hostname.includes(key)) return mapping;
  }
  return FIELD_MAPPINGS['default'];
}

// ============================================================
// Fill a single field
// ============================================================
function fillField(selectors, value) {
  if (!value || String(value).trim() === '' || value === '—') return false;

  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (!el) continue;

      if (el.tagName === 'SELECT') {
        const option = Array.from(el.options).find(o =>
          o.text.toLowerCase().includes(String(value).toLowerCase()) ||
          o.value.toLowerCase().includes(String(value).toLowerCase())
        );
        if (option) { el.value = option.value; el.dispatchEvent(new Event('change', { bubbles: true })); return true; }
      } else if (el.type === 'radio' || el.type === 'checkbox') {
        const match = Array.from(document.querySelectorAll(`[name="${el.name}"]`)).find(r =>
          r.value.toLowerCase().includes(String(value).toLowerCase())
        );
        if (match) { match.checked = true; match.dispatchEvent(new Event('change', { bubbles: true })); return true; }
      } else {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    } catch (e) { /* skip bad selector */ }
  }
  return false;
}

// ============================================================
// Main auto-fill handler
// ============================================================
function autoFillForm(fields) {
  const mapping = getMapping(window.location.hostname);
  let filled = 0;
  const failed = [];

  for (const [fieldKey, selectors] of Object.entries(mapping)) {
    const value = fields[fieldKey];
    if (fillField(selectors, value)) {
      filled++;
    } else if (value && value !== '—') {
      failed.push(fieldKey);
    }
  }

  return {
    success: true,
    filled,
    total: Object.keys(mapping).length,
    failed,
    message: `Filled ${filled} fields${failed.length ? '. Not found: ' + failed.join(', ') : ''}`
  };
}

// ============================================================
// Listen for messages from popup/background
// ============================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'autoFill') {
    const result = autoFillForm(request.fields);
    sendResponse(result);
  }
  return true;
});

// Notify that content script is ready
console.log('[Vidhyam] Auto-Fill content script loaded on:', window.location.hostname);
