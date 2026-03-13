import { baseApi } from '../../../app/api/baseApi';

export const geoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCountries: builder.query({
      query: () => '/geo/countries',
      providesTags: ['Geo'],
    }),
    getStates: builder.query({
      query: (countryId) => `/geo/states/${countryId}`,
      providesTags: (result, error, countryId) => [{ type: 'Geo', id: `states-${countryId}` }],
    }),
    getDistricts: builder.query({
      query: (stateId) => `/geo/districts/${stateId}`,
      providesTags: (result, error, stateId) => [{ type: 'Geo', id: `districts-${stateId}` }],
    }),
  }),
});

export const {
  useGetCountriesQuery,
  useLazyGetStatesQuery,
  useLazyGetDistrictsQuery,
} = geoApi;
