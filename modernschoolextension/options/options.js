/**
 * Vidhyam Autofill - Options Page Script
 */

const baseUrlInput = document.getElementById('baseUrl');
const saveUrlBtn = document.getElementById('saveUrlBtn');
const urlSaveStatus = document.getElementById('urlSaveStatus');

const optionsApiKeyInput = document.getElementById('optionsApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeySaveStatus = document.getElementById('apiKeySaveStatus');

const DEFAULT_BASE_URL = 'http://localhost:8080';

// Load saved settings
chrome.storage.local.get(['apiBaseUrl', 'apiKey'], (result) => {
  baseUrlInput.value = result.apiBaseUrl || DEFAULT_BASE_URL;
  optionsApiKeyInput.value = result.apiKey || '';
});

// Save backend URL
saveUrlBtn.addEventListener('click', async () => {
  const url = baseUrlInput.value.trim().replace(/\/+$/, '');
  if (!url) {
    showStatus(urlSaveStatus, 'Please enter a valid URL', 'error');
    return;
  }

  try {
    // Test the URL with a health check
    const response = await fetch(`${url}/api/health`, { method: 'GET' });
    if (!response.ok) throw new Error('Health check failed');
    const data = await response.json();
    if (data.status !== 'ok' && !data.success) throw new Error('Invalid backend response');

    await chrome.storage.local.set({ apiBaseUrl: url });
    showStatus(urlSaveStatus, `✓ Connected! Backend: ${url}`, 'success');
  } catch (err) {
    await chrome.storage.local.set({ apiBaseUrl: url });
    showStatus(urlSaveStatus, `⚠ URL saved but health check failed: ${err.message}`, 'error');
  }
});

// Save API Key
saveApiKeyBtn.addEventListener('click', async () => {
  const key = optionsApiKeyInput.value.trim();
  if (!key) {
    showStatus(apiKeySaveStatus, 'Please enter an API key', 'error');
    return;
  }

  // Validate format: vk_{id}_{secret}
  if (!key.startsWith('vk_')) {
    showStatus(apiKeySaveStatus, '⚠ API key should start with "vk_"', 'error');
    return;
  }

  await chrome.storage.local.set({ apiKey: key });
  showStatus(apiKeySaveStatus, '✓ API key saved successfully', 'success');
});

function showStatus(el, message, type) {
  el.textContent = message;
  el.className = `status-msg ${type}`;
  el.style.display = 'block';
  setTimeout(() => {
    el.style.display = 'none';
  }, 5000);
}
