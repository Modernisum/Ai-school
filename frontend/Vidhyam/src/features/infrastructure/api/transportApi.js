import { baseApi } from '../../../app/api/baseApi';

export const transportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GPS tracking
    publishGps: builder.mutation({
      query: ({ schoolId, vehicleId, lat, lng, speed }) => ({
        url: `/transport/${schoolId}/gps/${vehicleId}`,
        method: 'POST',
        body: { lat, lng, speed },
      }),
    }),
    // Transport routes from school API
    getTimetableTransport: builder.query({
      query: (schoolId) => `/school/${schoolId}/timetable/`,
      providesTags: ['Transport'],
    }),
  }),
});

export const {
  usePublishGpsMutation, useGetTimetableTransportQuery,
} = transportApi;
