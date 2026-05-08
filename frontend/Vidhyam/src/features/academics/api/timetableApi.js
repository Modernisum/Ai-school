import { baseApi } from '../../../app/api/baseApi';

export const timetableApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    generateTimetable: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/school/${schoolId}/timetable/generate`, method: 'POST', body }),
      invalidatesTags: ['Timetable'],
    }),
    listTimetables: builder.query({
      query: (schoolId) => `/school/${schoolId}/timetable/`,
      providesTags: ['Timetable'],
    }),
    getTimetable: builder.query({
      query: ({ schoolId, configId }) => `/school/${schoolId}/timetable/${configId}`,
      providesTags: ['Timetable'],
    }),
    approveTimetable: builder.mutation({
      query: ({ schoolId, configId }) => ({ url: `/school/${schoolId}/timetable/${configId}/approve`, method: 'POST' }),
      invalidatesTags: ['Timetable'],
    }),
    deleteTimetable: builder.mutation({
      query: ({ schoolId, configId }) => ({ url: `/school/${schoolId}/timetable/${configId}`, method: 'DELETE' }),
      invalidatesTags: ['Timetable'],
    }),
  }),
});

export const {
  useGenerateTimetableMutation, useListTimetablesQuery, useGetTimetableQuery,
  useApproveTimetableMutation, useDeleteTimetableMutation,
} = timetableApi;
