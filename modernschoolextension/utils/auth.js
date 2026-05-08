/**
 * Auth Manager for Vidhyam Extension
 * Manages login state, tokens, and session persistence via chrome.storage
 */

const AUTH_STORAGE_KEYS = ['isLoggedIn', 'schoolId', 'schoolName', 'apiKey', 'loginTime'];

const AuthManager = {
  async login(schoolId, password) {
    const api = await import('./api.js').then(m => m.apiClient || new m.ApiClient());
    await api.getConfig();

    const url = `${api.baseUrl}/api/auth/school/login`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ school_id: schoolId, password }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Login failed');
    }

    // Store auth state
    const authData = {
      isLoggedIn: true,
      schoolId: schoolId,
      schoolName: data.schoolName || schoolId,
      accessToken: data.accessToken || data.data?.accessToken || '',
      loginTime: Date.now(),
      apiKey: '', // Will be set separately if using API key
    };

    await chrome.storage.local.set(authData);
    return authData;
  },

  async logout() {
    await chrome.storage.local.remove(AUTH_STORAGE_KEYS);
    await chrome.storage.local.remove(['accessToken']);
  },

  async getAuthState() {
    return new Promise((resolve) => {
      chrome.storage.local.get([...AUTH_STORAGE_KEYS, 'accessToken'], (result) => {
        resolve({
          isLoggedIn: result.isLoggedIn || false,
          schoolId: result.schoolId || '',
          schoolName: result.schoolName || '',
          accessToken: result.accessToken || '',
          apiKey: result.apiKey || '',
          loginTime: result.loginTime || 0,
        });
      });
    });
  },

  async setApiKey(apiKey) {
    await chrome.storage.local.set({ apiKey });
  },

  async getApiKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiKey'], (result) => {
        resolve(result.apiKey || '');
      });
    });
  },

  async isSessionValid() {
    const state = await this.getAuthState();
    if (!state.isLoggedIn) return false;
    // Session valid for 1 hour (matches backend token expiry)
    const ONE_HOUR = 60 * 60 * 1000;
    return Date.now() - state.loginTime < ONE_HOUR;
  },
};
