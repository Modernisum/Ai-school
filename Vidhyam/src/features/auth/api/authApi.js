import { baseApi } from '../../../app/api/baseApi';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/school/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),
    setup: builder.mutation({
      query: (setupData) => ({
        url: '/setup/school',
        method: 'POST',
        body: setupData,
      }),
      invalidatesTags: ['Auth'],
    }),
    verifyToken: builder.mutation({
      query: (token) => ({
        url: '/auth/school/verify-token',
        method: 'POST',
        body: { token },
      }),
    }),
    submitSupport: builder.mutation({
      query: (supportData) => ({
        url: '/auth/school/support',
        method: 'POST',
        body: supportData,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useSetupMutation,
  useVerifyTokenMutation,
  useSubmitSupportMutation,
} = authApi;
