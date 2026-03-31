import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const employeeApi = createApi({
    reducerPath: 'employeeApi',
    baseQuery: fetchBaseQuery({
        baseUrl: API_BASE_URL,
        prepareHeaders: (headers) => {
            const token = localStorage.getItem('accessToken');
            if (token) headers.set('authorization', `Bearer ${token}`);
            return headers;
        },
    }),
    tagTypes: ['Employee'],
    endpoints: (builder) => ({
        getEmployees: builder.query({
            query: (schoolId) => `/employees/${schoolId}`,
            providesTags: ['Employee'],
        }),
        addEmployee: builder.mutation({
            query: ({ schoolId, employeeData }) => ({
                url: `/employees/${schoolId}`,
                method: 'POST',
                body: employeeData,
            }),
            invalidatesTags: ['Employee'],
        }),
        deleteEmployee: builder.mutation({
            query: ({ schoolId, employeeId }) => ({
                url: `/employees/${schoolId}/${employeeId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Employee'],
        }),
        getSalaryBreakdown: builder.query({
            query: ({ schoolId, employeeId }) => `/employees/${schoolId}/${employeeId}/salary-breakdown`,
            providesTags: (result, error, arg) => [{ type: 'Employee', id: arg.employeeId }],
        }),
        setBaseSalary: builder.mutation({
            query: ({ schoolId, employeeId, salaryData }) => ({
                url: `/employees/${schoolId}/${employeeId}/salary`,
                method: 'POST',
                body: salaryData,
            }),
            invalidatesTags: (result, error, arg) => [{ type: 'Employee', id: arg.employeeId }],
        }),
        addBonus: builder.mutation({
            query: ({ schoolId, employeeId, amount }) => ({
                url: `/employees/${schoolId}/${employeeId}/bonus`,
                method: 'POST',
                body: { amount },
            }),
            invalidatesTags: (result, error, arg) => [{ type: 'Employee', id: arg.employeeId }],
        }),
        addAid: builder.mutation({
            query: ({ schoolId, employeeId, amount }) => ({
                url: `/employees/${schoolId}/${employeeId}/aid`,
                method: 'POST',
                body: { amount },
            }),
            invalidatesTags: (result, error, arg) => [{ type: 'Employee', id: arg.employeeId }],
        }),
        closeMonth: builder.mutation({
            query: ({ schoolId, employeeId }) => ({
                url: `/employees/${schoolId}/${employeeId}/close-month`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, arg) => [{ type: 'Employee', id: arg.employeeId }],
        }),
        bulkImportEmployees: builder.mutation({
            query: ({ schoolId, payload }) => ({
                url: `/employees/${schoolId}/bulk`,
                method: 'POST',
                body: payload,
            }),
            invalidatesTags: ['Employee'],
        }),
    }),
});

export const {
    useGetEmployeesQuery,
    useAddEmployeeMutation,
    useDeleteEmployeeMutation,
    useGetSalaryBreakdownQuery,
    useSetBaseSalaryMutation,
    useAddBonusMutation,
    useAddAidMutation,
    useCloseMonthMutation,
    useBulkImportEmployeesMutation,
} = employeeApi;
