import { baseApi } from '../../../app/api/baseApi';

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Mark / Update / Delete
    markPresent: builder.mutation({
      query: ({ schoolId, role, userId, ...body }) => ({ url: `/operations/attendance/${schoolId}/${role}/${userId}/present`, method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),
    markHoliday: builder.mutation({
      query: ({ schoolId, role, userId, ...body }) => ({ url: `/operations/attendance/${schoolId}/${role}/${userId}/holiday`, method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),
    updateAttendance: builder.mutation({
      query: ({ schoolId, role, userId, date, ...body }) => ({ url: `/operations/attendance/${schoolId}/${role}/${userId}/${date}`, method: 'PUT', body }),
      invalidatesTags: ['Attendance'],
    }),
    deleteAttendance: builder.mutation({
      query: ({ schoolId, role, userId, date }) => ({ url: `/operations/attendance/${schoolId}/${role}/${userId}/${date}`, method: 'DELETE' }),
      invalidatesTags: ['Attendance'],
    }),
    // List attendance
    getUserAttendance: builder.query({
      query: ({ schoolId, role, userId }) => `/operations/attendance/${schoolId}/${role}/${userId}`,
      providesTags: ['Attendance'],
    }),
    getAttendanceByDate: builder.query({
      query: ({ schoolId, date }) => `/operations/attendance/${schoolId}/student/date/${date}`,
      providesTags: ['Attendance'],
    }),
    getSchoolAttendance: builder.query({
      query: ({ schoolId, ...params }) => ({ url: `/operations/attendance/${schoolId}/`, params }),
      providesTags: ['Attendance'],
    }),
    // Bulk & Class
    bulkMarkAttendance: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/operations/attendance/${schoolId}/bulk-attendance`, method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),
    getClassAttendance: builder.query({
      query: ({ schoolId, ...params }) => ({ url: `/operations/attendance/${schoolId}/class-attendance`, params }),
      providesTags: ['Attendance'],
    }),
    // QR & Mobile
    generateQrAttendance: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/operations/attendance/${schoolId}/qr-attendance`, method: 'POST', body }),
    }),
    mobileMarkAttendance: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/operations/attendance/${schoolId}/mobile-attendance`, method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),
    offlineSyncAttendance: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/operations/attendance/${schoolId}/offline-sync`, method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),
    // Reports
    getStudentReport: builder.query({
      query: ({ schoolId, ...params }) => ({ url: `/operations/attendance/${schoolId}/reports/student`, params }),
    }),
    getClassReport: builder.query({
      query: ({ schoolId, ...params }) => ({ url: `/operations/attendance/${schoolId}/reports/class`, params }),
    }),
    getEmployeeReport: builder.query({
      query: ({ schoolId, ...params }) => ({ url: `/operations/attendance/${schoolId}/reports/employee`, params }),
    }),
    generateCustomReport: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/operations/attendance/${schoolId}/reports/custom`, method: 'POST', body }),
    }),
    // Holidays
    getHolidays: builder.query({
      query: (schoolId) => `/operations/attendance/${schoolId}/holidays`,
      providesTags: ['Holidays'],
    }),
    createHoliday: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/operations/attendance/${schoolId}/holidays`, method: 'POST', body }),
      invalidatesTags: ['Holidays'],
    }),
    checkHoliday: builder.query({
      query: ({ schoolId, date }) => `/operations/attendance/${schoolId}/holidays/check?date=${date}`,
    }),
    getHolidayDetail: builder.query({
      query: ({ schoolId, holidayId }) => `/operations/attendance/${schoolId}/holidays/${holidayId}`,
    }),
    deleteHoliday: builder.mutation({
      query: ({ schoolId, holidayId }) => ({ url: `/operations/attendance/${schoolId}/holidays/${holidayId}`, method: 'DELETE' }),
      invalidatesTags: ['Holidays'],
    }),
  }),
});

export const {
  useMarkPresentMutation, useMarkHolidayMutation, useUpdateAttendanceMutation,
  useDeleteAttendanceMutation, useGetUserAttendanceQuery, useGetAttendanceByDateQuery,
  useGetSchoolAttendanceQuery, useBulkMarkAttendanceMutation, useGetClassAttendanceQuery,
  useGenerateQrAttendanceMutation, useMobileMarkAttendanceMutation, useOfflineSyncAttendanceMutation,
  useGetStudentReportQuery, useGetClassReportQuery, useGetEmployeeReportQuery,
  useGenerateCustomReportMutation, useGetHolidaysQuery, useCreateHolidayMutation,
  useCheckHolidayQuery, useGetHolidayDetailQuery, useDeleteHolidayMutation,
} = attendanceApi;
