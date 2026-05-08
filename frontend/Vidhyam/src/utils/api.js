/**
 * Centralized API utilities — constants, URL builders, query params, and legacy fetch wrapper.
 *
 * For RTK Query endpoints, use the injected baseApi (app/api/baseApi).
 * This file is for: one-off calls, file uploads, non-RTK helpers.
 */

const HOST = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${HOST}:8080/api`;
export const MAX_RETRIES = 3;

// ── School ID helpers ──────────────────────────────────────────────────────

export const DEFAULT_SCHOOL_ID = 'default';

export const getSchoolIdFromStorage = () => {
  try {
    const possibleKeys = [
      'schoolId', 'school_id', 'currentSchoolId', 'selectedSchoolId', 'userSchoolId', 'SCHOOL_ID',
    ];
    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);
      if (value && value !== 'undefined' && value !== 'null' && value.trim() !== '') return value.trim();
    }
    const userData = localStorage.getItem('userData') || localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.schoolId) return parsed.schoolId;
        if (parsed.school_id) return parsed.school_id;
      } catch {}
    }
    return null;
  } catch (error) {
    console.error('Error reading School ID from localStorage:', error);
    return null;
  }
};

export const getTokenFromStorage = () => localStorage.getItem('accessToken');

// ── URL builder ────────────────────────────────────────────────────────────

export const buildUrl = (schoolId, path) => `${API_BASE_URL}/${path.replace(':schoolId', schoolId)}`;

// ── Query params builder (universal filter system) ─────────────────────────

/**
 * Build URLSearchParams from a structured filters object.
 *
 * @param {Object} opts
 * @param {Array<{field: string, op: string, value: any}>} [opts.filters]
 * @param {string} [opts.sort]          "field:asc,field2:desc"
 * @param {number} [opts.page]          default 1
 * @param {number} [opts.perPage]       default 25
 * @param {string} [opts.fields]        comma-separated sparse fields
 * @param {string} [opts.search]        full-text search
 * @param {string} [opts.from]          start date
 * @param {string} [opts.to]            end date
 * @param {Object} [opts.extra]         additional key-value pairs
 * @returns {URLSearchParams}
 */
export const buildQueryParams = ({ filters, sort, page, perPage, fields, search, from, to, extra } = {}) => {
  const params = new URLSearchParams();
  if (filters && filters.length) params.append('filters', JSON.stringify(filters));
  if (sort) params.append('sort', sort);
  if (page) params.append('page', String(page));
  if (perPage) params.append('per_page', String(perPage));
  if (fields) params.append('fields', fields);
  if (search) params.append('search', search);
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (extra) Object.entries(extra).forEach(([k, v]) => { if (v !== undefined && v !== null) params.append(k, String(v)); });
  return params;
};

// ── Legacy: callApiWithBackoff (for non-RTK calls like file uploads) ───────

export const callApiWithBackoff = async (apiUrl, options = {}) => {
  let lastError = null;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      if (i > 0) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await fetch(apiUrl, options);
      const responseClone = response.clone();

      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.message || errorData.error || `HTTP Error ${response.status}`;
        } catch {
          errorText = await responseClone.text();
        }
        throw new Error(errorText);
      }

      let result;
      try {
        result = await response.json();
      } catch (e) {
        try {
          const text = await responseClone.text();
          if (text.trim()) throw new Error(`Expected JSON but got: ${text.substring(0, 100)}...`);
          return { success: true, message: 'Operation completed successfully.' };
        } catch (textError) {
          throw new Error(`Failed to parse response: ${e.message}`);
        }
      }

      return result;
    } catch (error) {
      lastError = error;
      if (i === MAX_RETRIES - 1) throw new Error(`${lastError.message}`);
    }
  }
};
