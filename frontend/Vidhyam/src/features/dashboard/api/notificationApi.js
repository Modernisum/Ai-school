import { baseApi } from '../../../app/api/baseApi';

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Announcements
    getAnnouncements: builder.query({
      query: ({ schoolId, type, userId }) => `/announcements/${schoolId}/${type}/${userId}`,
      providesTags: ['Announcements'],
    }),
    createAnnouncement: builder.mutation({
      query: ({ schoolId, type, userId, ...body }) => ({
        url: `/announcements/${schoolId}/${type}/${userId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Announcements'],
    }),
    // Complaints
    getComplaints: builder.query({
      query: ({ schoolId, ...params }) => ({ url: `/complains/${schoolId}`, params }),
      providesTags: ['Complaints'],
    }),
    createComplaint: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/complains/${schoolId}`, method: 'POST', body }),
      invalidatesTags: ['Complaints'],
    }),
    getComplaintByStudent: builder.query({
      query: ({ schoolId, studentId }) => `/complains/${schoolId}/student/${studentId}`,
      providesTags: ['Complaints'],
    }),
    // Events
    getEvents: builder.query({
      query: (schoolId) => `/events/${schoolId}`,
      providesTags: ['Events'],
    }),
    createEvent: builder.mutation({
      query: ({ schoolId, ...body }) => ({ url: `/events/${schoolId}`, method: 'POST', body }),
      invalidatesTags: ['Events'],
    }),
    // Awards
    getAwards: builder.query({
      query: (schoolId) => `/award/${schoolId}`,
      providesTags: ['Awards'],
    }),
  }),
});

export const {
  useGetAnnouncementsQuery, useCreateAnnouncementMutation,
  useGetComplaintsQuery, useCreateComplaintMutation, useGetComplaintByStudentQuery,
  useGetEventsQuery, useCreateEventMutation, useGetAwardsQuery,
} = notificationApi;
