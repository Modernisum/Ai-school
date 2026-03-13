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
  }),
  overrideExisting: false,
});

export const {
  useGetComplaintsQuery,
  useCreateComplaintMutation,
  useGetMaterialsQuery,
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
  useGetSchoolProfileQuery,
  useUpdateSchoolProfileMutation,
} = infrastructureApi;
