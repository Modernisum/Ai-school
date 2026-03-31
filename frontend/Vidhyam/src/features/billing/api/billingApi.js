import { baseApi } from '../../../app/api/baseApi';

export const billingApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getFees: builder.query({
            query: (schoolId) => `/fees/${schoolId}`,
            transformResponse: (response) => {
                const data = response.data || response || [];
                return data.map((f, i) => ({
                    id: f.fee_id || f.id || i,
                    name: f.student_name || f.studentName || 'Unknown',
                    studentId: f.student_id || f.studentId || `S-${i}`,
                    class: f.class_id || f.classId || 'N/A',
                    amount: Number(f.total_amount || f.amount || 0),
                    paid: Number(f.amount_paid || f.paid || 0),
                    pending: Number(f.total_amount || f.amount || 0) - Number(f.amount_paid || f.paid || 0),
                    status: (f.amount_paid || f.paid) >= (f.total_amount || f.amount) ? 'Paid' : (f.amount_paid || f.paid) > 0 ? 'Partial' : 'Pending',
                    date: f.created_at || f.createdAt,
                }));
            },
            providesTags: ['Fees'],
        }),
        getCustomFees: builder.query({
            query: (schoolId) => `/fees/${schoolId}/custom`,
            providesTags: ['CustomFees'],
        }),
        createCustomFee: builder.mutation({
            query: ({ schoolId, feeData }) => ({
                url: `/fees/${schoolId}/custom`,
                method: 'POST',
                body: feeData,
            }),
            invalidatesTags: ['CustomFees', 'Fees'],
        }),
        applyCustomFee: builder.mutation({
            query: ({ schoolId, feeId }) => ({
                url: `/fees/${schoolId}/custom/${feeId}/apply`,
                method: 'POST',
            }),
            invalidatesTags: ['Fees'],
        }),
        deleteCustomFee: builder.mutation({
            query: ({ schoolId, feeId }) => ({
                url: `/fees/${schoolId}/custom/${feeId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['CustomFees'],
        }),
        recordPayment: builder.mutation({
            query: ({ schoolId, paymentData }) => ({
                url: `/fees/${schoolId}/payment`,
                method: 'POST',
                body: paymentData,
            }),
            invalidatesTags: ['Fees'],
        }),
        createRazorpayOrder: builder.mutation({
            query: ({ schoolId, amount, studentId }) => ({
                url: `/payment/${schoolId}/create-order`,
                method: 'POST',
                body: { amount, studentId },
            }),
        }),
        sendAIReminder: builder.mutation({
            query: ({ schoolId, studentId }) => ({
                url: `/fees/${schoolId}/student/${studentId}/ai-reminder`,
                method: 'POST', // Backend should handle this as POST/GET as needed
            }),
        }),
    }),
});

export const {
    useGetFeesQuery,
    useGetCustomFeesQuery,
    useCreateCustomFeeMutation,
    useApplyCustomFeeMutation,
    useDeleteCustomFeeMutation,
    useRecordPaymentMutation,
    useCreateRazorpayOrderMutation,
    useSendAIReminderMutation,
} = billingApi;
