import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";

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
        })
    }),
});

export const {
    useGetStudentsQuery,
    useGetStudentByIdQuery,
    useAddStudentMutation,
    useUpdateStudentMutation,
} = studentApi;
