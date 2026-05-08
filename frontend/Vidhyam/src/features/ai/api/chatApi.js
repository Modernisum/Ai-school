import { baseApi } from '../../../app/api/baseApi';

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendMessage: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/chat/${schoolId}/send`, method: 'POST', body }),
    }),
    getChatHistory: builder.query({
      query: ({ schoolId, user1, user2 }) => `/chat/${schoolId}/history/${user1}/${user2}`,
      providesTags: ['Chat'],
    }),
    getAiChatHistory: builder.query({
      query: (schoolId) => `/chat/${schoolId}/ai-history`,
      providesTags: ['Chat'],
    }),
  }),
});

export const {
  useSendMessageMutation, useGetChatHistoryQuery, useGetAiChatHistoryQuery,
} = chatApi;
