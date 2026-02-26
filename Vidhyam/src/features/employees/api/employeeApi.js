import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";

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
            query: (schoolId) => `/employees/${schoolId}/employees`,
            providesTags: ['Employee'],
        }),
        addEmployee: builder.mutation({
            query: ({ schoolId, employeeData }) => ({
                url: `/employees/${schoolId}/employees`,
                method: 'POST',
                body: employeeData,
            }),
            invalidatesTags: ['Employee'],
        }),
        deleteEmployee: builder.mutation({
            query: ({ schoolId, employeeId }) => ({
                url: `/employees/${schoolId}/employees/${employeeId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Employee'],
        })
    }),
});

export const {
    useGetEmployeesQuery,
    useAddEmployeeMutation,
    useDeleteEmployeeMutation,
} = employeeApi;
