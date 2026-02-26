import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../../utils/api';

export const academicApi = createApi({
    reducerPath: 'academicApi',
    baseQuery: fetchBaseQuery({
        baseUrl: API_BASE_URL,
        prepareHeaders: (headers) => {
            const token = localStorage.getItem('accessToken');
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return headers;
        },
    }),
    tagTypes: ['Class', 'Subject', 'Exam', 'Materials'],
    endpoints: (builder) => ({
        // ---- Classes ----
        getClasses: builder.query({
            query: (schoolId) => `/class/${schoolId}/classes`,
            providesTags: ['Class'],
            // Transform response to match expected UI structure
            transformResponse: (response) => response.data || response.classes || [],
        }),
        addClass: builder.mutation({
            query: ({ schoolId, className }) => ({
                url: `/class/${schoolId}/classes`,
                method: 'POST',
                body: { className },
            }),
            invalidatesTags: ['Class'],
        }),
        deleteClass: builder.mutation({
            query: ({ schoolId, classId }) => ({
                url: `/class/${schoolId}/classes/${classId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Class'],
        }),

        // ---- Subjects ----
        getSubjects: builder.query({
            query: (schoolId) => `/subjects/${schoolId}`,
            providesTags: ['Subject'],
            transformResponse: (response) => response.data || response.subjects || [],
        }),
        addSubject: builder.mutation({
            query: ({ schoolId, subjectName, className, subjectFees }) => ({
                url: `/subjects/${schoolId}`,
                method: 'POST',
                body: { subjectName, className, subjectFees },
            }),
            invalidatesTags: ['Subject'],
        }),
        deleteSubject: builder.mutation({
            query: ({ schoolId, subjectId }) => ({
                url: `/subjects/${schoolId}/${subjectId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Subject'],
        }),

        // ---- Exam / Paper Generation ----
        getClassIds: builder.query({
            query: (schoolId) => `/academic/${schoolId}/classIds`,
            providesTags: ['Class'],
            transformResponse: (response) => response.classIds || [],
        }),
        getSubjectIds: builder.query({
            query: ({ schoolId, className }) => `/academic/${schoolId}/${className}/ids`,
            providesTags: ['Subject'],
            transformResponse: (response) => response.data || [],
        }),
        getChapterNames: builder.query({
            query: ({ schoolId, className, subject }) => `/academic/topic/${schoolId}/class/${className}/subject/${subject}/chapter/names`,
            transformResponse: (response) => Array.isArray(response) ? response : [],
        }),
        generatePaper: builder.mutation({
            query: ({ schoolId, ...body }) => ({
                url: `/academic/${schoolId}/generate-paper`,
                method: 'POST',
                body,
            }),
        }),
        approveExam: builder.mutation({
            query: ({ schoolId, ...body }) => ({
                url: `/academic/${schoolId}/exams`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Exam'],
        }),
    }),
});

export const {
    useGetClassesQuery,
    useAddClassMutation,
    useDeleteClassMutation,
    useGetSubjectsQuery,
    useAddSubjectMutation,
    useDeleteSubjectMutation,
    useGetClassIdsQuery,
    useLazyGetSubjectIdsQuery,
    useLazyGetChapterNamesQuery,
    useGeneratePaperMutation,
    useApproveExamMutation,
} = academicApi;
