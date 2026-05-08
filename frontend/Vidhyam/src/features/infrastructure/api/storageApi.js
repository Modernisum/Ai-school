import { baseApi } from '../../../app/api/baseApi';

export const storageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadFile: builder.mutation({
      query: ({ body }) => ({ url: '/storage/upload', method: 'POST', body }),
      invalidatesTags: ['Storage'],
    }),
    listFiles: builder.query({
      query: ({ schoolId, ...params }) => ({ url: '/storage/files', params: { school_id: schoolId, ...params } }),
      providesTags: ['Storage'],
    }),
    deleteFile: builder.mutation({
      query: (fileId) => ({ url: `/storage/files/${fileId}`, method: 'DELETE' }),
      invalidatesTags: ['Storage'],
    }),
    deleteFileByUrl: builder.mutation({
      query: ({ fileUrl, schoolId }) => ({ url: '/storage/file-by-url', method: 'DELETE', body: { file_url: fileUrl, school_id: schoolId } }),
      invalidatesTags: ['Storage'],
    }),
    // Document upload
    uploadDocument: builder.mutation({
      query: ({ schoolId, studentId, ...body }) => ({
        url: `/document_upload/${schoolId}${studentId ? `/student/${studentId}` : ''}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Documents'],
    }),
    // Document box
    getDocuments: builder.query({
      query: (schoolId) => `/documentbox/${schoolId}`,
      providesTags: ['Documents'],
    }),
    // Reminders
    getReminders: builder.query({
      query: (schoolId) => `/reminder/${schoolId}`,
      providesTags: ['Reminders'],
    }),
  }),
});

export const {
  useUploadFileMutation, useListFilesQuery, useDeleteFileMutation,
  useDeleteFileByUrlMutation, useUploadDocumentMutation, useGetDocumentsQuery,
  useGetRemindersQuery,
} = storageApi;
