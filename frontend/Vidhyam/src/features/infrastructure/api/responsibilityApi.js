import { baseApi } from '../../../app/api/baseApi';

export const responsibilityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // List & Create
    getResponsibilities: builder.query({
      query: (schoolId) => `/responsibility/${schoolId}`,
      providesTags: ['Responsibility'],
    }),
    createResponsibility: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/responsibility/${schoolId}`, method: 'POST', body }),
      invalidatesTags: ['Responsibility'],
    }),
    // CRUD
    getResponsibility: builder.query({
      query: ({ schoolId, responsibilityId }) => `/responsibility/${schoolId}/${responsibilityId}`,
      providesTags: (r, e, a) => [{ type: 'Responsibility', id: a.responsibilityId }],
    }),
    updateResponsibility: builder.mutation({
      query: ({ schoolId, responsibilityId, ...body }) => ({ url: `/responsibility/${schoolId}/${responsibilityId}`, method: 'PATCH', body }),
      invalidatesTags: ['Responsibility'],
    }),
    deleteResponsibility: builder.mutation({
      query: ({ schoolId, responsibilityId }) => ({ url: `/responsibility/${schoolId}/${responsibilityId}`, method: 'DELETE' }),
      invalidatesTags: ['Responsibility'],
    }),
    // Analytics
    responsibilityAnalytics: builder.query({
      query: ({ schoolId, responsibilityId }) => `/responsibility/${schoolId}/${responsibilityId}/analytics`,
    }),
    overviewAnalytics: builder.query({
      query: (schoolId) => `/responsibility/${schoolId}/overview/analytics`,
    }),
    // Export/Import
    exportCsv: builder.query({
      query: (schoolId) => `/responsibility/${schoolId}/export/csv`,
    }),
    importCsv: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/responsibility/${schoolId}/import/csv`, method: 'POST', body }),
      invalidatesTags: ['Responsibility'],
    }),
    // Student responsibilities
    getStudentResponsibilities: builder.query({
      query: ({ schoolId, studentId }) => `/responsibility/${schoolId}/students/${studentId}/responsibilities`,
      providesTags: ['Responsibility'],
    }),
    // Employee responsibilities
    getEmployeeResponsibilities: builder.query({
      query: ({ schoolId, employeeId }) => `/responsibility/${schoolId}/employees/${employeeId}/responsibilities`,
      providesTags: ['Responsibility'],
    }),
    // Space responsibilities
    getSpaceResponsibilities: builder.query({
      query: ({ schoolId, spaceId }) => `/responsibility/${schoolId}/spaces/${spaceId}/responsibilities`,
      providesTags: ['Responsibility'],
    }),
    // Search
    searchResponsibilities: builder.query({
      query: ({ schoolId, ...params }) => ({ url: `/responsibility/${schoolId}/responsibilities/search`, params }),
    }),
    // Bulk operations
    bulkAssign: builder.mutation({
      query: ({ schoolId, responsibilityId, ...body }) => ({ url: `/responsibility/${schoolId}/responsibilities/${responsibilityId}/bulk-assign`, method: 'POST', body }),
      invalidatesTags: ['Responsibility'],
    }),
    bulkRemove: builder.mutation({
      query: ({ schoolId, responsibilityId, ...body }) => ({ url: `/responsibility/${schoolId}/responsibilities/${responsibilityId}/bulk-remove`, method: 'DELETE', body }),
      invalidatesTags: ['Responsibility'],
    }),
    bulkUpdate: builder.mutation({
      query: ({ schoolId, responsibilityId, ...body }) => ({ url: `/responsibility/${schoolId}/responsibilities/${responsibilityId}/bulk-update`, method: 'PUT', body }),
      invalidatesTags: ['Responsibility'],
    }),
    // History
    getResponsibilityHistory: builder.query({
      query: ({ schoolId, responsibilityId }) => `/responsibility/${schoolId}/responsibilities/${responsibilityId}/history`,
    }),
    getResponsibilityVersions: builder.query({
      query: ({ schoolId, responsibilityId }) => `/responsibility/${schoolId}/responsibilities/${responsibilityId}/versions`,
    }),
    rollbackResponsibility: builder.mutation({
      query: ({ schoolId, responsibilityId, version }) => ({ url: `/responsibility/${schoolId}/responsibilities/${responsibilityId}/rollback/${version}`, method: 'POST' }),
      invalidatesTags: ['Responsibility'],
    }),
    // Metrics
    getUtilizationMetrics: builder.query({
      query: (schoolId) => `/responsibility/${schoolId}/metrics/utilization`,
    }),
    getWorkloadMetrics: builder.query({
      query: (schoolId) => `/responsibility/${schoolId}/metrics/workload`,
    }),
    getSpaceDistributionMetrics: builder.query({
      query: (schoolId) => `/responsibility/${schoolId}/metrics/space-distribution`,
    }),
    getRevenueMetrics: builder.query({
      query: (schoolId) => `/responsibility/${schoolId}/metrics/revenue`,
    }),
    // Reports
    getUtilizationReport: builder.query({
      query: ({ schoolId, startDate, endDate }) => `/responsibility/${schoolId}/reports/utilization/${startDate}/${endDate}`,
    }),
    getWorkloadReport: builder.query({
      query: ({ schoolId, startDate, endDate }) => `/responsibility/${schoolId}/reports/workload/${startDate}/${endDate}`,
    }),
    getSpaceDistributionReport: builder.query({
      query: ({ schoolId, startDate, endDate }) => `/responsibility/${schoolId}/reports/space-distribution/${startDate}/${endDate}`,
    }),
    getRevenueReport: builder.query({
      query: ({ schoolId, startDate, endDate }) => `/responsibility/${schoolId}/reports/revenue/${startDate}/${endDate}`,
    }),
  }),
});

export const {
  useGetResponsibilitiesQuery, useCreateResponsibilityMutation,
  useGetResponsibilityQuery, useUpdateResponsibilityMutation, useDeleteResponsibilityMutation,
  useResponsibilityAnalyticsQuery, useOverviewAnalyticsQuery,
  useExportCsvQuery, useImportCsvMutation,
  useGetStudentResponsibilitiesQuery, useGetEmployeeResponsibilitiesQuery,
  useGetSpaceResponsibilitiesQuery, useSearchResponsibilitiesQuery,
  useBulkAssignMutation, useBulkRemoveMutation, useBulkUpdateMutation,
  useGetResponsibilityHistoryQuery, useGetResponsibilityVersionsQuery,
  useRollbackResponsibilityMutation, useGetUtilizationMetricsQuery,
  useGetWorkloadMetricsQuery, useGetSpaceDistributionMetricsQuery,
  useGetRevenueMetricsQuery, useGetUtilizationReportQuery, useGetWorkloadReportQuery,
  useGetSpaceDistributionReportQuery, useGetRevenueReportQuery,
} = responsibilityApi;
