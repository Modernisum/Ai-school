import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi';
import { studentApi } from '../features/students/api/studentApi';
import { employeeApi } from '../features/employees/api/employeeApi';
import { academicApi } from '../features/academics/api/academicApi';
import authReducer from '../features/auth/authSlice';
import settingsReducer from '../features/settings/settingsSlice';
import './api/index'; // registers all injectEndpoints APIs with baseApi

export const store = configureStore({
  reducer: {
    auth: authReducer,
    settings: settingsReducer,
    [baseApi.reducerPath]: baseApi.reducer,
    [studentApi.reducerPath]: studentApi.reducer,
    [employeeApi.reducerPath]: employeeApi.reducer,
    [academicApi.reducerPath]: academicApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(
      baseApi.middleware,
      studentApi.middleware,
      employeeApi.middleware,
      academicApi.middleware,
    ),
});
