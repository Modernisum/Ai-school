import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: localStorage.getItem('accessToken') || null,
    schoolId: localStorage.getItem('schoolId') || null,
    schoolProfile: {
      name: localStorage.getItem('schoolName') || null,
    },
  },
  reducers: {
    setCredentials: (state, action) => {
      const { accessToken, schoolId, schoolProfile } = action.payload;
      state.token = accessToken;
      state.schoolId = schoolId;
      if (schoolProfile) {
        state.schoolProfile = { ...state.schoolProfile, ...schoolProfile };
      }

      // Persist critical session data
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('schoolId', schoolId);
      if (schoolProfile?.name) localStorage.setItem('schoolName', schoolProfile.name);
    },
    updateProfile: (state, action) => {
      state.schoolProfile = { ...state.schoolProfile, ...action.payload };
      if (action.payload.name) localStorage.setItem('schoolName', action.payload.name);
    },
    logout: (state) => {
      state.token = null;
      state.schoolId = null;
      state.schoolProfile = { name: null };
      localStorage.clear();
    },
  },
});

export const { setCredentials, updateProfile, logout } = authSlice.actions;

export default authSlice.reducer;

export const selectCurrentToken  = (state) => state.auth.token;
export const selectSchoolId      = (state) => state.auth.schoolId;
export const selectSchoolProfile = (state) => state.auth.schoolProfile;
export const selectCurrentUser   = (state) => state.auth.schoolProfile;
