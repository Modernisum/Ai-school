import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`,
  prepareHeaders: (headers, { getState }) => {
    // By default, use the token from Redux state. 
    // If not present, try localStorage as a fallback during initial mount.
    const token = getState().auth.token || localStorage.getItem('accessToken');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery,
  tagTypes: ['Auth', 'Geo', 'Students', 'Employees', 'Academics', 'Complaints', 'Spaces', 'SchoolProfile', 'Materials', 'Categories'],
  endpoints: () => ({}),
});
