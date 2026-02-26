import { configureStore } from '@reduxjs/toolkit';
import { studentApi } from '../features/students/api/studentApi';
import { employeeApi } from '../features/employees/api/employeeApi';
import { academicApi } from '../features/academics/api/academicApi';

// The central Redux store configuration
export const store = configureStore({
    reducer: {
        [studentApi.reducerPath]: studentApi.reducer,
        [employeeApi.reducerPath]: employeeApi.reducer,
        [academicApi.reducerPath]: academicApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false, // Disabled for performance with large dates/objects
        }).concat(studentApi.middleware, employeeApi.middleware, academicApi.middleware)
});
