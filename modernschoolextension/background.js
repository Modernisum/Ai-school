/**
 * Vidhyam Autofill - Background Service Worker
 * Handles auth state, API proxying, and message routing
 */

const DEFAULT_BASE_URL = 'http://localhost:8080';

function getBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiBaseUrl'], (result) => {
      resolve(result.apiBaseUrl || DEFAULT_BASE_URL);
    });
  });
}

async function getAuthHeaders() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiKey'], (result) => {
      const headers = { 'Content-Type': 'application/json' };
      if (result.apiKey) {
        headers['X-API-Key'] = result.apiKey;
      }
      resolve(headers);
    });
  });
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'API_REQUEST') {
    handleApiRequest(msg, sender)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, message: err.message }));
    return true; // Keep channel open for async response
  }

  if (msg.type === 'LOGIN_REQUEST') {
    handleLogin(msg)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, message: err.message }));
    return true;
  }

  if (msg.type === 'LOGOUT_REQUEST') {
    handleLogout()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, message: err.message }));
    return true;
  }

  if (msg.type === 'AUTH_STATE_REQUEST') {
    getAuthState().then(sendResponse);
    return true;
  }

  if (msg.type === 'AUTOFILL_COMPLETE') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Vidhyam Autofill',
      message: `${msg.personType === 'employee' ? 'Employee' : 'Student'} details filled successfully!`,
    });
    sendResponse({ success: true });
    return false;
  }
});

async function handleLogin(msg) {
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}/api/auth/school/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ school_id: msg.schoolId, password: msg.password }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Login failed');
  }

  const accessToken = data.accessToken || data.data?.accessToken || '';
  const schoolName = data.schoolName || data.data?.schoolName || msg.schoolId;

  await chrome.storage.local.set({
    isLoggedIn: true,
    schoolId: msg.schoolId,
    schoolName: schoolName,
    accessToken: accessToken,
    loginTime: Date.now(),
  });

  return { success: true, schoolId: msg.schoolId, schoolName };
}

async function handleLogout() {
  await chrome.storage.local.remove([
    'isLoggedIn', 'schoolId', 'schoolName', 'accessToken', 'loginTime',
  ]);
}

async function getAuthState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ['isLoggedIn', 'schoolId', 'schoolName', 'accessToken', 'apiKey', 'loginTime'],
      (result) => {
        resolve({
          isLoggedIn: result.isLoggedIn || false,
          schoolId: result.schoolId || '',
          schoolName: result.schoolName || '',
          accessToken: result.accessToken || '',
          apiKey: result.apiKey || '',
          loginTime: result.loginTime || 0,
        });
      }
    );
  });
}

async function handleApiRequest(msg, sender) {
  const baseUrl = await getBaseUrl();
  const headers = await getAuthHeaders();
  const schoolId = msg.schoolId;

  let url;
  if (msg.endpoint === 'searchStudents') {
    const params = new URLSearchParams();
    if (msg.params.search) params.set('search', msg.params.search);
    if (msg.params.className) params.set('class_name', msg.params.className);
    if (msg.params.section) params.set('section', msg.params.section);
    if (msg.params.page) params.set('page', msg.params.page);
    if (msg.params.limit) params.set('limit', msg.params.limit);
    url = `${baseUrl}/api/school/${schoolId}/system/public/students/search?${params.toString()}`;
  } else if (msg.endpoint === 'getStudent') {
    url = `${baseUrl}/api/school/${schoolId}/system/public/students/${msg.params.studentId}`;
  } else if (msg.endpoint === 'searchEmployees') {
    const params = new URLSearchParams();
    if (msg.params.search) params.set('search', msg.params.search);
    if (msg.params.employeeType) params.set('employee_type', msg.params.employeeType);
    url = `${baseUrl}/api/school/${schoolId}/system/public/employees/search?${params.toString()}`;
  } else if (msg.endpoint === 'getEmployee') {
    url = `${baseUrl}/api/school/${schoolId}/system/public/employees/${msg.params.employeeId}`;
  } else if (msg.endpoint === 'getClasses') {
    url = `${baseUrl}/api/school/${schoolId}/system/public/classes`;
  } else {
    throw new Error(`Unknown endpoint: ${msg.endpoint}`);
  }

  const response = await fetch(url, { method: 'GET', headers });
  return await response.json();
}

// Set up context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create?.({
    id: 'vidhyam-autofill',
    title: 'Autofill with Vidhyam',
    contexts: ['page'],
  });
});

// Handle context menu clicks
chrome.contextMenus?.onClicked?.addListener?.((info, tab) => {
  if (info.menuItemId === 'vidhyam-autofill') {
    chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_AUTOFILL' });
  }
});
