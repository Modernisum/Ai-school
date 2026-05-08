/**
 * API Client for Vidhyam Backend
 * Handles all HTTP communication with the school management backend
 */

const DEFAULT_BASE_URL = 'http://localhost:8080';

class ApiClient {
  constructor() {
    this.baseUrl = DEFAULT_BASE_URL;
  }

  async getConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiBaseUrl'], (result) => {
        this.baseUrl = result.apiBaseUrl || DEFAULT_BASE_URL;
        resolve(this.baseUrl);
      });
    });
  }

  async setConfig(url) {
    this.baseUrl = url;
    await chrome.storage.local.set({ apiBaseUrl: url });
  }

  async getAuthHeaders() {
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

  async request(method, path, body = null, useApiKey = true) {
    await this.getConfig();
    const url = `${this.baseUrl}${path}`;
    const headers = useApiKey ? await this.getAuthHeaders() : { 'Content-Type': 'application/json' };

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API Error: ${response.status}`);
    }

    return data;
  }

  // Auth
  async login(schoolId, password) {
    return this.request('POST', '/api/auth/school/login', { school_id: schoolId, password }, false);
  }

  // Students
  async searchStudents(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.className) query.set('class_name', params.className);
    if (params.section) query.set('section', params.section);
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    const qs = query.toString();
    return this.request('GET', `/api/school/${params.schoolId}/system/public/students/search${qs ? '?' + qs : ''}`);
  }

  async getStudent(schoolId, studentId) {
    return this.request('GET', `/api/school/${schoolId}/system/public/students/${studentId}`);
  }

  // Employees
  async searchEmployees(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.employeeType) query.set('employee_type', params.employeeType);
    const qs = query.toString();
    return this.request('GET', `/api/school/${params.schoolId}/system/public/employees/search${qs ? '?' + qs : ''}`);
  }

  async getEmployee(schoolId, employeeId) {
    return this.request('GET', `/api/school/${schoolId}/system/public/employees/${employeeId}`);
  }

  // Classes
  async getClasses(schoolId) {
    return this.request('GET', `/api/school/${schoolId}/system/public/classes`);
  }
}

const apiClient = new ApiClient();
