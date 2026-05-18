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
    keepUnusedDataFor: 300, // Keep data cached for 5 minutes instead of default 60s
    tagTypes: ['Class', 'Subject', 'Exam', 'Materials', 'Holidays', 'Attendance', 'ExamApproval', 'Syllabus', 'Changes'],
    endpoints: (builder) => ({
        // ---- Classes ----
        getClasses: builder.query({
            query: (schoolId) => `/class/${schoolId}/classes`,
            providesTags: ['Class'],
            // Transform response to handle both {success: true, data: [...]} and [...].
            transformResponse: (response) => response.data || response.classes || response || [],
        }),
        getClassIds: builder.query({
            query: (schoolId) => `/class/${schoolId}/classes`,
            providesTags: ['Class'],
            transformResponse: (response) => {
                const list = response.data || response.classes || response || [];
                return list.map(c => c.id || c.classId);
            },
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

        // ---- Exam Checker & Teacher Approval Workflow ----
        listExams: builder.query({
            query: (schoolId) => `/school/${schoolId}/academic/exams`,
            providesTags: ['Exam'],
            transformResponse: (response) => response.data || response || [],
        }),
        getExamSubmissionsForChecker: builder.query({
            query: ({ schoolId, examId }) => `/school/${schoolId}/academic/exams/checker/submissions/${examId}`,
            providesTags: ['ExamApproval'],
            transformResponse: (response) => response.data || [],
        }),
        teacherApproveSubmission: builder.mutation({
            query: ({ schoolId, examId, submissionId, ...body }) => ({
                url: `/school/${schoolId}/academic/exams/approve/${examId}/${submissionId}`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['ExamApproval'],
        }),
        teacherRejectSubmission: builder.mutation({
            query: ({ schoolId, examId, submissionId, ...body }) => ({
                url: `/school/${schoolId}/academic/exams/reject/${examId}/${submissionId}`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['ExamApproval'],
        }),
        publishExamResults: builder.mutation({
            query: ({ schoolId, examId }) => ({
                url: `/school/${schoolId}/academic/exams/publish/${examId}`,
                method: 'POST',
            }),
            invalidatesTags: ['Exam', 'ExamApproval'],
        }),

        // ---- Syllabus Calendar ----
        getSyllabus: builder.query({
            query: ({ schoolId, subjectId }) => `/school/${schoolId}/academic/syllabus/${subjectId}`,
            providesTags: ['Syllabus'],
            transformResponse: (response) => response.data || [],
        }),
        plotSyllabus: builder.mutation({
            query: ({ schoolId, classId, subjectId, academicYear }) => ({
                url: `/school/${schoolId}/academic/syllabus/${classId}/${subjectId}/plot`,
                method: 'POST',
                body: { academicYear },
            }),
            invalidatesTags: ['Syllabus'],
        }),
        getQuarterReport: builder.query({
            query: ({ schoolId, quarter }) => `/school/${schoolId}/academic/syllabus/quarter/${quarter}`,
            providesTags: ['Syllabus'],
            transformResponse: (response) => response.data || [],
        }),

        // ---- Period Plans ----
        getPeriodPlans: builder.query({
            query: ({ schoolId, teacherId, date }) => `/school/${schoolId}/academic/period-plans/${date}?teacherId=${teacherId}`,
            transformResponse: (response) => response.data || [],
        }),
        restructurePlans: builder.mutation({
            query: ({ schoolId, teacherId, date }) => ({
                url: `/school/${schoolId}/academic/period-plans/restructure`,
                method: 'POST',
                body: { teacherId, date },
            }),
        }),

        // ---- Schedule Changes ----
        getPendingChanges: builder.query({
            query: (schoolId) => `/school/${schoolId}/academic/changes/pending`,
            providesTags: ['Changes'],
            transformResponse: (response) => response.data || [],
        }),
        approveChange: builder.mutation({
            query: ({ schoolId, changeId }) => ({
                url: `/school/${schoolId}/academic/changes/${changeId}/approve`,
                method: 'POST',
            }),
            invalidatesTags: ['Changes'],
        }),
        rejectChange: builder.mutation({
            query: ({ schoolId, changeId, adminNote }) => ({
                url: `/school/${schoolId}/academic/changes/${changeId}/reject`,
                method: 'POST',
                body: { adminNote },
            }),
            invalidatesTags: ['Changes'],
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
        getStudentsByClass: builder.query({
            query: ({ schoolId, className, section }) => {
                let url = `/students/${schoolId}/class/${className}`;
                if (section) url += `?section=${section}`;
                return url;
            },
            providesTags: ['Attendance'],
            transformResponse: (res) => res.data || [],
        }),

        // ---- Holidays ----
        getHolidays: builder.query({
            query: (schoolId) => `/operations/attendance/${schoolId}/holidays`,
            providesTags: ['Holidays'],
            transformResponse: (res) => res.data || [],
        }),
        getHolidayDetail: builder.query({
            query: ({ schoolId, holidayId }) => `/operations/attendance/${schoolId}/holidays/${holidayId}`,
            providesTags: ['Holidays'],
            transformResponse: (res) => res.data || null,
        }),
        createHoliday: builder.mutation({
            query: ({ schoolId, body }) => ({
                url: `/operations/attendance/${schoolId}/holidays`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Holidays'],
        }),
        deleteHoliday: builder.mutation({
            query: ({ schoolId, holidayId }) => ({
                url: `/operations/attendance/${schoolId}/holidays/${holidayId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Holidays'],
        }),

        // ---- Attendance ----
        getAttendanceByDate: builder.query({
            query: ({ schoolId, date }) => `/operations/attendance/${schoolId}/student/date/${date}`,
            providesTags: ['Attendance'],
            transformResponse: (res) => res.data || [],
        }),
        markPresent: builder.mutation({
            query: ({ schoolId, role, userId, body = {} }) => ({
                url: `/operations/attendance/${schoolId}/${role}/${userId}/present`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Attendance'],
        }),
        markHoliday: builder.mutation({
            query: ({ schoolId, role, userId, body = {} }) => ({
                url: `/operations/attendance/${schoolId}/${role}/${userId}/holiday`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Attendance'],
        }),
        updateAttendance: builder.mutation({
            query: ({ schoolId, role, userId, date, body }) => ({
                url: `/operations/attendance/${schoolId}/${role}/${userId}/${date}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['Attendance'],
        }),
        deleteAttendance: builder.mutation({
            query: ({ schoolId, role, userId, date }) => ({
                url: `/operations/attendance/${schoolId}/${role}/${userId}/${date}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Attendance'],
        }),
        
        // Bulk attendance operations
        bulkMarkAttendance: builder.mutation({
            query: ({ schoolId, body }) => ({
                url: `/operations/attendance/${schoolId}/bulk-attendance`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Attendance'],
        }),
        
        getClassAttendance: builder.query({
            query: ({ schoolId, className, date }) => ({
                url: `/operations/attendance/${schoolId}/class-attendance`,
                params: { class_name: className, date },
            }),
            providesTags: ['Attendance'],
            transformResponse: (res) => res.data || [],
        }),

        // Updated Unified Attendance Analytics
        getAdvancedAttendance: builder.query({
            query: ({ school_id, ...params }) => ({
                url: `/operations/attendance/${school_id}/`,
                params,
            }),
            providesTags: ['Attendance'],
            transformResponse: (res) => res.data || res,
        }),

        generateCustomReport: builder.mutation({
            query: ({ schoolId, body }) => ({
                url: `/operations/attendance/${schoolId}/reports/custom`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Attendance'],
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
    useListExamsQuery,
    useGetExamSubmissionsForCheckerQuery,
    useTeacherApproveSubmissionMutation,
    useTeacherRejectSubmissionMutation,
    usePublishExamResultsMutation,
    useGetSyllabusQuery,
    usePlotSyllabusMutation,
    useGetQuarterReportQuery,
    useGetPeriodPlansQuery,
    useRestructurePlansMutation,
    useGetPendingChangesQuery,
    useApproveChangeMutation,
    useRejectChangeMutation,
    useGetMaterialsQuery,
    useAddMaterialMutation,
    useEditMaterialMutation,
    useDeleteMaterialMutation,
    useBuyMaterialMutation,
    useSellMaterialMutation,
    useBulkImportMaterialsMutation,
    useGetMaterialHistoryQuery,
    useLazyGetMaterialHistoryQuery,
    useGetStudentsByClassQuery,
    useLazyGetStudentsByClassQuery,
    useGetHolidaysQuery,
    useGetHolidayDetailQuery,
    useCreateHolidayMutation,
    useDeleteHolidayMutation,
    useGetAttendanceByDateQuery,
    useMarkPresentMutation,
    useMarkHolidayMutation,
    useUpdateAttendanceMutation,
    useDeleteAttendanceMutation,
    useBulkMarkAttendanceMutation,
    useGetClassAttendanceQuery,
    useLazyGetClassAttendanceQuery,
    useGetAdvancedAttendanceQuery,
    useLazyGetAdvancedAttendanceQuery,
    useGenerateCustomReportMutation,
} = academicApi;
