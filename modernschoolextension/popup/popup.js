/**
 * Vidhyam Autofill - Popup Script
 * Handles login, search, detail view, and autofill triggering
 */

// ════════════ DOM REFERENCES ════════════
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const loginScreen = $('#loginScreen');
const dashboardScreen = $('#dashboardScreen');
const loginForm = $('#loginForm');
const schoolIdInput = $('#schoolId');
const passwordInput = $('#password');
const apiKeyInput = $('#apiKey');
const togglePasswordBtn = $('#togglePassword');
const loginBtn = $('#loginBtn');
const loginError = $('#loginError');
const openSettingsBtn = $('#openSettings');

const schoolNameDisplay = $('#schoolNameDisplay');
const schoolIdDisplay = $('#schoolIdDisplay');
const logoutBtn = $('#logoutBtn');

const tabBtns = $$('.tab-btn');
const searchInput = $('#searchInput');
const clearSearchBtn = $('#clearSearch');
const classFilter = $('#classFilter');
const sectionFilter = $('#sectionFilter');
const studentFilters = $('#studentFilters');
const employeeFilters = $('#employeeFilters');
const empTypeFilter = $('#empTypeFilter');
const directIdInput = $('#directIdInput');
const lookupBtn = $('#lookupBtn');

const resultsCount = $('#resultsCount');
const resultsList = $('#resultsList');
const detailPanel = $('#detailPanel');
const backToList = $('#backToList');
const detailName = $('#detailName');
const detailContent = $('#detailContent');
const autofillBtn = $('#autofillBtn');

const loadingOverlay = $('#loadingOverlay');

// ════════════ STATE ════════════
let currentTab = 'student';
let selectedPerson = null;
let selectedPersonType = null;
let searchTimeout = null;
let authState = { isLoggedIn: false, schoolId: '', schoolName: '', apiKey: '' };

// ════════════ INIT ════════════
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthState();
  loadSavedApiKey();
});

async function checkAuthState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'AUTH_STATE_REQUEST' }, (response) => {
      if (response) {
        authState = response;
        if (authState.isLoggedIn) {
          showDashboard();
        } else {
          showLogin();
        }
      }
      resolve();
    });
  });
}

function loadSavedApiKey() {
  chrome.storage.local.get(['apiKey'], (result) => {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });
}

// ════════════ SCREEN MANAGEMENT ════════════
function showLogin() {
  loginScreen.style.display = 'block';
  dashboardScreen.style.display = 'none';
}

function showDashboard() {
  loginScreen.style.display = 'none';
  dashboardScreen.style.display = 'block';
  schoolNameDisplay.textContent = authState.schoolName || 'School';
  schoolIdDisplay.textContent = `ID: ${authState.schoolId}`;
  loadClasses();
}

function showLoading(show) {
  loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showError(msg) {
  loginError.textContent = msg;
  loginError.style.display = 'block';
  setTimeout(() => { loginError.style.display = 'none'; }, 5000);
}

// ════════════ LOGIN ════════════
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const schoolId = schoolIdInput.value.trim();
  const password = passwordInput.value;
  const apiKey = apiKeyInput.value.trim();

  if (!schoolId || !password) {
    showError('Please enter School ID and Password');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.querySelector('.btn-text').style.display = 'none';
  loginBtn.querySelector('.btn-loader').style.display = 'inline-flex';

  try {
    // Save API key if provided
    if (apiKey) {
      await chrome.storage.local.set({ apiKey });
    }

    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'LOGIN_REQUEST', schoolId, password },
        (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (result && result.success) {
            resolve(result);
          } else {
            reject(new Error(result?.message || 'Login failed'));
          }
        }
      );
    });

    authState = {
      isLoggedIn: true,
      schoolId: response.schoolId,
      schoolName: response.schoolName,
      apiKey: apiKey,
    };
    showDashboard();
  } catch (err) {
    showError(err.message || 'Login failed. Check your credentials.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.querySelector('.btn-text').style.display = 'inline';
    loginBtn.querySelector('.btn-loader').style.display = 'none';
  }
});

// Toggle password visibility
togglePasswordBtn.addEventListener('click', () => {
  const type = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = type;
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'LOGOUT_REQUEST' }, resolve);
  });
  authState = { isLoggedIn: false, schoolId: '', schoolName: '', apiKey: '' };
  showLogin();
});

// Settings
openSettingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ════════════ TAB SWITCHING ════════════
tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentTab = btn.dataset.tab;

    studentFilters.style.display = currentTab === 'student' ? 'flex' : 'none';
    employeeFilters.style.display = currentTab === 'employee' ? 'flex' : 'none';

    directIdInput.placeholder = currentTab === 'student'
      ? 'Enter Student ID directly'
      : 'Enter Employee ID directly';

    // Clear results
    resultsList.innerHTML = renderEmptyState();
    resultsCount.textContent = '0 results';
    searchInput.value = '';
    selectedPerson = null;
    detailPanel.style.display = 'none';
  });
});

