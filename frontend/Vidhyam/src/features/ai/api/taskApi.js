import { baseApi } from '../../../app/api/baseApi';

export const taskApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query({
      query: (schoolId) => `/task/${schoolId}`,
      providesTags: ['Task'],
    }),
    updateTaskStatus: builder.mutation({
      query: ({ schoolId, taskId, ...body }) => ({
        url: `/task/${schoolId}/${taskId}/status`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Task'],
    }),
    // AI task generation
    aiGenerateTasks: builder.mutation({
      query: ({ schoolId, employeeId }) => ({
        url: `/task/ai/${schoolId}/generate`,
        method: 'POST',
        body: { employeeId },
      }),
      invalidatesTags: ['Task'],
    }),
    aiReorganizeTasks: builder.mutation({
      query: ({ schoolId, employeeId }) => ({
        url: `/task/ai/${schoolId}/reorganize`,
        method: 'POST',
        body: { employeeId },
      }),
      invalidatesTags: ['Task'],
    }),
  }),
});

export const {
  useGetTasksQuery, useUpdateTaskStatusMutation,
  useAiGenerateTasksMutation, useAiReorganizeTasksMutation,
} = taskApi;
