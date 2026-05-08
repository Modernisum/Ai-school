/**
 * Vidhyam Autofill - Injected Script (runs in page context)
 * Smart field detection and form autofill engine
 */

(function () {
  'use strict';

  // Field mapping: person data keys -> common form field names/ids
  const FIELD_ALIASES = {
    name: ['name', 'fullname', 'studentname', 'candidatename', 'firstname', 'applicantname', 'empname', 'employeename', 'personname'],
    fatherName: ['fathername', 'fathersname', 'parentname', 'guardianname', 'f_name', 'father'],
    motherName: ['mothername', 'mothersname', 'm_name', 'mother'],
    dob: ['dob', 'dateofbirth', 'birthdate', 'birthday', 'date_na_janm'],
    gender: ['gender', 'sex'],
    contact: ['contact', 'phone', 'mobile', 'phonenumber', 'mobilenumber', 'contactnumber', 'cellphone', 'cell'],
    alternativeContact: ['alternativecontact', 'altcontact', 'parentcontact', 'guardiancontact', 'parentphone', 'alternatephone'],
    email: ['email', 'emailaddress', 'mail', 'e-mail'],
    aadhaarNumber: ['aadhaarnumber', 'aadhaar', 'aadhar', 'aadharnumber', 'uid', 'uidnumber'],
    className: ['classname', 'class', 'standard', 'grade', 'classsection'],
    section: ['section', 'division'],
    rollNumber: ['rollnumber', 'rollno', 'roll'],
    studentId: ['studentid', 'enrollmentid', 'admissionno', 'studentnumber'],
    employeeId: ['employeeid', 'empid', 'staffid'],
    addressLine1: ['addressline1', 'address', 'fulladdress', 'address1', 'streetaddress', 'permanentaddress', 'permanent_address'],
    addressCity: ['addresscity', 'city', 'town', 'towncity'],
    addressState: ['addressstate', 'state', 'province'],
    addressDistrict: ['addressdistrict', 'district'],
    addressPincode: ['addresspincode', 'pincode', 'zip', 'zipcode', 'postalcode', 'postcode'],
    employeeType: ['employeetype', 'designation', 'jobtitle', 'role', 'position', 'department'],
    bloodGroup: ['bloodgroup', 'bloodtype', 'blood'],
    admissionDate: ['admissiondate', 'enrollmentdate', 'joiningdate', 'dateofadmission'],
  };

  // Normalize a string for comparison
  function normalize(str) {
    return String(str || '').toLowerCase().replace(/[_\-\s]/g, '').trim();
  }

  // Find form elements on the page
  function getAllFormElements() {
    return Array.from(document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea'
    ));
  }

  // Get the label text associated with a form element
  function getLabelForElement(el) {
    // Check for explicit <label for="id">
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return label.textContent;
    }
    // Check for parent <label>
    const parentLabel = el.closest('label');
    if (parentLabel) return parentLabel.textContent;
    // Check for aria-label
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    // Check for aria-labelledby
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelEl = document.getElementById(labelledBy);
      if (labelEl) return labelEl.textContent;
    }
    // Check for preceding sibling label
    const prevSibling = el.previousElementSibling;
    if (prevSibling && (prevSibling.tagName === 'LABEL' || prevSibling.tagName === 'SPAN')) {
      return prevSibling.textContent;
    }
    // Check for parent's previous sibling
    const parentPrevSibling = el.parentElement?.previousElementSibling;
    if (parentPrevSibling && (parentPrevSibling.tagName === 'LABEL' || parentPrevSibling.tagName === 'SPAN')) {
      return parentPrevSibling.textContent;
    }
    // Check placeholder
    if (el.placeholder) return el.placeholder;
    return '';
  }

  // Match a form element to a person data field
  function matchField(el) {
    const name = normalize(el.name || '');
    const id = normalize(el.id || '');
    const placeholder = normalize(el.placeholder || '');
    const label = normalize(getLabelForElement(el));
    const ariaLabel = normalize(el.getAttribute('aria-label') || '');

    const candidates = [name, id, placeholder, label, ariaLabel];

    for (const [dataKey, aliases] of Object.entries(FIELD_ALIASES)) {
      for (const alias of aliases) {
        for (const candidate of candidates) {
          if (candidate === alias || candidate.includes(alias) || alias.includes(candidate)) {
            return dataKey;
          }
        }
      }
    }

    return null;
  }

  // Set a value on a form element, triggering proper events
  function setFieldValue(el, value) {
    if (value === null || value === undefined || value === '') return false;

    const tagName = el.tagName.toLowerCase();
    const inputType = (el.type || '').toLowerCase();

    if (tagName === 'select') {
      return setSelectValue(el, value);
    }

    if (inputType === 'radio') {
      return setRadioValue(el, value);
    }

    if (inputType === 'checkbox') {
      el.checked = Boolean(value);
      triggerEvents(el);
      return true;
    }

    // Handle date inputs
    if (inputType === 'date') {
      const dateVal = formatDateForInput(value);
      if (dateVal) {
        el.value = dateVal;
        triggerEvents(el);
        return true;
      }
      return false;
    }

    // Handle email inputs
    if (inputType === 'email') {
      el.value = String(value).toLowerCase();
      triggerEvents(el);
      return true;
    }

    // Handle tel inputs
    if (inputType === 'tel' || inputType === 'number') {
      el.value = String(value);
      triggerEvents(el);
      return true;
    }

    // Default: text, textarea, etc.
    el.value = String(value);
    triggerEvents(el);
    return true;
  }

  function setSelectValue(el, value) {
    const normalizedValue = normalize(value);
    const options = Array.from(el.options);

    // Try exact value match
    for (const opt of options) {
      if (normalize(opt.value) === normalizedValue || normalize(opt.textContent) === normalizedValue) {
        el.value = opt.value;
        triggerEvents(el);
        return true;
      }
    }

    // Try partial match
    for (const opt of options) {
      if (normalize(opt.textContent).includes(normalizedValue) || normalize(opt.value).includes(normalizedValue)) {
        el.value = opt.value;
        triggerEvents(el);
        return true;
      }
    }

    // For gender, try common mappings
    const genderMap = { 'm': 'male', 'f': 'female', 'male': 'male', 'female': 'female', 'other': 'other' };
    const mapped = genderMap[normalizedValue];
    if (mapped) {
      for (const opt of options) {
        if (normalize(opt.value) === mapped || normalize(opt.textContent) === mapped) {
          el.value = opt.value;
          triggerEvents(el);
          return true;
        }
      }
    }

    return false;
  }

  function setRadioValue(el, value) {
    const normalizedValue = normalize(value);
    const form = el.form || document;
    const radioGroup = form.querySelectorAll(`input[type="radio"][name="${el.name}"]`);

    for (const radio of radioGroup) {
      if (normalize(radio.value) === normalizedValue || normalize(radio.labels?.[0]?.textContent) === normalizedValue) {
        radio.checked = true;
        triggerEvents(radio);
        return true;
      }
    }
    return false;
  }

  // Format date for HTML date input (yyyy-mm-dd)
  function formatDateForInput(value) {
    if (!value) return null;

    // Already in yyyy-mm-dd format
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    // dd-mm-yyyy format
    const dmy = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;

    // dd/mm/yyyy format
    const dmy2 = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy2) return `${dmy2[3]}-${dmy2[2].padStart(2, '0')}-${dmy2[1].padStart(2, '0')}`;

    // Try native Date parsing
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }

    return null;
  }

  // Trigger input/change events for React/Vue/Angular compatibility
  function triggerEvents(el) {
    const events = ['input', 'change', 'blur'];
    for (const eventType of events) {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      el.dispatchEvent(event);
    }
  }

  // Highlight a filled field
  function highlightField(el) {
    const originalOutline = el.style.outline;
    const originalTransition = el.style.transition;
    el.style.transition = 'outline 0.3s ease';
    el.style.outline = '2px solid #22c55e';
    el.style.outlineOffset = '1px';
    setTimeout(() => {
      el.style.outline = originalOutline;
      el.style.transition = originalTransition;
    }, 3000);
  }

  // Show floating notification
  function showNotification(filledCount, totalAttempted) {
    const existing = document.getElementById('__vidhyam_notification__');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.id = '__vidhyam_notification__';
    notif.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="10" fill="#22c55e"/>
          <path d="M6 10l3 3 5-6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Autofill Complete: <strong>${filledCount}</strong>/${totalAttempted} fields filled</span>
      </div>
    `;
    Object.assign(notif.style, {
      position: 'fixed',
      top: '16px',
      right: '16px',
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '8px',
      padding: '12px 20px',
      fontSize: '14px',
      color: '#166534',
      zIndex: '999999',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      transition: 'all 0.3s ease',
      opacity: '0',
      transform: 'translateY(-10px)',
    });
    document.body.appendChild(notif);

    requestAnimationFrame(() => {
      notif.style.opacity = '1';
      notif.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transform = 'translateY(-10px)';
      setTimeout(() => notif.remove(), 300);
    }, 4000);
  }

  // Main autofill function
  function performAutofill(personData, personType) {
    const elements = getAllFormElements();
    let filledCount = 0;
    let totalAttempted = 0;
    const filledFields = [];

    for (const el of elements) {
      const matchedKey = matchField(el);
      if (!matchedKey) continue;

      const value = personData[matchedKey];
      if (value === null || value === undefined || value === '') continue;

      totalAttempted++;
      const success = setFieldValue(el, value);
      if (success) {
        filledCount++;
        highlightField(el);
        filledFields.push(matchedKey);
      }
    }

    // Show notification
    if (totalAttempted > 0) {
      showNotification(filledCount, totalAttempted);
    } else {
      showNotification(0, 0);
    }

    // Send feedback to content script
    window.postMessage({
      __vidhyam_filled__: true,
      personType,
      filledFields,
      totalFields: totalAttempted,
    }, '*');
  }

  // Listen for autofill messages from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data || !event.data.__vidhyam_autofill__) return;

    const { personData, personType } = event.data;
    if (!personData) return;

    try {
      performAutofill(personData, personType || 'student');
    } catch (err) {
      console.error('[Vidhyam Autofill] Error:', err);
    }
  });
})();