// ════════════ SEARCH ════════════
searchInput.addEventListener('input', () => {
  const val = searchInput.value.trim();
  clearSearchBtn.style.display = val ? 'block' : 'none';

  clearTimeout(searchTimeout);
  if (val.length >= 2) {
    searchTimeout = setTimeout(() => performSearch(), 400);
  } else if (val.length === 0) {
    resultsList.innerHTML = renderEmptyState();
    resultsCount.textContent = '0 results';
  }
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearSearchBtn.style.display = 'none';
  resultsList.innerHTML = renderEmptyState();
  resultsCount.textContent = '0 results';
});

// Filter changes trigger search
classFilter.addEventListener('change', () => performSearch());
sectionFilter.addEventListener('change', () => performSearch());
empTypeFilter.addEventListener('change', () => performSearch());

async function performSearch() {
  const query = searchInput.value.trim();
  if (!query && !classFilter.value && !sectionFilter.value && !empTypeFilter.value) {
    resultsList.innerHTML = renderEmptyState();
    resultsCount.textContent = '0 results';
    return;
  }

  showLoading(true);
  try {
    let response;
    if (currentTab === 'student') {
      response = await apiRequest('searchStudents', {
        search: query || undefined,
        className: classFilter.value || undefined,
        section: sectionFilter.value || undefined,
        page: 1,
        limit: 50,
      });
    } else {
      response = await apiRequest('searchEmployees', {
        search: query || undefined,
        employeeType: empTypeFilter.value || undefined,
      });
    }

    const items = response.data || response.employees || [];
    const total = response.pagination?.total || items.length;
    resultsCount.textContent = `${total} result${total !== 1 ? 's' : ''}`;

    if (items.length === 0) {
      resultsList.innerHTML = renderEmptyState('No results found');
    } else {
      resultsList.innerHTML = items.map((item, index) =>
        currentTab === 'student' ? renderStudentCard(item, index) : renderEmployeeCard(item, index)
      ).join('');

      // Attach click handlers
      resultsList.querySelectorAll('.result-card').forEach((card) => {
        card.addEventListener('click', () => {
          const idx = parseInt(card.dataset.index);
          selectPerson(items[idx], currentTab);
        });
      });
    }
  } catch (err) {
    resultsList.innerHTML = renderEmptyState('Error: ' + err.message);
  } finally {
    showLoading(false);
  }
}

// ════════════ DIRECT ID LOOKUP ════════════
lookupBtn.addEventListener('click', async () => {
  const id = directIdInput.value.trim();
  if (!id) return;

  showLoading(true);
  try {
    let response;
    if (currentTab === 'student') {
      response = await apiRequest('getStudent', { studentId: id });
    } else {
      response = await apiRequest('getEmployee', { employeeId: id });
    }

    const person = response.data || response.employee;
    if (person) {
      selectPerson(person, currentTab);
    } else {
      resultsList.innerHTML = renderEmptyState('Not found');
    }
  } catch (err) {
    resultsList.innerHTML = renderEmptyState('Not found: ' + err.message);
  } finally {
    showLoading(false);
  }
});

directIdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') lookupBtn.click();
});

// ════════════ SELECT PERSON & SHOW DETAIL ════════════
function selectPerson(person, type) {
  selectedPerson = person;
  selectedPersonType = type;

  detailName.textContent = person.name || 'Unknown';
  detailPanel.style.display = 'block';

  // Build detail rows
  const fields = type === 'student' ? getStudentDetailFields(person) : getEmployeeDetailFields(person);
  detailContent.innerHTML = fields
    .filter((f) => f.value !== null && f.value !== undefined && f.value !== '')
    .map((f) => `
      <div class="detail-row">
        <span class="detail-label">${f.label}</span>
        <span class="detail-value">${f.value}</span>
      </div>
    `)
    .join('');
}

function getStudentDetailFields(s) {
  return [
    { key: 'studentId', label: 'Student ID', value: s.studentId },
    { key: 'name', label: 'Name', value: s.name },
    { key: 'className', label: 'Class', value: s.className },
    { key: 'section', label: 'Section', value: s.section },
    { key: 'rollNumber', label: 'Roll No', value: s.rollNumber },
    { key: 'gender', label: 'Gender', value: s.gender },
    { key: 'dob', label: 'Date of Birth', value: s.dob },
    { key: 'contact', label: 'Contact', value: s.contact },
    { key: 'alternativeContact', label: 'Alt. Contact', value: s.alternativeContact },
    { key: 'email', label: 'Email', value: s.email },
    { key: 'aadhaarNumber', label: 'Aadhaar', value: s.aadhaarNumber },
    { key: 'fatherName', label: 'Father Name', value: s.fatherName },
    { key: 'motherName', label: 'Mother Name', value: s.motherName },
    { key: 'addressLine1', label: 'Address', value: s.addressLine1 },
    { key: 'addressCity', label: 'City', value: s.addressCity },
    { key: 'addressState', label: 'State', value: s.addressState },
    { key: 'addressDistrict', label: 'District', value: s.addressDistrict },
    { key: 'addressPincode', label: 'Pincode', value: s.addressPincode },
    { key: 'admissionDate', label: 'Admission Date', value: s.admissionDate },
    { key: 'studentType', label: 'Student Type', value: s.studentType },
    { key: 'status', label: 'Status', value: s.status },
  ];
}

