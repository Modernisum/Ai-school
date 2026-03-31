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
      query: (schoolId) => `/materials/${schoolId}`,
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

    getMaterialsDashboard: builder.query({
      query: (schoolId) => `/materials/${schoolId}/dashboard`,
      transformResponse: (res) => res.data || {},
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

    getSpaceCategories: builder.query({
      query: (schoolId) => `/spaces/${schoolId}/categories`,
      providesTags: [{ type: 'Categories', id: 'LIST' }],
    }),

    createSpaceCategory: builder.mutation({
      query: ({ schoolId, body }) => ({
        url: `/spaces/${schoolId}/categories`,
        method: 'POST',
        body,
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
      query: (schoolId) => `/responsibility/${schoolId}`,
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
  }),
  overrideExisting: false,
});

export const {
  useGetComplaintsQuery,
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
  useAssignSpaceMaterialsMutation,
  useAssignSpaceEmployeesMutation,
  useRemoveSpaceEmployeeMutation,
  useGetSchoolProfileQuery,
  useUpdateSchoolProfileMutation,
  useGetResponsibilitiesQuery,
  useGetResponsibilityDetailsQuery,
  useCreateResponsibilityMutation,
  useGetEmployeeResponsibilitiesQuery,
  useAssignResponsibilityMutation,
  useRemoveResponsibilityMutation,
} = infrastructureApi;
