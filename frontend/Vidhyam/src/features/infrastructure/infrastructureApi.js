import { baseApi } from '../../app/api/baseApi';

export const infrastructureApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // --- Complaints ---
    getComplaints: builder.query({
      query: (schoolId) => `/complains/${schoolId}`,
      providesTags: (result) =>
        result?.success && result.data
          ? [
            ...result.data.map(({ id }) => ({ type: 'Complaints', id })),
            { type: 'Complaints', id: 'LIST' },
          ]
          : [{ type: 'Complaints', id: 'LIST' }],
    }),
    
    getComplaintsWithFilters: builder.query({
      query: ({ schoolId, userId, userRole, status, startDate, endDate, search }) => {
        const params = new URLSearchParams();
        if (userId) params.append('user_id', userId);
        if (userRole) params.append('user_role', userRole);
        if (status) params.append('status', status);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (search) params.append('search', search);
        const qs = params.toString();
        return `/complains/${schoolId}${qs ? `?${qs}` : ''}`;
      },
      providesTags: (result) =>
        result?.success && result.data
          ? [
            ...result.data.map(({ id }) => ({ type: 'Complaints', id })),
            { type: 'Complaints', id: 'FILTERED_LIST' },
          ]
          : [{ type: 'Complaints', id: 'FILTERED_LIST' }],
    }),
    
    getComplaintsStats: builder.query({
      query: (schoolId) => `/complains/${schoolId}/stats`,
      transformResponse: (response) => response.data || {},
    }),
    
    getWeeklyComplaints: builder.query({
      query: ({ schoolId, weeks = 4 }) => `/complains/${schoolId}/weekly?weeks=${weeks}`,
      transformResponse: (response) => response.data || [],
    }),

    createComplaint: builder.mutation({
      query: ({ schoolId, body }) => ({
        url: `/complains/${schoolId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Complaints', id: 'LIST' }],
    }),

    // --- Materials ---
    getMaterials: builder.query({
      query: ({ schoolId, search, filter, page, limit }) => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (filter) params.append('filter', filter);
        if (page) params.append('page', page);
        if (limit) params.append('limit', limit);
        const qs = params.toString();
        return `/materials/${schoolId}${qs ? `?${qs}` : ''}`;
      },
      providesTags: [{ type: 'Materials', id: 'LIST' }],
    }),

    addMaterial: builder.mutation({
      query: ({ schoolId, body }) => ({
        url: `/materials/${schoolId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Materials', id: 'LIST' }],
    }),

    editMaterial: builder.mutation({
      query: ({ schoolId, materialId, body }) => ({
        url: `/materials/${schoolId}/${materialId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: [{ type: 'Materials', id: 'LIST' }],
    }),

    deleteMaterial: builder.mutation({
      query: ({ schoolId, materialId }) => ({
        url: `/materials/${schoolId}/${materialId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Materials', id: 'LIST' }],
    }),

    buyMaterial: builder.mutation({
      query: ({ schoolId, materialId, body }) => ({
        url: `/materials/${schoolId}/${materialId}/buy`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Materials', id: 'LIST' }],
    }),

    sellMaterial: builder.mutation({
      query: ({ schoolId, materialId, body }) => ({
        url: `/materials/${schoolId}/${materialId}/sell`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Materials', id: 'LIST' }],
    }),

    bulkImportMaterials: builder.mutation({
      query: ({ schoolId, materials }) => ({
        url: `/materials/${schoolId}/bulk`,
        method: 'POST',
        body: { materials },
      }),
      invalidatesTags: [{ type: 'Materials', id: 'LIST' }],
    }),

    getMaterialHistory: builder.query({
      query: ({ schoolId, materialId }) => `/materials/${schoolId}/${materialId}/history`,
      transformResponse: (res) => res.data || [],
    }),

    // getMaterialsDashboard is now integrated into getMaterials
    getMaterialsDashboard: builder.query({
      query: (schoolId) => `/materials/${schoolId}?dashboard=true`,
      transformResponse: (res) => res.dashboard || {},
    }),

    getSpaces: builder.query({
      query: (schoolId) => `/spaces/${schoolId}/spaces`,
      providesTags: [{ type: 'Spaces', id: 'LIST' }],
    }),

    createSpace: builder.mutation({
      query: ({ schoolId, body }) => ({
        url: `/spaces/${schoolId}/spaces`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Spaces', id: 'LIST' }],
    }),

    updateSpace: builder.mutation({
      query: ({ schoolId, spaceId, body }) => ({
        url: `/spaces/${schoolId}/${spaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { spaceId }) => [
        { type: 'Spaces', id: 'LIST' },
        { type: 'Spaces', id: spaceId }
      ],
    }),

    deleteSpace: builder.mutation({
      query: ({ schoolId, spaceId }) => ({
        url: `/spaces/${schoolId}/${spaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Spaces', id: 'LIST' }],
    }),

    bulkImportSpaces: builder.mutation({
      query: ({ schoolId, body }) => ({
        url: `/spaces/${schoolId}/bulk`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Spaces', id: 'LIST' }],
    }),

    getSpacesUsingMaterial: builder.query({
      query: ({ schoolId, materialName }) => `/materials/${schoolId}/${materialName}/spaces`,
    }),

    cloneSpace: builder.mutation({
      query: ({ schoolId, spaceName, ...body }) => ({ url: `/spaces/${schoolId}/${spaceName}/clone`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Spaces', id: 'LIST' }],
    }),

    transferMaterial: builder.mutation({
      query: ({ schoolId, fromSpace, materialName, ...body }) => ({ url: `/spaces/${schoolId}/${fromSpace}/materials/${materialName}/transfer`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Spaces', id: 'LIST' }],
    }),

    getSpaceMaterials: builder.query({
      query: ({ schoolId, spaceName }) => `/spaces/${schoolId}/${spaceName}/materials`,
    }),

    getAllSpacesMaterials: builder.query({
      query: (schoolId) => `/spaces/${schoolId}/materials/all`,
    }),

    getSpaceCategories: builder.query({
      query: (schoolId) => `/spaces/${schoolId}/categories`,
      providesTags: [{ type: 'Categories', id: 'LIST' }],
      transformResponse: (response) => {
        // Standardize response to ensure it's an array of category objects
        if (response.success && response.data) {
          return Array.isArray(response.data) ? response.data : [response.data];
        }
        return response.categories || [];
      }
    }),

    createSpaceCategory: builder.mutation({
      query: ({ schoolId, body }) => ({
        url: `/spaces/${schoolId}/categories`,
        method: 'POST',
        body, // Expecting { name: "Category Name" }
      }),
      invalidatesTags: [{ type: 'Categories', id: 'LIST' }],
    }),

    deleteSpaceCategory: builder.mutation({
      query: ({ schoolId, categoryId }) => ({
        url: `/spaces/${schoolId}/categories/${categoryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Categories', id: 'LIST' }],
    }),

    getSpaceDetails: builder.query({
      query: ({ schoolId, spaceId }) => `/spaces/${schoolId}/${spaceId}`,
      providesTags: (result, error, { spaceId }) => [{ type: 'Spaces', id: spaceId }],
    }),

    assignSpaceMaterials: builder.mutation({
      query: ({ schoolId, spaceId, body }) => ({
        url: `/spaces/${schoolId}/${spaceId}/materials`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { spaceId }) => [{ type: 'Spaces', id: spaceId }],
    }),

    assignSpaceEmployees: builder.mutation({
      query: ({ schoolId, spaceId, body }) => ({
        url: `/spaces/${schoolId}/${spaceId}/employees`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { spaceId }) => [{ type: 'Spaces', id: spaceId }],
    }),

    removeSpaceEmployee: builder.mutation({
      query: ({ schoolId, spaceId, employeeId }) => ({
        url: `/spaces/${schoolId}/${spaceId}/employees/${employeeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { spaceId }) => [{ type: 'Spaces', id: spaceId }],
    }),

    // --- School Profile ---
    getSchoolProfile: builder.query({
      query: (schoolId) => `/school/${schoolId}`,
      providesTags: (result, error, schoolId) => [{ type: 'SchoolProfile', id: schoolId }],
    }),

    updateSchoolProfile: builder.mutation({
      query: ({ schoolId, body }) => ({
        url: `/school/${schoolId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { schoolId }) => [{ type: 'SchoolProfile', id: schoolId }],
    }),

    // --- Responsibilities ---
    getResponsibilities: builder.query({
      query: ({ schoolId, employeeType, idsOnly }) => {
        const params = new URLSearchParams();
        if (employeeType) params.append('employeeType', employeeType);
        if (idsOnly) params.append('idsOnly', 'true');
        const queryString = params.toString();
        return `/responsibility/${schoolId}${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: [{ type: 'Responsibilities', id: 'LIST' }],
    }),

    getResponsibilityDetails: builder.query({
      query: ({ schoolId, responsibilityId }) => `/responsibility/${schoolId}/${responsibilityId}`,
      providesTags: (result, error, { responsibilityId }) => [{ type: 'ResponsibilityDetails', id: responsibilityId }],
    }),

    createResponsibility: builder.mutation({
      query: ({ schoolId, body }) => ({
        url: `/responsibility/${schoolId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Responsibilities', id: 'LIST' }],
    }),

    updateResponsibility: builder.mutation({
      query: ({ schoolId, responsibilityId, body }) => ({
        url: `/responsibility/${schoolId}/${responsibilityId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { responsibilityId }) => [
        { type: 'Responsibilities', id: 'LIST' },
        { type: 'ResponsibilityDetails', id: responsibilityId }
      ],
    }),

    deleteResponsibility: builder.mutation({
      query: ({ schoolId, responsibilityId }) => ({
        url: `/responsibility/${schoolId}/${responsibilityId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Responsibilities', id: 'LIST' }],
    }),

    getEmployeeResponsibilities: builder.query({
      query: ({ schoolId, employeeId }) => `/responsibility/${schoolId}/employees/${employeeId}/responsibilities`,
      providesTags: (result, error, { employeeId }) => [{ type: 'EmployeeResponsibilities', id: employeeId }],
    }),

    assignResponsibility: builder.mutation({
      query: ({ schoolId, employeeId, body }) => ({
        url: `/responsibility/${schoolId}/employees/${employeeId}/responsibilities`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { employeeId }) => [{ type: 'EmployeeResponsibilities', id: employeeId }],
    }),

    removeResponsibility: builder.mutation({
      query: ({ schoolId, employeeId, responsibilityId }) => ({
        url: `/responsibility/${schoolId}/employees/${employeeId}/responsibilities/${responsibilityId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { employeeId }) => [{ type: 'EmployeeResponsibilities', id: employeeId }],
    }),

    // --- Responsibility History & Versioning ---
    getResponsibilityHistory: builder.query({
      query: ({ schoolId, responsibilityId, limit = 50 }) => {
        const params = new URLSearchParams();
        if (limit) params.append('limit', limit);
        const queryString = params.toString();
        return `/responsibility/${schoolId}/${responsibilityId}/history${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: (result, error, { responsibilityId }) => [{ type: 'ResponsibilityHistory', id: responsibilityId }],
    }),

    getResponsibilityVersions: builder.query({
      query: ({ schoolId, responsibilityId }) => `/responsibility/${schoolId}/${responsibilityId}/versions`,
      providesTags: (result, error, { responsibilityId }) => [{ type: 'ResponsibilityVersions', id: responsibilityId }],
    }),

    rollbackResponsibility: builder.mutation({
      query: ({ schoolId, responsibilityId, version }) => ({
        url: `/responsibility/${schoolId}/${responsibilityId}/rollback`,
        method: 'POST',
        body: { version },
      }),
      invalidatesTags: (result, error, { responsibilityId }) => [
        { type: 'Responsibilities', id: 'LIST' },
        { type: 'ResponsibilityDetails', id: responsibilityId },
        { type: 'ResponsibilityVersions', id: responsibilityId }
      ],
    }),

    createResponsibilityVersion: builder.mutation({
      query: ({ schoolId, responsibilityId }) => ({
        url: `/responsibility/${schoolId}/${responsibilityId}/version`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { responsibilityId }) => [
        { type: 'ResponsibilityVersions', id: responsibilityId }
      ],
    }),

    // --- Responsibility Analytics & Reporting ---
    getResponsibilityAnalytics: builder.query({
      query: ({ schoolId, responsibilityId }) => `/responsibility/${schoolId}/${responsibilityId}/analytics`,
      providesTags: (result, error, { responsibilityId }) => [{ type: 'ResponsibilityAnalytics', id: responsibilityId }],
    }),

    getOverviewAnalytics: builder.query({
      query: ({ schoolId, timeRange = '30d' }) => {
        const params = new URLSearchParams();
        if (timeRange) params.append('timeRange', timeRange);
        return `/responsibility/${schoolId}/overview/analytics?${params.toString()}`;
      },
      providesTags: [{ type: 'Responsibilities', id: 'OVERVIEW' }],
    }),

    bulkAssignResponsibilities: builder.mutation({
      query: ({ schoolId, responsibilityId, body }) => ({
        url: `/responsibility/${schoolId}/responsibilities/${responsibilityId}/bulk-assign`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { responsibilityId }) => [
        { type: 'ResponsibilityHistory', id: responsibilityId },
        { type: 'ResponsibilityDetails', id: responsibilityId }
      ],
    }),

    getUtilizationMetrics: builder.query({
      query: ({ schoolId, startDate, endDate }) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return `/responsibility/${schoolId}/metrics/utilization?${params.toString()}`;
      },
      providesTags: [{ type: 'Responsibilities', id: 'METRICS' }],
    }),

    getWorkloadMetrics: builder.query({
      query: ({ schoolId }) => `/responsibility/${schoolId}/metrics/workload`,
    }),

    getSpaceDistributionMetrics: builder.query({
      query: ({ schoolId }) => `/responsibility/${schoolId}/metrics/space-distribution`,
    }),

    getRevenueMetrics: builder.query({
      query: ({ schoolId }) => `/responsibility/${schoolId}/metrics/revenue`,
    }),

    generateUtilizationReport: builder.query({
      query: ({ schoolId, startDate, endDate }) => `/responsibility/${schoolId}/reports/utilization/${startDate}/${endDate}`,
    }),

    generateWorkloadReport: builder.query({
      query: ({ schoolId, startDate, endDate }) => `/responsibility/${schoolId}/reports/workload/${startDate}/${endDate}`,
    }),

    generateSpaceDistributionReport: builder.query({
      query: ({ schoolId, startDate, endDate }) => `/responsibility/${schoolId}/reports/space-distribution/${startDate}/${endDate}`,
    }),

    generateRevenueReport: builder.query({
      query: ({ schoolId, startDate, endDate }) => `/responsibility/${schoolId}/reports/revenue/${startDate}/${endDate}`,
    }),

    exportResponsibilitiesCSV: builder.query({
      query: (schoolId) => ({
        url: `/responsibility/${schoolId}/export/csv`,
        responseHandler: (response) => response.blob(),
      }),
    }),

    importResponsibilitiesCSV: builder.mutation({
      query: ({ schoolId, body }) => ({ url: `/responsibility/${schoolId}/import/csv`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Responsibilities', id: 'LIST' }],
    }),

    getStudentResponsibilities: builder.query({
      query: ({ schoolId, studentId }) => `/responsibility/${schoolId}/students/${studentId}/responsibilities`,
      providesTags: [{ type: 'Responsibilities', id: 'LIST' }],
    }),

    getSpaceResponsibilities: builder.query({
      query: ({ schoolId, spaceId }) => `/responsibility/${schoolId}/spaces/${spaceId}/responsibilities`,
      providesTags: [{ type: 'Responsibilities', id: 'LIST' }],
    }),

    getSpaceFinancialOverview: builder.query({
      query: ({ schoolId, spaceId }) => `/responsibility/${schoolId}/spaces/${spaceId}/financial-overview`,
      providesTags: (result, error, { spaceId }) => [{ type: 'SpaceFinancial', id: spaceId }],
    }),

    getMissingResponsibilityAlerts: builder.query({
      query: (schoolId) => `/responsibility/${schoolId}/alerts/missing-responsibilities`,
      providesTags: [{ type: 'Responsibilities', id: 'ALERTS' }],
    }),

    bulkRemoveResponsibilities: builder.mutation({
      query: ({ schoolId, responsibilityId, body }) => ({
        url: `/responsibility/${schoolId}/responsibilities/${responsibilityId}/bulk-remove`,
        method: 'DELETE',
        body,
      }),
      invalidatesTags: (result, error, { responsibilityId }) => [
        { type: 'ResponsibilityHistory', id: responsibilityId },
        { type: 'ResponsibilityDetails', id: responsibilityId },
      ],
    }),

    bulkUpdateResponsibilities: builder.mutation({
      query: ({ schoolId, responsibilityId, body }) => ({
        url: `/responsibility/${schoolId}/responsibilities/${responsibilityId}/bulk-update`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { responsibilityId }) => [
        { type: 'ResponsibilityHistory', id: responsibilityId },
        { type: 'ResponsibilityDetails', id: responsibilityId },
      ],
    }),

    // PDF Reports
    getUtilizationReportPdf: builder.query({
      query: ({ schoolId, startDate, endDate }) => `/responsibility/${schoolId}/reports/utilization/${startDate}/${endDate}_pdf`,
    }),

    getWorkloadReportPdf: builder.query({
      query: ({ schoolId, startDate, endDate }) => `/responsibility/${schoolId}/reports/workload/${startDate}/${endDate}_pdf`,
    }),

    getSpaceDistributionReportPdf: builder.query({
      query: ({ schoolId, startDate, endDate }) => `/responsibility/${schoolId}/reports/space-distribution/${startDate}/${endDate}_pdf`,
    }),

    getRevenueReportPdf: builder.query({
      query: ({ schoolId, startDate, endDate }) => `/responsibility/${schoolId}/reports/revenue/${startDate}/${endDate}_pdf`,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetComplaintsQuery,
  useGetComplaintsWithFiltersQuery,
  useGetComplaintsStatsQuery,
  useGetWeeklyComplaintsQuery,
  useCreateComplaintMutation,
  useGetMaterialsQuery,
  useAddMaterialMutation,
  useEditMaterialMutation,
  useDeleteMaterialMutation,
  useBuyMaterialMutation,
  useSellMaterialMutation,
  useBulkImportMaterialsMutation,
  useGetMaterialHistoryQuery,
  useGetMaterialsDashboardQuery,
  useGetSpacesQuery,
  useCreateSpaceMutation,
  useUpdateSpaceMutation,
  useDeleteSpaceMutation,
  useBulkImportSpacesMutation,
  useGetSpaceCategoriesQuery,
  useCreateSpaceCategoryMutation,
  useDeleteSpaceCategoryMutation,
  useGetSpaceDetailsQuery,
  useGetSpacesUsingMaterialQuery,
  useCloneSpaceMutation,
  useTransferMaterialMutation,
  useGetSpaceMaterialsQuery,
  useGetAllSpacesMaterialsQuery,
  useAssignSpaceMaterialsMutation,
  useAssignSpaceEmployeesMutation,
  useRemoveSpaceEmployeeMutation,
  useGetSchoolProfileQuery,
  useUpdateSchoolProfileMutation,
  useGetResponsibilitiesQuery,
  useGetResponsibilityDetailsQuery,
  useCreateResponsibilityMutation,
  useUpdateResponsibilityMutation,
  useDeleteResponsibilityMutation,
  useGetEmployeeResponsibilitiesQuery,
  useAssignResponsibilityMutation,
  useRemoveResponsibilityMutation,
  useGetResponsibilityHistoryQuery,
  useGetResponsibilityVersionsQuery,
  useRollbackResponsibilityMutation,
  useCreateResponsibilityVersionMutation,
  useGetResponsibilityAnalyticsQuery,
  useGetOverviewAnalyticsQuery,
  useBulkAssignResponsibilitiesMutation,
  useGetUtilizationMetricsQuery,
  useGetWorkloadMetricsQuery,
  useGetSpaceDistributionMetricsQuery,
  useGetRevenueMetricsQuery,
  useGenerateUtilizationReportQuery,
  useGenerateWorkloadReportQuery,
  useGenerateSpaceDistributionReportQuery,
  useGenerateRevenueReportQuery,
  useExportResponsibilitiesCSVQuery,
  useImportResponsibilitiesCSVMutation,
  useGetStudentResponsibilitiesQuery,
  useGetSpaceResponsibilitiesQuery,
  useGetSpaceFinancialOverviewQuery,
  useGetMissingResponsibilityAlertsQuery,
  useBulkRemoveResponsibilitiesMutation,
  useBulkUpdateResponsibilitiesMutation,
  useGetUtilizationReportPdfQuery,
  useGetWorkloadReportPdfQuery,
  useGetSpaceDistributionReportPdfQuery,
  useGetRevenueReportPdfQuery,
} = infrastructureApi;
