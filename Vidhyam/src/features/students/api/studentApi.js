import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;

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
    tagTypes: ['Student'],
    endpoints: (builder) => ({
        getStudents: builder.query({
            query: (schoolId) => `/students/${schoolId}/students`,
            providesTags: ['Student'],
        }),
        getStudentById: builder.query({
            query: ({ schoolId, studentId }) => `/students/${schoolId}/student/${studentId}`,
            providesTags: (result, error, arg) => [{ type: 'Student', id: arg.studentId }],
        }),
        addStudent: builder.mutation({
            query: ({ schoolId, studentData }) => ({
                url: `/students/${schoolId}/students`,
                method: 'POST',
                body: studentData,
            }),
            invalidatesTags: ['Student'],
        }),
        updateStudent: builder.mutation({
            query: ({ schoolId, studentId, studentData }) => ({
                url: `/students/${schoolId}/student/${studentId}`,
                method: 'PUT',
                body: studentData,
            }),
            invalidatesTags: (result, error, arg) => [{ type: 'Student', id: arg.studentId }, 'Student'],
        }),
        getStudentProfile: builder.query({
            query: ({ schoolId, studentId }) => `/students/${schoolId}/students/${studentId}/profile`,
            providesTags: (result, error, arg) => [{ type: 'Student', id: arg.studentId }],
        }),
        getStudentAttendance: builder.query({
            query: ({ schoolId, role, userId }) => `/operations/attendance/${schoolId}/${role}/${userId}`,
            providesTags: (result, error, arg) => [{ type: 'Student', id: arg.userId }],
        }),
        getStudentFees: builder.query({
            query: ({ schoolId, studentId }) => `/fees/${schoolId}/student/${studentId}`,
            providesTags: (result, error, arg) => [{ type: 'Student', id: arg.studentId }],
        }),
        getStudentComplains: builder.query({
            query: ({ schoolId, studentId }) => `/complains/${schoolId}/student/${studentId}`,
            providesTags: (result, error, arg) => [{ type: 'Student', id: arg.studentId }],
        }),
        getStudentAwards: builder.query({
            query: (schoolId) => `/award/${schoolId}`,
            providesTags: ['Student'],
        }),
        getStudentExams: builder.query({
            query: (schoolId) => `/exams/${schoolId}/list`, // Assuming /list or just /exams
            providesTags: ['Student'],
        }),
        getStudentDocuments: builder.query({
            query: (schoolId) => `/documentbox/${schoolId}`,
            providesTags: ['Student'],
        }),
        bulkImportStudents: builder.mutation({
            query: ({ schoolId, payload }) => ({
                url: `/students/${schoolId}/students/bulk`,
                method: 'POST',
                body: payload,
            }),
            invalidatesTags: ['Student'],
        }),
    }),
});

export const {
    useGetStudentsQuery,
    useGetStudentByIdQuery,
    useAddStudentMutation,
    useUpdateStudentMutation,
    useGetStudentProfileQuery,
    useGetStudentAttendanceQuery,
    useGetStudentFeesQuery,
    useGetStudentComplainsQuery,
    useGetStudentAwardsQuery,
    useGetStudentExamsQuery,
    useGetStudentDocumentsQuery,
    useBulkImportStudentsMutation,
} = studentApi;
