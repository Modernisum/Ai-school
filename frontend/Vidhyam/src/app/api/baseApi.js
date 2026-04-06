import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setOnline } from '../../features/settings/settingsSlice';

const baseFetchQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token || localStorage.getItem('accessToken');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseFetchQuery(args, api, extraOptions);
  
  if (result.error) {
    if (result.error.status === 'FETCH_ERROR' || result.error.status === 503 || result.error.status === 502) {
      api.dispatch(setOnline(false));
      // Log connection failure but don't crash the app
      console.warn(`[Network] Connection failed to ${args?.url || 'endpoint'}. Switching to offline mode.`);
    }
  } else {
    // If we get a successful result, we are back online
    const state = api.getState();
    if (state.settings && !state.settings.isOnline) {
      api.dispatch(setOnline(true));
      console.info("[Network] Connection re-established. Online mode active.");
    }
  }
  
  return result;
};

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'Geo', 'Students', 'Employees', 'Academics', 'Complaints', 'Spaces', 'SchoolProfile', 'Materials', 'Categories'],
  endpoints: () => ({}),
});
