import { baseApi } from '../../../app/api/baseApi';

export const ocrApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    extractOcr: builder.mutation({
      query: ({ schoolId, ...body }) => ({
        url: `/ocr/${schoolId}/extract`,
        method: 'POST',
        body,
      }),
    }),
    extractOcrBatch: builder.mutation({
      query: ({ schoolId, ...body }) => ({
        url: `/ocr/${schoolId}/extract-batch`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useExtractOcrMutation,
  useExtractOcrBatchMutation,
} = ocrApi;
