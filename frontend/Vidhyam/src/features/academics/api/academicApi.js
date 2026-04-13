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
    tagTypes: ['Class', 'Subject', 'Exam', 'Materials', 'Holidays', 'Attendance'],
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

        // Attendance Reports
        getDailySummary: builder.query({
            query: ({ schoolId, date }) => ({
                url: `/operations/attendance/${schoolId}/reports/daily-summary`,
                params: { date },
            }),
            providesTags: ['Attendance'],
            transformResponse: (res) => res.data || res,
        }),

        getMonthlyStats: builder.query({
            query: ({ schoolId, month, year }) => ({
                url: `/operations/attendance/${schoolId}/reports/monthly-stats`,
                params: { month, year },
            }),
            providesTags: ['Attendance'],
            transformResponse: (res) => res.data || res,
        }),

        getStudentReport: builder.query({
            query: ({ schoolId, studentId, startDate, endDate, status }) => ({
                url: `/operations/attendance/${schoolId}/reports/student`,
                params: { student_id: studentId, start_date: startDate, end_date: endDate, status },
            }),
            providesTags: ['Attendance'],
            transformResponse: (res) => res.data || res,
        }),

        getClassReport: builder.query({
            query: ({ schoolId, className, startDate, endDate }) => ({
                url: `/operations/attendance/${schoolId}/reports/class`,
                params: { class_name: className, start_date: startDate, end_date: endDate },
            }),
            providesTags: ['Attendance'],
            transformResponse: (res) => res.data || res,
        }),

        getEmployeeReport: builder.query({
            query: ({ schoolId, employeeId, startDate, endDate }) => ({
                url: `/operations/attendance/${schoolId}/reports/employee`,
                params: { employee_id: employeeId, start_date: startDate, end_date: endDate },
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
    useGetDailySummaryQuery,
    useLazyGetDailySummaryQuery,
    useGetMonthlyStatsQuery,
    useLazyGetMonthlyStatsQuery,
    useGetStudentReportQuery,
    useLazyGetStudentReportQuery,
    useGetClassReportQuery,
    useLazyGetClassReportQuery,
    useGetEmployeeReportQuery,
    useLazyGetEmployeeReportQuery,
    useGenerateCustomReportMutation,
} = academicApi;
