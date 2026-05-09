import { baseApi } from '../../app/api/baseApi';

export const storageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadFile: builder.mutation({
      query: (formData) => ({
        url: '/auth/storage/upload',
        method: 'POST',
        body: formData,
        // FormData should NOT have Content-Type header manually set 
        // fetchBaseQuery handles it correctly when body is FormData
      }),
      invalidatesTags: ['Storage'],
    }),
    listFiles: builder.query({
      query: (params) => ({
        url: '/auth/storage/files',
        method: 'GET',
        params,
      }),
      providesTags: ['Storage'],
    }),
    deleteFileByUrl: builder.mutation({
      query: (url) => ({
        url: '/auth/storage/file-by-url',
        method: 'DELETE',
        params: { url },
      }),
      invalidatesTags: ['Storage'],
    }),
    deleteFileById: builder.mutation({
      query: (id) => ({
        url: `/auth/storage/files/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Storage'],
    }),
  }),
});

export const {
  useUploadFileMutation,
  useListFilesQuery,
  useDeleteFileByUrlMutation,
  useDeleteFileByIdMutation,
} = storageApi;
