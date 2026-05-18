// popup.js — Vidhyam Chrome Extension
let selectedStudent = null;

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['apiBase', 'token', 'selectedStudent'], (data) => {
    if (data.apiBase) document.getElementById('apiBase').value = data.apiBase;
    if (data.token) document.getElementById('token').value = data.token;
    if (data.selectedStudent) {
      selectedStudent = data.selectedStudent;
      highlightSelected();
    }
    updatePageUrl();
  });

  document.getElementById('loadStudents').addEventListener('click', loadStudents);
  document.getElementById('autoFillBtn').addEventListener('click', triggerAutoFill);
});

function setStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = 'status ' + (type || 'info');
}

async function loadStudents() {
  const apiBase = document.getElementById('apiBase').value.trim();
  const token = document.getElementById('token').value.trim();
  if (!apiBase || !token) return setStatus('Enter API URL and token first', 'error');

  chrome.storage.local.set({ apiBase, token });
  setStatus('Loading...', 'info');

  try {
    const schoolId = await getSchoolId(apiBase, token);
    const res = await fetch(`${apiBase}/school/${schoolId}/people/students/form-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    renderStudentList(data?.data || []);
    setStatus(`${data?.data?.length || 0} students loaded`, 'success');
  } catch (e) {
    setStatus('Failed: ' + e.message, 'error');
  }
}

async function getSchoolId(apiBase, token) {
  const cached = await chrome.storage.local.get('schoolId');
  if (cached.schoolId) return cached.schoolId;
  const res = await fetch(`${apiBase}/auth/profiles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const schoolId = data?.schools?.[0]?.id || data?.data?.[0]?.schoolId || 'default';
  chrome.storage.local.set({ schoolId });
  return schoolId;
}

function renderStudentList(students) {
  const list = document.getElementById('studentList');
  if (!students.length) { list.innerHTML = '<div style="padding:12px;color:#64748b;">No students found</div>'; return; }
  list.innerHTML = students.map(s => `
    <div class="student-card ${s.formCompleted ? 'completed' : ''} ${selectedStudent?.id === s.studentId ? 'selected' : ''}" data-id="${s.studentId}">
      <div class="name">${s.name}</div>
      <div class="meta">${s.className} · ${s.hasDocuments ? s.documentCount + ' docs' : 'No docs'} · ${s.formCompleted ? '✅ Done' : '⏳ Pending'}</div>
    </div>
  `).join('');

  list.querySelectorAll('.student-card').forEach(card => {
    card.addEventListener('click', () => {
      const sid = card.dataset.id;
      const s = students.find(st => st.studentId === sid);
      selectedStudent = s;
      chrome.storage.local.set({ selectedStudent: s });
      document.getElementById('autoFillBtn').disabled = false;
      highlightSelected();
    });
  });
}

function highlightSelected() {
  document.querySelectorAll('.student-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.id === selectedStudent?.studentId);
  });
}

async function triggerAutoFill() {
  if (!selectedStudent) return setStatus('Select a student first', 'error');
  const apiBase = document.getElementById('apiBase').value.trim();
  const token = document.getElementById('token').value.trim();
  setStatus('Fetching auto-fill data...', 'info');

  try {
    const schoolId = await getSchoolId(apiBase, token);
    const res = await fetch(`${apiBase}/school/${schoolId}/people/students/${selectedStudent.studentId}/auto-fill`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const fields = data?.data || {};

    // Send to content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'autoFill', fields }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus('Page not supported. Open a government form page.', 'error');
      } else {
        setStatus(response.message || 'Fields filled', 'success');
      }
    });
  } catch (e) {
    setStatus('Failed: ' + e.message, 'error');
  }
}

async function updatePageUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  document.getElementById('pageUrl').textContent = 'Page: ' + (tab?.url || 'unknown');
}