function getEmployeeDetailFields(e) {
  return [
    { key: 'employeeId', label: 'Employee ID', value: e.employeeId },
    { key: 'name', label: 'Name', value: e.name },
    { key: 'employeeType', label: 'Type', value: e.employeeType },
    { key: 'gender', label: 'Gender', value: e.gender },
    { key: 'dob', label: 'Date of Birth', value: e.dob },
    { key: 'phone', label: 'Phone', value: e.phone },
    { key: 'alternativeContact', label: 'Alt. Contact', value: e.alternativeContact },
    { key: 'email', label: 'Email', value: e.email },
    { key: 'aadhaarNumber', label: 'Aadhaar', value: e.aadhaarNumber },
    { key: 'fatherName', label: 'Father Name', value: e.fatherName },
    { key: 'motherName', label: 'Mother Name', value: e.motherName },
    { key: 'permanentAddress', label: 'Permanent Address', value: e.permanentAddress || e['permanent address'] },
    { key: 'temporaryAddress', label: 'Temp. Address', value: e.temporaryAddress },
    { key: 'education', label: 'Education', value: e.education },
    { key: 'experience', label: 'Experience', value: e.experience },
    { key: 'category', label: 'Category', value: e.category },
    { key: 'baseSalary', label: 'Base Salary', value: e.baseSalary },
    { key: 'roles', label: 'Roles', value: Array.isArray(e.roles) ? e.roles.join(', ') : e.roles },
  ];
}

// ════════════ AUTOFILL ════════════
autofillBtn.addEventListener('click', async () => {
  if (!selectedPerson) return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    // Inject the script into the page
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['injected.js'],
    });

    // Send the autofill message via content script
    await chrome.tabs.sendMessage(tab.id, {
      action: 'AUTOFILL',
      personData: selectedPerson,
      personType: selectedPersonType,
    });

    // Visual feedback
    autofillBtn.textContent = '✓ Sent!';
    autofillBtn.style.background = '#22c55e';
    setTimeout(() => {
      autofillBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        Autofill This Page
      `;
      autofillBtn.style.background = '';
    }, 2000);
  } catch (err) {
    alert('Autofill failed: ' + err.message + '\n\nMake sure you\'re on a page with form fields.');
  }
});

// Back from detail
backToList.addEventListener('click', () => {
  detailPanel.style.display = 'none';
  selectedPerson = null;
});

// ════════════ LOAD CLASSES ════════════
async function loadClasses() {
  try {
    const response = await apiRequest('getClasses', {});
    const classes = response.data || [];
    classFilter.innerHTML = '<option value="">All Classes</option>';
    classes.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.name || c.className;
      opt.textContent = c.name || c.className;
      classFilter.appendChild(opt);
    });

    // Also populate section filter with common sections
    sectionFilter.innerHTML = '<option value="">All Sections</option>';
    ['A', 'B', 'C', 'D', 'E'].forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = `Section ${s}`;
      sectionFilter.appendChild(opt);
    });

    // Populate employee types
    empTypeFilter.innerHTML = '<option value="">All Types</option>';
    ['Teaching', 'Non-Teaching', 'Admin', 'Support', 'Contract'].forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      empTypeFilter.appendChild(opt);
    });
  } catch (err) {
    console.warn('Failed to load classes:', err);
  }
}

// ════════════ API HELPER ════════════
function apiRequest(endpoint, params) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'API_REQUEST',
        endpoint,
        schoolId: authState.schoolId,
        params,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.message || 'API request failed'));
        }
      }
    );
  });
}

// ════════════ RENDER HELPERS ════════════
function renderStudentCard(s, index) {
  const initials = getInitials(s.name);
  const meta = [s.className, s.section, s.rollNumber].filter(Boolean).join(' • ');
  return `
    <div class="result-card" data-index="${index}">
      <div class="result-avatar">${initials}</div>
      <div class="result-info">
        <div class="result-name">${escapeHtml(s.name || 'Unknown')}</div>
        <div class="result-meta">${escapeHtml(meta)}</div>
        <div class="result-id">${escapeHtml(s.studentId || '')}</div>
      </div>
    </div>
  `;
}

function renderEmployeeCard(e, index) {
  const initials = getInitials(e.name);
  const meta = [e.employeeType, e.phone].filter(Boolean).join(' • ');
  return `
    <div class="result-card" data-index="${index}">
      <div class="result-avatar" style="background:#fef3c7;color:#d97706">${initials}</div>
      <div class="result-info">
        <div class="result-name">${escapeHtml(e.name || 'Unknown')}</div>
        <div class="result-meta">${escapeHtml(meta)}</div>
        <div class="result-id">${escapeHtml(e.employeeId || '')}</div>
      </div>
    </div>
  `;
}

function renderEmptyState(msg) {
  const message = msg || 'Search for a student or employee to get started';
  return `
    <div class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
