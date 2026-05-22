import { baseApi } from '../../../app/api/baseApi';

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardOverview: builder.query({
      query: (schoolId) => `/dashboard/${schoolId}/overview`,
      providesTags: ['DashboardOverview'],
    }),
    getDashboardStats: builder.query({
      query: (schoolId) => `/dashboard/${schoolId}/stats`,
      providesTags: ['DashboardStats'],
    }),
  }),
});

export const {
  useGetDashboardOverviewQuery,
  useGetDashboardStatsQuery,
} = dashboardApi;
