import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const studentApi = createApi({
  reducerPath: 'studentApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('accessToken');
      if (token) headers.set('authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Student', 'StudentAttendance', 'StudentFees'],
  endpoints: (builder) => ({
    // CRUD
    getStudents: builder.query({
      query: (schoolId) => `/students/${schoolId}`,
      providesTags: ['Student'],
    }),
    getStudentsPaginated: builder.query({
      query: ({ schoolId, page, limit }) => `/students/${schoolId}/paginated?page=${page}&limit=${limit}`,
      providesTags: ['Student'],
    }),
    getStudentIds: builder.query({
      query: (schoolId) => `/students/${schoolId}/studentIds`,
      providesTags: ['Student'],
    }),
    getStudentById: builder.query({
      query: ({ schoolId, studentId }) => `/students/${schoolId}/${studentId}`,
      providesTags: (r, e, a) => [{ type: 'Student', id: a.studentId }],
    }),
    getStudentsByClass: builder.query({
      query: ({ schoolId, className }) => `/students/${schoolId}/class/${className}`,
      providesTags: ['Student'],
    }),
    addStudent: builder.mutation({
      query: ({ schoolId, studentData }) => ({ url: `/students/${schoolId}`, method: 'POST', body: studentData }),
      invalidatesTags: ['Student'],
    }),
    validateStudent: builder.mutation({
      query: ({ schoolId, ...data }) => ({ url: `/students/${schoolId}/validate`, method: 'POST', body: data }),
    }),
    updateStudent: builder.mutation({
      query: ({ schoolId, studentId, studentData }) => ({ url: `/students/${schoolId}/${studentId}`, method: 'PUT', body: studentData }),
      invalidatesTags: (r, e, a) => [{ type: 'Student', id: a.studentId }, 'Student'],
    }),
    deleteStudent: builder.mutation({
      query: ({ schoolId, studentId }) => ({ url: `/students/${schoolId}/${studentId}`, method: 'DELETE' }),
      invalidatesTags: ['Student'],
    }),
    bulkImportStudents: builder.mutation({
      query: ({ schoolId, payload }) => ({ url: `/students/${schoolId}/bulk`, method: 'POST', body: payload }),
      invalidatesTags: ['Student'],
    }),
    // Profile
    getStudentProfile: builder.query({
      query: ({ schoolId, studentId }) => `/students/${schoolId}/students/${studentId}/profile`,
      providesTags: (r, e, a) => [{ type: 'Student', id: a.studentId }],
    }),
    // Attendance
    getStudentAttendance: builder.query({
      query: ({ schoolId, role, userId }) => `/operations/attendance/${schoolId}/${role}/${userId}`,
      providesTags: (r, e, a) => [{ type: 'StudentAttendance', id: a.userId }],
    }),
    getAttendanceByDate: builder.query({
      query: ({ schoolId, date }) => `/operations/attendance/${schoolId}/student/date/${date}`,
      providesTags: ['StudentAttendance'],
    }),
    // Fees
    getStudentFees: builder.query({
      query: ({ schoolId, studentId }) => `/fees/${schoolId}/student/${studentId}`,
      providesTags: (r, e, a) => [{ type: 'StudentFees', id: a.studentId }],
    }),
    addFeeToStudent: builder.mutation({
      query: ({ schoolId, studentId, ...body }) => ({ url: `/fees/${schoolId}/student/${studentId}/add`, method: 'POST', body }),
      invalidatesTags: (r, e, a) => [{ type: 'StudentFees', id: a.studentId }],
    }),
    payStudentFee: builder.mutation({
      query: ({ schoolId, studentId, ...body }) => ({ url: `/fees/${schoolId}/student/${studentId}/pay`, method: 'POST', body }),
      invalidatesTags: (r, e, a) => [{ type: 'StudentFees', id: a.studentId }],
    }),
    applyStudentDiscount: builder.mutation({
      query: ({ schoolId, studentId, ...body }) => ({ url: `/fees/${schoolId}/student/${studentId}/discount`, method: 'POST', body }),
      invalidatesTags: (r, e, a) => [{ type: 'StudentFees', id: a.studentId }],
    }),
    generateFeeReminder: builder.query({
      query: ({ schoolId, studentId }) => `/fees/${schoolId}/student/${studentId}/ai-reminder`,
    }),
    // Complaints
    getStudentComplaints: builder.query({
      query: ({ schoolId, studentId }) => `/complains/${schoolId}/student/${studentId}`,
      providesTags: (r, e, a) => [{ type: 'Student', id: a.studentId }],
    }),
    // Documents
    getStudentDocuments: builder.query({
      query: (schoolId) => `/documentbox/${schoolId}`,
      providesTags: ['Student'],
    }),
    uploadStudentDocument: builder.mutation({
      query: ({ schoolId, studentId, ...body }) => ({ url: `/document_upload/${schoolId}/student/${studentId}`, method: 'POST', body }),
      invalidatesTags: ['Student'],
    }),
    // Awards
    getStudentAwards: builder.query({
      query: (schoolId) => `/award/${schoolId}`,
      providesTags: ['Student'],
    }),
    // Exams
    getStudentExams: builder.query({
      query: (schoolId) => `/exams/${schoolId}`,
      providesTags: ['Student'],
    }),
  }),
});

export const {
  useGetStudentsQuery, useGetStudentsPaginatedQuery, useGetStudentIdsQuery,
  useGetStudentByIdQuery, useGetStudentsByClassQuery, useAddStudentMutation,
  useValidateStudentMutation, useUpdateStudentMutation, useDeleteStudentMutation,
  useBulkImportStudentsMutation, useGetStudentProfileQuery,
  useGetStudentAttendanceQuery, useGetAttendanceByDateQuery,
  useGetStudentFeesQuery, useAddFeeToStudentMutation, usePayStudentFeeMutation,
  useApplyStudentDiscountMutation, useGenerateFeeReminderQuery,
  useGetStudentComplaintsQuery, useGetStudentDocumentsQuery, useUploadStudentDocumentMutation,
  useGetStudentAwardsQuery, useGetStudentExamsQuery,
} = studentApi;
