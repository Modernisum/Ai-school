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
    tagTypes: ['Class', 'Subject', 'Exam', 'Materials', 'Holidays'],
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
            query: ({ schoolId, ...subjectData }) => ({
                url: `/subjects/${schoolId}`,
                method: 'POST',
                body: subjectData,
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
            query: (schoolId) => `/class/${schoolId}/classIds`,
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

        // ---- Materials ----
        getMaterials: builder.query({
            query: (schoolId) => `/materials/${schoolId}`,
            providesTags: ['Materials'],
            transformResponse: (res) => res.data || [],
        }),
        addMaterial: builder.mutation({
            query: ({ schoolId, body }) => ({
                url: `/materials/${schoolId}`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Materials'],
        }),
        editMaterial: builder.mutation({
            query: ({ schoolId, materialId, body }) => ({
                url: `/materials/${schoolId}/${materialId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['Materials'],
        }),
        deleteMaterial: builder.mutation({
            query: ({ schoolId, materialId }) => ({
                url: `/materials/${schoolId}/${materialId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Materials'],
        }),
        buyMaterial: builder.mutation({
            query: ({ schoolId, materialId, body }) => ({
                url: `/materials/${schoolId}/${materialId}/buy`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Materials'],
        }),
        sellMaterial: builder.mutation({
            query: ({ schoolId, materialId, body }) => ({
                url: `/materials/${schoolId}/${materialId}/sell`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Materials'],
        }),
        bulkImportMaterials: builder.mutation({
            query: ({ schoolId, materials }) => ({
                url: `/materials/${schoolId}/bulk`,
                method: 'POST',
                body: { materials },
            }),
            invalidatesTags: ['Materials'],
        }),
        getMaterialHistory: builder.query({
            query: ({ schoolId, materialId }) => `/materials/${schoolId}/${materialId}/history`,
            transformResponse: (res) => res.data || [],
        }),

        // ---- Holidays ----
        getHolidays: builder.query({
            query: (schoolId) => `/operations/attendance/${schoolId}/holidays`,
            providesTags: ['Holidays'],
            transformResponse: (res) => res.data || [],
        }),
        createHoliday: builder.mutation({
            query: ({ schoolId, body }) => ({
                url: `/school-holidays/${schoolId}`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Holidays'],
        }),
        deleteHoliday: builder.mutation({
            query: ({ schoolId, holidayId }) => ({
                url: `/school-holidays/${schoolId}/${holidayId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Holidays'],
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
    useGetMaterialsQuery,
    useAddMaterialMutation,
    useEditMaterialMutation,
    useDeleteMaterialMutation,
    useBuyMaterialMutation,
    useSellMaterialMutation,
    useBulkImportMaterialsMutation,
    useGetMaterialHistoryQuery,
    useLazyGetMaterialHistoryQuery,
    useGetHolidaysQuery,
    useCreateHolidayMutation,
    useDeleteHolidayMutation,
} = academicApi;
