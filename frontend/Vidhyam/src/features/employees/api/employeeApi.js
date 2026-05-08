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
  tagTypes: ['Employee', 'EmployeeSalary'],
  endpoints: (builder) => ({
    // CRUD
    getEmployees: builder.query({
      query: (schoolId) => `/employees/${schoolId}`,
      providesTags: ['Employee'],
    }),
    getEmployeeById: builder.query({
      query: ({ schoolId, employeeId }) => `/employees/${schoolId}/${employeeId}`,
      providesTags: (r, e, a) => [{ type: 'Employee', id: a.employeeId }],
    }),
    addEmployee: builder.mutation({
      query: ({ schoolId, employeeData }) => ({ url: `/employees/${schoolId}`, method: 'POST', body: employeeData }),
      invalidatesTags: ['Employee'],
    }),
    validateEmployee: builder.mutation({
      query: ({ schoolId, ...data }) => ({ url: `/employees/${schoolId}/validate`, method: 'POST', body: data }),
    }),
    updateEmployee: builder.mutation({
      query: ({ schoolId, employeeId, employeeData }) => ({ url: `/employees/${schoolId}/${employeeId}`, method: 'PUT', body: employeeData }),
      invalidatesTags: (r, e, a) => [{ type: 'Employee', id: a.employeeId }, 'Employee'],
    }),
    deleteEmployee: builder.mutation({
      query: ({ schoolId, employeeId }) => ({ url: `/employees/${schoolId}/${employeeId}`, method: 'DELETE' }),
      invalidatesTags: ['Employee'],
    }),
    bulkImportEmployees: builder.mutation({
      query: ({ schoolId, payload }) => ({ url: `/employees/${schoolId}/bulk`, method: 'POST', body: payload }),
      invalidatesTags: ['Employee'],
    }),
    // Salary & Payroll
    getSalaryBreakdown: builder.query({
      query: ({ schoolId, employeeId }) => `/employees/${schoolId}/${employeeId}/salary-breakdown`,
      providesTags: (r, e, a) => [{ type: 'EmployeeSalary', id: a.employeeId }],
    }),
    setBaseSalary: builder.mutation({
      query: ({ schoolId, employeeId, salaryData }) => ({
        url: `/employees/${schoolId}/${employeeId}/salary`,
        method: 'POST',
        body: salaryData,
      }),
      invalidatesTags: (r, e, a) => [{ type: 'EmployeeSalary', id: a.employeeId }],
    }),
    addBonus: builder.mutation({
      query: ({ schoolId, employeeId, amount }) => ({
        url: `/employees/${schoolId}/${employeeId}/bonus`,
        method: 'POST',
        body: { amount },
      }),
      invalidatesTags: (r, e, a) => [{ type: 'EmployeeSalary', id: a.employeeId }],
    }),
    addAid: builder.mutation({
      query: ({ schoolId, employeeId, amount }) => ({
        url: `/employees/${schoolId}/${employeeId}/aid`,
        method: 'POST',
        body: { amount },
      }),
      invalidatesTags: (r, e, a) => [{ type: 'EmployeeSalary', id: a.employeeId }],
    }),
    closeMonth: builder.mutation({
      query: ({ schoolId, employeeId }) => ({
        url: `/employees/${schoolId}/${employeeId}/close-month`,
        method: 'POST',
      }),
      invalidatesTags: (r, e, a) => [{ type: 'EmployeeSalary', id: a.employeeId }],
    }),
    // Attendance
    getEmployeeAttendance: builder.query({
      query: ({ schoolId, userId }) => `/operations/attendance/${schoolId}/employee/${userId}`,
      providesTags: (r, e, a) => [{ type: 'Employee', id: a.userId }],
    }),
    markEmployeePresent: builder.mutation({
      query: ({ schoolId, userId, ...body }) => ({
        url: `/operations/attendance/${schoolId}/employee/${userId}/present`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Employee'],
    }),
    // Leave
    getEmployeeLeaves: builder.query({
      query: ({ schoolId, employeeId }) => `/leave/${schoolId}?employee_id=${employeeId}`,
      providesTags: (r, e, a) => [{ type: 'Employee', id: a.employeeId }],
    }),
  }),
});

export const {
  useGetEmployeesQuery, useGetEmployeeByIdQuery, useAddEmployeeMutation,
  useValidateEmployeeMutation, useUpdateEmployeeMutation, useDeleteEmployeeMutation,
  useBulkImportEmployeesMutation, useGetSalaryBreakdownQuery, useSetBaseSalaryMutation,
  useAddBonusMutation, useAddAidMutation, useCloseMonthMutation,
  useGetEmployeeAttendanceQuery, useMarkEmployeePresentMutation, useGetEmployeeLeavesQuery,
} = employeeApi;
