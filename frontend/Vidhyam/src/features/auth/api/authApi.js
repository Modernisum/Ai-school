import { baseApi } from '../../../app/api/baseApi';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // School login
    login: builder.mutation({
      query: (credentials) => ({ url: '/auth/school/login', method: 'POST', body: credentials }),
      invalidatesTags: ['Auth'],
    }),
    // Student/parent login (mobile)
    studentLogin: builder.mutation({
      query: ({ ident }) => ({ url: '/auth/student/login', method: 'POST', body: { ident } }),
      invalidatesTags: ['Auth'],
    }),
    // Employee login
    employeeLogin: builder.mutation({
      query: (credentials) => ({ url: '/auth/employee/login', method: 'POST', body: credentials }),
      invalidatesTags: ['Auth'],
    }),
    setup: builder.mutation({
      query: (setupData) => ({ url: '/setup/school', method: 'POST', body: setupData }),
      invalidatesTags: ['Auth'],
    }),
    verifyToken: builder.mutation({
      query: (token) => ({ url: '/auth/school/verify-token', method: 'POST', body: { token } }),
    }),
    logout: builder.mutation({
      query: () => ({ url: '/auth/school/logout', method: 'POST' }),
      invalidatesTags: ['Auth'],
    }),
    setSecurity: builder.mutation({
      query: (data) => ({ url: '/auth/school/set-security', method: 'POST', body: data }),
    }),
    verifyOtp: builder.mutation({
      query: (data) => ({ url: '/auth/school/verify-otp', method: 'POST', body: data }),
    }),
    forgotPassword: builder.mutation({
      query: (data) => ({ url: '/auth/school/forgot-password', method: 'POST', body: data }),
    }),
    changePassword: builder.mutation({
      query: (data) => ({ url: '/auth/school/change-password', method: 'POST', body: data }),
    }),
    registerDevice: builder.mutation({
      query: (data) => ({ url: '/auth/register-device', method: 'POST', body: data }),
    }),
    submitSupport: builder.mutation({
      query: (supportData) => ({ url: '/auth/school/support', method: 'POST', body: supportData }),
    }),
  }),
});

export const {
  useLoginMutation, useStudentLoginMutation, useEmployeeLoginMutation,
  useSetupMutation, useVerifyTokenMutation, useLogoutMutation,
  useSetSecurityMutation, useVerifyOtpMutation, useForgotPasswordMutation,
  useChangePasswordMutation, useRegisterDeviceMutation, useSubmitSupportMutation,
} = authApi;
