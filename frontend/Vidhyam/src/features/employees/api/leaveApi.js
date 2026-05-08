import { baseApi } from '../../../app/api/baseApi';

export const leaveApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // List / Create
    getLeaves: builder.query({
      query: (schoolId) => `/leave/${schoolId}`,
      providesTags: ['Leave'],
    }),
    createLeave: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/leave/${schoolId}`, method: 'POST', body }),
      invalidatesTags: ['Leave'],
    }),
    // Approval
    approveLeave: builder.mutation({
      query: ({ schoolId, leaveId, ...body }) => ({ url: `/leave/${schoolId}/${leaveId}/approve`, method: 'POST', body }),
      invalidatesTags: ['Leave'],
    }),
    rejectLeave: builder.mutation({
      query: ({ schoolId, leaveId, ...body }) => ({ url: `/leave/${schoolId}/${leaveId}/reject`, method: 'POST', body }),
      invalidatesTags: ['Leave'],
    }),
    extendLeave: builder.mutation({
      query: ({ schoolId, leaveId, ...body }) => ({ url: `/leave/${schoolId}/${leaveId}/extend`, method: 'POST', body }),
      invalidatesTags: ['Leave'],
    }),
    reduceLeave: builder.mutation({
      query: ({ schoolId, leaveId, ...body }) => ({ url: `/leave/${schoolId}/${leaveId}/reduce`, method: 'POST', body }),
      invalidatesTags: ['Leave'],
    }),
    // Balance & Queue
    getLeaveBalance: builder.query({
      query: ({ schoolId, employeeId }) => `/leave/${schoolId}/balance/${employeeId}`,
      providesTags: ['Leave'],
    }),
    getLeaveQueue: builder.query({
      query: (schoolId) => `/leave/${schoolId}/queue`,
      providesTags: ['Leave'],
    }),
    getLeaveDetails: builder.query({
      query: ({ schoolId, leaveId }) => `/leave/${schoolId}/details/${leaveId}`,
      providesTags: (r, e, a) => [{ type: 'Leave', id: a.leaveId }],
    }),
    // Conditional approval
    applyConditionalApproval: builder.mutation({
      query: ({ schoolId, leaveId, ...body }) => ({ url: `/leave/${schoolId}/${leaveId}/conditional/approve`, method: 'POST', body }),
      invalidatesTags: ['Leave'],
    }),
    respondToConditions: builder.mutation({
      query: ({ schoolId, leaveId, ...body }) => ({ url: `/leave/${schoolId}/${leaveId}/conditional/respond`, method: 'POST', body }),
      invalidatesTags: ['Leave'],
    }),
    getConditionalTemplates: builder.query({
      query: (schoolId) => `/leave/${schoolId}/conditional/templates`,
    }),
    createConditionalTemplate: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/leave/${schoolId}/conditional/templates`, method: 'POST', body }),
    }),
    // Coverage
    assignCoverage: builder.mutation({
      query: ({ schoolId, leaveId, ...body }) => ({ url: `/leave/${schoolId}/${leaveId}/coverage/assign`, method: 'POST', body }),
      invalidatesTags: ['Leave'],
    }),
    getAvailableCoverages: builder.query({
      query: ({ schoolId, leaveId }) => `/leave/${schoolId}/${leaveId}/coverage/available`,
    }),
    acceptCoverage: builder.mutation({
      query: ({ schoolId, coverageId }) => ({ url: `/leave/${schoolId}/coverage/${coverageId}/accept`, method: 'POST' }),
      invalidatesTags: ['Leave'],
    }),
    // Workload
    assessWorkload: builder.mutation({
      query: ({ schoolId, leaveId, ...body }) => ({ url: `/leave/${schoolId}/${leaveId}/workload/assess`, method: 'POST', body }),
    }),
    getWorkloadAssessment: builder.query({
      query: ({ schoolId, leaveId }) => `/leave/${schoolId}/${leaveId}/workload/assessment`,
    }),
    // Notifications
    getLeaveNotifications: builder.query({
      query: (schoolId) => `/leave/${schoolId}/notifications`,
      providesTags: ['Notifications'],
    }),
    markNotificationRead: builder.mutation({
      query: ({ schoolId, notificationId }) => ({ url: `/leave/${schoolId}/notifications/${notificationId}/read`, method: 'POST' }),
      invalidatesTags: ['Notifications'],
    }),
    // Feature flags
    getLeaveFeatureFlags: builder.query({
      query: (schoolId) => `/leave/${schoolId}/feature-flags`,
    }),
    updateLeaveFeatureFlags: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/leave/${schoolId}/feature-flags`, method: 'POST', body }),
    }),
    // Proxy suggestions (used in dashboard)
    getProxySuggestions: builder.query({
      query: ({ schoolId, date, period }) => `/dashboard/${schoolId}/leaves/proxy-suggestions?date=${date}&period=${period}`,
    }),
    // PDF
    downloadLeavePdf: builder.query({
      query: ({ schoolId, leaveId }) => `/leave/${schoolId}/${leaveId}/pdf`,
    }),
  }),
});

export const {
  useGetLeavesQuery, useCreateLeaveMutation, useApproveLeaveMutation, useRejectLeaveMutation,
  useExtendLeaveMutation, useReduceLeaveMutation, useGetLeaveBalanceQuery, useGetLeaveQueueQuery,
  useGetLeaveDetailsQuery, useApplyConditionalApprovalMutation, useRespondToConditionsMutation,
  useGetConditionalTemplatesQuery, useCreateConditionalTemplateMutation, useAssignCoverageMutation,
  useGetAvailableCoveragesQuery, useAcceptCoverageMutation, useAssessWorkloadMutation,
  useGetWorkloadAssessmentQuery, useGetLeaveNotificationsQuery, useMarkNotificationReadMutation,
  useGetLeaveFeatureFlagsQuery, useUpdateLeaveFeatureFlagsMutation, useGetProxySuggestionsQuery,
  useDownloadLeavePdfQuery,
} = leaveApi;
