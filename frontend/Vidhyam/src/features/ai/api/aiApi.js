import { baseApi } from '../../../app/api/baseApi';

export const aiApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // AI Chat query
    aiQuery: builder.mutation({
      query: ({ schoolId, query }) => ({ url: `/ai/${schoolId}/query`, method: 'POST', body: { query } }),
    }),
    // Task generation
    aiGenerateTasks: builder.mutation({
      query: ({ schoolId, employeeId }) => ({ url: `/task/ai/${schoolId}/generate`, method: 'POST', body: { employeeId } }),
      invalidatesTags: ['Task'],
    }),
    aiReorganizeTasks: builder.mutation({
      query: ({ schoolId, employeeId }) => ({ url: `/task/ai/${schoolId}/reorganize`, method: 'POST', body: { employeeId } }),
      invalidatesTags: ['Task'],
    }),
    // Exam generation
    aiGenerateExam: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/exam/ai/${schoolId}/generate`, method: 'POST', body }),
      invalidatesTags: ['Exam'],
    }),
    // AI Config
    getAiConfig: builder.query({
      query: (schoolId) => `/ai/config/${schoolId}`,
      providesTags: ['AI'],
    }),
    updateAiConfig: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/ai/config/${schoolId}`, method: 'PUT', body }),
      invalidatesTags: ['AI'],
    }),
    deleteAiConfig: builder.mutation({
      query: ({ schoolId, providerId }) => ({ url: `/ai/config/${schoolId}/${providerId}`, method: 'DELETE' }),
      invalidatesTags: ['AI'],
    }),
    // AI Health
    aiHealthCheck: builder.query({
      query: (schoolId) => `/ai/health/${schoolId}`,
    }),
    // Embeddings
    generateEmbedding: builder.mutation({
      query: ({ schoolId, text }) => ({ url: `/ai/embedding/${schoolId}`, method: 'POST', body: { text } }),
    }),
    searchDocuments: builder.mutation({
      query: ({ schoolId, query, limit }) => ({ url: `/ai/embedding/${schoolId}/search`, method: 'POST', body: { query, limit } }),
    }),
    // Content generation
    generateExamQuestions: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/content/${schoolId}/generate/exam`, method: 'POST', body }),
    }),
    generateLessonPlan: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/content/${schoolId}/generate/lesson-plan`, method: 'POST', body }),
    }),
    generateStudyMaterials: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/content/${schoolId}/generate/study-materials`, method: 'POST', body }),
    }),
    generatePracticeProblems: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/content/${schoolId}/generate/practice-problems`, method: 'POST', body }),
    }),
    summarizeContent: builder.mutation({
      query: ({ schoolId, content }) => ({ url: `/content/${schoolId}/summarize`, method: 'POST', body: { content } }),
    }),
    enhancedGenerateExam: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/content/${schoolId}/enhanced/generate-exam`, method: 'POST', body }),
    }),
  }),
});

export const {
  useAiQueryMutation, useAiGenerateTasksMutation, useAiReorganizeTasksMutation,
  useAiGenerateExamMutation, useGetAiConfigQuery, useUpdateAiConfigMutation,
  useDeleteAiConfigMutation, useAiHealthCheckQuery, useGenerateEmbeddingMutation,
  useSearchDocumentsMutation, useGenerateExamQuestionsMutation, useGenerateLessonPlanMutation,
  useGenerateStudyMaterialsMutation, useGeneratePracticeProblemsMutation, useSummarizeContentMutation,
  useEnhancedGenerateExamMutation,
} = aiApi;
