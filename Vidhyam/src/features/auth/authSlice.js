import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: localStorage.getItem('accessToken') || null,
    schoolId: localStorage.getItem('schoolId') || null,
    schoolProfile: {
      name: localStorage.getItem('schoolName') || null,
      address: localStorage.getItem('schoolAddress') || null,
      board: localStorage.getItem('boardName') || null,
      medium: localStorage.getItem('medium') || null,
      maxClassLevel: localStorage.getItem('maxClassLevel') || null,
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
      if (schoolProfile?.address) localStorage.setItem('schoolAddress', schoolProfile.address);
      if (schoolProfile?.board) localStorage.setItem('boardName', schoolProfile.board);
      if (schoolProfile?.medium) localStorage.setItem('medium', schoolProfile.medium);
      if (schoolProfile?.maxClassLevel) localStorage.setItem('maxClassLevel', schoolProfile.maxClassLevel);
    },
    updateProfile: (state, action) => {
      state.schoolProfile = { ...state.schoolProfile, ...action.payload };
      
      // Update local storage selectively
      if (action.payload.name) localStorage.setItem('schoolName', action.payload.name);
      if (action.payload.address) localStorage.setItem('schoolAddress', action.payload.address);
      if (action.payload.board) localStorage.setItem('boardName', action.payload.board);
      if (action.payload.medium) localStorage.setItem('medium', action.payload.medium);
      if (action.payload.maxClassLevel) localStorage.setItem('maxClassLevel', action.payload.maxClassLevel);
    },
    logout: (state) => {
      state.token = null;
      state.schoolId = null;
      state.schoolProfile = {
        name: null,
        address: null,
        board: null,
        medium: null,
        maxClassLevel: null,
      };
      
      localStorage.clear();
    },
  },
});

export const { setCredentials, updateProfile, logout } = authSlice.actions;

export default authSlice.reducer;

export const selectCurrentToken = (state) => state.auth.token;
export const selectSchoolId = (state) => state.auth.schoolId;
export const selectSchoolProfile = (state) => state.auth.schoolProfile;
