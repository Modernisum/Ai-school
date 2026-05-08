import { baseApi } from '../../../app/api/baseApi';

export const infrastructureApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Spaces
    getSpaces: builder.query({
      query: ({ schoolId, ...params }) => ({ url: `/spaces/${schoolId}/spaces`, params }),
      providesTags: ['Spaces'],
    }),
    getSpaceCategories: builder.query({
      query: (schoolId) => `/spaces/${schoolId}/categories`,
      providesTags: ['Categories'],
    }),
    createSpace: builder.mutation({
      query: ({ schoolId, category, ...body }) => ({ url: `/spaces/${schoolId}/spaces/${category}`, method: 'POST', body }),
      invalidatesTags: ['Spaces'],
    }),
    getSpaceDetails: builder.query({
      query: ({ schoolId, spaceName }) => `/spaces/${schoolId}/${spaceName}`,
      providesTags: ['Spaces'],
    }),
    updateSpace: builder.mutation({
      query: ({ schoolId, spaceName, ...body }) => ({ url: `/spaces/${schoolId}/${spaceName}`, method: 'PUT', body }),
      invalidatesTags: ['Spaces'],
    }),
    deleteSpace: builder.mutation({
      query: ({ schoolId, spaceName }) => ({ url: `/spaces/${schoolId}/${spaceName}`, method: 'DELETE' }),
      invalidatesTags: ['Spaces'],
    }),
    assignSpaceMaterials: builder.mutation({
      query: ({ schoolId, spaceName, ...body }) => ({ url: `/spaces/${schoolId}/${spaceName}/materials`, method: 'POST', body }),
      invalidatesTags: ['Spaces', 'Materials'],
    }),
    // Materials
    getMaterials: builder.query({
      query: (schoolId) => `/materials/${schoolId}`,
      providesTags: ['Materials'],
    }),
    createMaterial: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/materials/${schoolId}`, method: 'POST', body }),
      invalidatesTags: ['Materials'],
    }),
    getMaterial: builder.query({
      query: ({ schoolId, materialName }) => `/materials/${schoolId}/${materialName}`,
      providesTags: ['Materials'],
    }),
    updateMaterial: builder.mutation({
      query: ({ schoolId, materialName, ...body }) => ({ url: `/materials/${schoolId}/${materialName}`, method: 'PATCH', body }),
      invalidatesTags: ['Materials'],
    }),
    deleteMaterial: builder.mutation({
      query: ({ schoolId, materialName }) => ({ url: `/materials/${schoolId}/${materialName}`, method: 'DELETE' }),
      invalidatesTags: ['Materials'],
    }),
    buyMaterial: builder.mutation({
      query: ({ schoolId, materialName, ...body }) => ({ url: `/materials/${schoolId}/${materialName}/buy`, method: 'POST', body }),
      invalidatesTags: ['Materials'],
    }),
    sellMaterial: builder.mutation({
      query: ({ schoolId, materialName, ...body }) => ({ url: `/materials/${schoolId}/${materialName}/sell`, method: 'POST', body }),
      invalidatesTags: ['Materials'],
    }),
    bulkImportMaterials: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/materials/${schoolId}/bulk`, method: 'POST', body }),
      invalidatesTags: ['Materials'],
    }),
    // Webhooks
    getWebhooks: builder.query({
      query: (schoolId) => `/school/${schoolId}/webhooks/`,
      providesTags: ['Webhooks'],
    }),
    createWebhook: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/school/${schoolId}/webhooks/`, method: 'POST', body }),
      invalidatesTags: ['Webhooks'],
    }),
    deleteWebhook: builder.mutation({
      query: ({ schoolId, webhookId }) => ({ url: `/school/${schoolId}/webhooks/${webhookId}`, method: 'DELETE' }),
      invalidatesTags: ['Webhooks'],
    }),
    getWebhookLogs: builder.query({
      query: ({ schoolId, webhookId }) => `/school/${schoolId}/webhooks/${webhookId}/logs`,
    }),
    // API Keys
    getApiKeys: builder.query({
      query: (schoolId) => `/school/${schoolId}/api-keys/`,
      providesTags: ['ApiKeys'],
    }),
    generateApiKey: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/school/${schoolId}/api-keys/`, method: 'POST', body }),
      invalidatesTags: ['ApiKeys'],
    }),
    revokeApiKey: builder.mutation({
      query: ({ schoolId, keyId }) => ({ url: `/school/${schoolId}/api-keys/${keyId}`, method: 'DELETE' }),
      invalidatesTags: ['ApiKeys'],
    }),
    // Developer Access
    getPendingRequests: builder.query({
      query: () => '/developer-access/requests',
      providesTags: ['DeveloperAccess'],
    }),
    validateAccessToken: builder.query({
      query: (token) => `/developer-access/validate?token=${token}`,
    }),
    requestAccess: builder.mutation({
      query: ({ developerId, ...body }) => ({ url: `/developer-access/${developerId}/request`, method: 'POST', body }),
      invalidatesTags: ['DeveloperAccess'],
    }),
    getDeveloperAccess: builder.query({
      query: (developerId) => `/developer-access/${developerId}/access`,
      providesTags: ['DeveloperAccess'],
    }),
    revokeAccess: builder.mutation({
      query: (developerId) => ({ url: `/developer-access/${developerId}/access`, method: 'DELETE' }),
      invalidatesTags: ['DeveloperAccess'],
    }),
    getDeveloperActivity: builder.query({
      query: (developerId) => `/developer-access/${developerId}/activity`,
    }),
    updateDeveloperRole: builder.mutation({
      query: ({ developerId, ...body }) => ({ url: `/developer-access/${developerId}/role`, method: 'PUT', body }),
      invalidatesTags: ['DeveloperAccess'],
    }),
    emergencyAccess: builder.mutation({
      query: ({ developerId }) => ({ url: `/developer-access/${developerId}/emergency`, method: 'POST' }),
    }),
    approveAccessRequest: builder.mutation({
      query: ({ requestId }) => ({ url: `/developer-access/requests/${requestId}/approve`, method: 'POST' }),
      invalidatesTags: ['DeveloperAccess'],
    }),
    rejectAccessRequest: builder.mutation({
      query: ({ requestId }) => ({ url: `/developer-access/requests/${requestId}/reject`, method: 'POST' }),
      invalidatesTags: ['DeveloperAccess'],
    }),
    // OCR
    extractOcrText: builder.mutation({
      query: (body) => ({ url: '/ocr-routes/extract', method: 'POST', body }),
    }),
    // Public API
    getPublicStudents: builder.query({
      query: ({ apiKey, ...params }) => ({ url: '/v1/public/students', headers: { 'X-API-Key': apiKey }, params }),
    }),
    getPublicAttendance: builder.query({
      query: ({ apiKey, date }) => ({ url: `/v1/public/attendance/${date}`, headers: { 'X-API-Key': apiKey } }),
    }),
  }),
});

export const {
  useGetSpacesQuery, useGetSpaceCategoriesQuery, useCreateSpaceMutation,
  useGetSpaceDetailsQuery, useUpdateSpaceMutation, useDeleteSpaceMutation,
  useAssignSpaceMaterialsMutation, useGetMaterialsQuery, useCreateMaterialMutation,
  useGetMaterialQuery, useUpdateMaterialMutation, useDeleteMaterialMutation,
  useBuyMaterialMutation, useSellMaterialMutation, useBulkImportMaterialsMutation,
  useGetWebhooksQuery, useCreateWebhookMutation, useDeleteWebhookMutation,
  useGetWebhookLogsQuery, useGetApiKeysQuery, useGenerateApiKeyMutation,
  useRevokeApiKeyMutation, useGetPendingRequestsQuery, useValidateAccessTokenQuery,
  useRequestAccessMutation, useGetDeveloperAccessQuery, useRevokeAccessMutation,
  useGetDeveloperActivityQuery, useUpdateDeveloperRoleMutation, useEmergencyAccessMutation,
  useApproveAccessRequestMutation, useRejectAccessRequestMutation,
  useExtractOcrTextMutation, useGetPublicStudentsQuery, useGetPublicAttendanceQuery,
} = infrastructureApi;
