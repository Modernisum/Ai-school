import { baseApi } from '../../../app/api/baseApi';

export const billingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Fee listing
    getFees: builder.query({
      query: (schoolId) => `/fees/${schoolId}`,
      providesTags: ['Fees'],
    }),
    createSchoolFee: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/fees/${schoolId}`, method: 'POST', body }),
      invalidatesTags: ['Fees', 'CustomFees'],
    }),
    getPendingFees: builder.query({
      query: ({ schoolId, ...params }) => ({ url: `/fees/${schoolId}/pendingFees/filter`, params }),
      providesTags: ['Fees'],
    }),
    // Student-specific fees
    getStudentFee: builder.query({
      query: ({ schoolId, studentId }) => `/fees/${schoolId}/student/${studentId}`,
      providesTags: (r, e, a) => [{ type: 'Fees', id: a.studentId }],
    }),
    addFeeToStudent: builder.mutation({
      query: ({ schoolId, studentId, ...body }) => ({ url: `/fees/${schoolId}/student/${studentId}/add`, method: 'POST', body }),
      invalidatesTags: ['Fees'],
    }),
    payFee: builder.mutation({
      query: ({ schoolId, studentId, ...body }) => ({ url: `/fees/${schoolId}/student/${studentId}/pay`, method: 'POST', body }),
      invalidatesTags: ['Fees'],
    }),
    applyDiscount: builder.mutation({
      query: ({ schoolId, studentId, ...body }) => ({ url: `/fees/${schoolId}/student/${studentId}/discount`, method: 'POST', body }),
      invalidatesTags: ['Fees'],
    }),
    // AI Reminder
    generateFeeReminder: builder.mutation({
      query: ({ schoolId, studentId }) => ({ url: `/fees/${schoolId}/student/${studentId}/ai-reminder`, method: 'GET' }),
    }),
    // Custom fees
    getCustomFees: builder.query({
      query: (schoolId) => `/fees/${schoolId}/custom`,
      providesTags: ['CustomFees'],
    }),
    createCustomFee: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/fees/${schoolId}/custom`, method: 'POST', body }),
      invalidatesTags: ['CustomFees', 'Fees'],
    }),
    applyCustomFee: builder.mutation({
      query: ({ schoolId, feeId, ...body }) => ({ url: `/fees/${schoolId}/custom/${feeId}/apply`, method: 'POST', body }),
      invalidatesTags: ['Fees'],
    }),
    deleteCustomFee: builder.mutation({
      query: ({ schoolId, feeId }) => ({ url: `/fees/${schoolId}/custom/${feeId}`, method: 'DELETE' }),
      invalidatesTags: ['CustomFees'],
    }),
    // Coupons
    getCoupons: builder.query({
      query: (schoolId) => `/fees/${schoolId}/coupons`,
      providesTags: ['Coupons'],
    }),
    createCoupon: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/fees/${schoolId}/coupons`, method: 'POST', body }),
      invalidatesTags: ['Coupons'],
    }),
    validateCoupon: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/fees/${schoolId}/coupons/validate`, method: 'POST', body }),
    }),
    deleteCoupon: builder.mutation({
      query: ({ schoolId, couponId }) => ({ url: `/fees/${schoolId}/coupons/${couponId}`, method: 'DELETE' }),
      invalidatesTags: ['Coupons'],
    }),
    blockCoupon: builder.mutation({
      query: ({ schoolId, couponId }) => ({ url: `/fees/${schoolId}/coupons/${couponId}/block`, method: 'PUT' }),
      invalidatesTags: ['Coupons'],
    }),
    useCoupon: builder.mutation({
      query: ({ schoolId, couponId, ...body }) => ({ url: `/fees/${schoolId}/coupons/${couponId}/use`, method: 'POST', body }),
      invalidatesTags: ['Coupons', 'Fees'],
    }),
    // Payments
    createRazorpayOrder: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/payment/${schoolId}/create-order`, method: 'POST', body }),
    }),
  }),
});

export const {
  useGetFeesQuery, useCreateSchoolFeeMutation, useGetPendingFeesQuery,
  useGetStudentFeeQuery, useAddFeeToStudentMutation, usePayFeeMutation,
  useApplyDiscountMutation, useGenerateFeeReminderMutation,
  useGetCustomFeesQuery, useCreateCustomFeeMutation, useApplyCustomFeeMutation,
  useDeleteCustomFeeMutation, useGetCouponsQuery, useCreateCouponMutation,
  useValidateCouponMutation, useDeleteCouponMutation, useBlockCouponMutation,
  useUseCouponMutation, useCreateRazorpayOrderMutation,
} = billingApi;

export const useSendAIReminderMutation = useGenerateFeeReminderMutation;
export const useRecordPaymentMutation = usePayFeeMutation;
