// background.js — Service worker for Vidhyam Chrome Extension
// Handles API communication and token management

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchAutoFill') {
    const { apiBase, token, schoolId, studentId } = request;
    fetch(`${apiBase}/school/${schoolId}/people/students/${studentId}/auto-fill`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data: data?.data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }
});

// Auto-save token on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ installed: Date.now() });
  console.log('[Vidhyam] Extension installed');
});
