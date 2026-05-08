import { baseApi } from '../../../app/api/baseApi';

export const schoolApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSchoolDetails: builder.query({
      query: (schoolId) => `/school/${schoolId}`,
      providesTags: ['SchoolProfile'],
    }),
    updateSchool: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/school/${schoolId}`, method: 'PUT', body }),
      invalidatesTags: ['SchoolProfile'],
    }),
    changePassword: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/school/${schoolId}`, method: 'PATCH', body }),
    }),
    // Setup
    getSetup: builder.query({
      query: (schoolId) => `/setup/${schoolId}`,
      providesTags: ['Setup'],
    }),
    // School notification polling
    getSchoolNotification: builder.query({
      query: (schoolId) => `/school/${schoolId}/notification`,
      providesTags: ['Notifications'],
    }),
    clearSchoolNotification: builder.mutation({
      query: (schoolId) => ({ url: `/school/${schoolId}/notification`, method: 'DELETE' }),
      invalidatesTags: ['Notifications'],
    }),
    getGlobalNotification: builder.query({
      query: () => '/global/notification',
    }),
    // Recovery
    getStudentHistory: builder.query({
      query: (schoolId) => `/recovery/history/students/${schoolId}`,
      providesTags: ['Recovery'],
    }),
    undoStudentChange: builder.mutation({
      query: ({ schoolId, id }) => ({ url: `/recovery/history/undo/${schoolId}/${id}`, method: 'POST' }),
      invalidatesTags: ['Recovery'],
    }),
    getAuditLogs: builder.query({
      query: (schoolId) => `/recovery/audit/${schoolId}`,
      providesTags: ['Audit'],
    }),
    undoAuditLog: builder.mutation({
      query: ({ schoolId, logId }) => ({ url: `/recovery/audit/undo/${schoolId}/${logId}`, method: 'POST' }),
      invalidatesTags: ['Audit'],
    }),
  }),
});

export const {
  useGetSchoolDetailsQuery, useUpdateSchoolMutation, useChangePasswordMutation,
  useGetSetupQuery, useGetSchoolNotificationQuery, useClearSchoolNotificationMutation,
  useGetGlobalNotificationQuery, useGetStudentHistoryQuery, useUndoStudentChangeMutation,
  useGetAuditLogsQuery, useUndoAuditLogMutation,
} = schoolApi;
