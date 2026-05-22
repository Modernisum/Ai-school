import { baseApi } from '../../../app/api/baseApi';

export const timetableApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    generateTimetable: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/school/${schoolId}/academic/timetable/generate`, method: 'POST', body }),
      invalidatesTags: ['Timetable'],
    }),
    listTimetables: builder.query({
      query: (schoolId) => `/school/${schoolId}/academic/timetable/`,
      providesTags: ['Timetable'],
    }),
    getTimetable: builder.query({
      query: ({ schoolId, configId }) => `/school/${schoolId}/academic/timetable/${configId}`,
      providesTags: ['Timetable'],
    }),
    approveTimetable: builder.mutation({
      query: ({ schoolId, configId }) => ({ url: `/school/${schoolId}/academic/timetable/${configId}/approve`, method: 'POST' }),
      invalidatesTags: ['Timetable'],
    }),
    deleteTimetable: builder.mutation({
      query: ({ schoolId, configId }) => ({ url: `/school/${schoolId}/academic/timetable/${configId}`, method: 'DELETE' }),
      invalidatesTags: ['Timetable'],
    }),
  }),
});

export const {
  useGenerateTimetableMutation, useListTimetablesQuery, useGetTimetableQuery,
  useApproveTimetableMutation, useDeleteTimetableMutation,
} = timetableApi;
