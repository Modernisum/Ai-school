import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setOnline } from '../../features/settings/settingsSlice';

const BASE = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;

const baseFetchQuery = fetchBaseQuery({
  baseUrl: BASE,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth?.token || localStorage.getItem('accessToken');
    if (token) headers.set('authorization', `Bearer ${token}`);
    const schoolId = getState().auth?.schoolId || localStorage.getItem('schoolId');
    if (schoolId) headers.set('x-school-id', schoolId);
    return headers;
  },
});

let refreshPromise = null;

async function tryRefreshToken() {
  if (refreshPromise) return refreshPromise;
  const currentToken = localStorage.getItem('accessToken');
  if (!currentToken) return null;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const newToken = data.token || data.accessToken;
      if (newToken) {
        localStorage.setItem('accessToken', newToken);
        return newToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseFetchQuery(args, api, extraOptions);

  if (result.error) {
    // Network offline detection
    if (result.error.status === 'FETCH_ERROR' || result.error.status === 503 || result.error.status === 502) {
      api.dispatch(setOnline(false));
      console.warn(`[Network] Connection failed. Offline mode.`);
    }

    // Token refresh on 401
    if (result.error.status === 401) {
      const newToken = await tryRefreshToken();
      if (newToken) {
        result = await baseFetchQuery(args, api, extraOptions);
      } else {
        // Unrecoverable — force logout
        api.dispatch({ type: 'auth/logout' });
      }
    }
  } else {
    const state = api.getState();
    if (state.settings && !state.settings.isOnline) {
      api.dispatch(setOnline(true));
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Auth', 'Geo', 'Students', 'Employees', 'Academics', 'Complaints',
    'Spaces', 'SchoolProfile', 'Materials', 'Categories', 'Fees', 'CustomFees',
    'Attendance', 'Holidays', 'Leave', 'Exam', 'Class', 'Subject',
    'Transport', 'AI', 'Chat', 'Responsibility', 'Announcements', 'Events', 'SpaceMaterials',
    'Notifications', 'Storage', 'Documents', 'Timetable', 'Task',
    'Payment', 'Coupons', 'Awards', 'Setup', 'Webhooks', 'ApiKeys',
    'DeveloperAccess', 'Recovery', 'Audit', 'Reminders',
  ],
  endpoints: () => ({}),
});

export { BASE };
