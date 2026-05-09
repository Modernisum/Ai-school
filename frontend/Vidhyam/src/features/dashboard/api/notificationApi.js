import { baseApi } from '../../../app/api/baseApi';

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Notifications (Centralized)
    getNotifications: builder.query({
      query: ({ schoolId, userId, category, unreadOnly, limit = 50, offset = 0 }) => ({
        url: `/school/${schoolId}/notifications`,
        params: {
          user_id: userId,
          ...(category && { category }),
          ...(unreadOnly && { unread_only: true }),
          limit,
          offset,
        },
      }),
      providesTags: ['Notifications'],
    }),
    getUnreadCount: builder.query({
      query: (schoolId) => ({
        url: `/school/${schoolId}/notifications/unread-count`,
      }),
      providesTags: ['Notifications'],
    }),
    markRead: builder.mutation({
      query: ({ schoolId, notificationId }) => ({
        url: `/school/${schoolId}/notifications/${notificationId}/read`,
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),
    markAllRead: builder.mutation({
      query: (schoolId) => ({
        url: `/school/${schoolId}/notifications/mark-all-read`,
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),
    deleteNotification: builder.mutation({
      query: ({ schoolId, notificationId }) => ({
        url: `/school/${schoolId}/notifications/${notificationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notifications'],
    }),
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
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  useDeleteNotificationMutation,
  useGetAnnouncementsQuery, useCreateAnnouncementMutation,
  useGetComplaintsQuery, useCreateComplaintMutation, useGetComplaintByStudentQuery,
  useGetEventsQuery, useCreateEventMutation, useGetAwardsQuery,
} = notificationApi;
